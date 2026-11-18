import { OAuth2Client, TokenPayload } from "google-auth-library";
import { HUser } from "../../DB/models";
import { EmailSubjectEnum, ProviderEnum } from "../../common/enum";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  TooManyRequestsException,
  UnauthorizedException,
} from "../../common/exception";
import { UserRepository } from "../../common/repository";
import { compare, encryption, hash } from "../../common/security";
import {
  cacheService,
  CacheService,
  tokenService,
  TokenService,
} from "../../common/service";
import {
  createOtp,
  emailEvent,
  userEmailAttemptsKey,
  userEmailKey,
} from "../../common/utils";
import {
  LOGIN_BLOCK_TIME,
  LOGIN_MAX_ATTEMPTS,
  WEB_CLIENT_IDS,
} from "../../config";
import { IUser } from "./../../common/interface";
import {
  ConfirmEmailDto,
  Enable2StepVerificationDto,
  LoginDto,
  loginWith2FADto,
  ResendEmailConfirmationDto,
  resetForgottenPasswordDto,
  Send2StepVerificationCodeDto,
  SendForgottenPasswordCodeDto,
  SignupDto,
  verifyForgottenPasswordCodeDto,
} from "./dto/authentication.dto";
import {
  ILoginResponse,
  ISignupWithGmailResponse,
} from "./entities/authentication.entities";

const userLoginAttemptsKey = ({ email }: { email: string }) => {
  return `User::${email}::LOGIN_ATTEMPT`;
};

export class AuthenticationService {
  private userRepository: UserRepository;
  private cacheService: CacheService;
  private tokenService: TokenService;
  private client: OAuth2Client;
  constructor() {
    this.userRepository = new UserRepository();
    this.cacheService = cacheService;
    this.tokenService = tokenService;
    this.client = new OAuth2Client();
  }

  async verifyGoogleAccount(idToken: string): Promise<TokenPayload> {
    const ticket = await this.client.verifyIdToken({
      idToken,
      audience: WEB_CLIENT_IDS,
    });
    const payload = ticket.getPayload();
    if (!payload?.email_verified)
      throw new BadRequestException("Google email not verified");
    return payload;
  }

  async signupWithGmail(
    { idToken }: { idToken: string },
    issuer: string,
  ): Promise<ISignupWithGmailResponse> {
    const { name, email, picture } = await this.verifyGoogleAccount(idToken);

    const existingAccount = await this.userRepository.findOne({
      filter: { email: email as string },
      options: {},
    });

    if (existingAccount) {
      if (existingAccount.provider != ProviderEnum.GOOGLE) {
        throw new ConflictException("Invalid account provider");
      }
      return {
        status: 200,
        data: await this.tokenService.createLoginCredentials({
          user: existingAccount,
          issuer,
        }),
      };
    }

    const user = await this.userRepository.create({
      data: {
        username: name,
        email,
        confirmEmail: new Date(),
        image: picture,
        provider: ProviderEnum.GOOGLE,
      },
    });

    return {
      status: 201,
      data: await this.tokenService.createLoginCredentials({ user, issuer }),
    };
  }

  async sendEmailOtp({
    email,
    subject,
    expiresIn = 120,
    maxAttempts = 3,
    blockInSeconds = 300,
  }: {
    email: string;
    subject: EmailSubjectEnum;
    expiresIn?: number;
    maxAttempts?: number;
    blockInSeconds?: number;
  }): Promise<void> {
    const existingOtpTTL = await this.cacheService.cacheTTL({
      key: userEmailKey({ email, subject }),
    });

    if (existingOtpTTL > 0) {
      throw new ConflictException(
        `Cannot send new OTP as there is still a valid one for ${existingOtpTTL}s`,
      );
    }

    const oldAttempts =
      (await this.cacheService.cacheGet({
        key: userEmailAttemptsKey({ email, subject }),
      })) ?? 0;

    if (oldAttempts >= maxAttempts) {
      throw new TooManyRequestsException(
        "You have reached maximum OTP attempts please try again later.",
      );
    }
    const code = createOtp();
    await this.cacheService.cacheSet({
      key: userEmailKey({ email, subject }),
      value: await hash(code),
      ttl: expiresIn,
    });

    const currentAttempts = await this.cacheService.cacheIncrementBy({
      key: userEmailAttemptsKey({ email, subject }),
    });

    if (currentAttempts == maxAttempts) {
      await this.cacheService.cacheExpire({
        key: userEmailAttemptsKey({ email, subject }),
        ttl: blockInSeconds,
      });
    }

    emailEvent.emit("sendEmail", {
      recipients: { to: email },
      subject,
      data: { code },
    });

    return;
  }

  async signup({
    username,
    email,
    password,
    phone,
    DOB,
    gender,
  }: SignupDto["body"]): Promise<IUser> {
    const duplicatedUser = await this.userRepository.findOne({
      filter: { email },
      projection: { email: 1 },
    });

    if (duplicatedUser)
      throw new ConflictException("User with this email already exists.");

    const account = await this.userRepository.create({
      data: {
        username,
        email,
        password,
        phone,
        DOB,
        gender,
      },
    });

    await this.sendEmailOtp({ email, subject: EmailSubjectEnum.CONFIRM_EMAIL });

    return account;
  }

  async confirmEmail({ otp, email }: ConfirmEmailDto): Promise<void> {
    const existingAccount = await this.userRepository.findOne({
      filter: {
        email,
        provider: ProviderEnum.SYSTEM,
        confirmEmail: { $exists: false },
      },
      options: { lean: false },
    });

    if (!existingAccount) {
      throw new NotFoundException("Invalid Account.");
    }

    const hashOtp = await this.cacheService.cacheGet({
      key: userEmailKey({ email, subject: EmailSubjectEnum.CONFIRM_EMAIL }),
    });

    if (!hashOtp || !(await compare(otp, hashOtp))) {
      throw new BadRequestException("Invalid or expired verification code.");
    }

    existingAccount.confirmEmail = new Date();
    await existingAccount.save();
    await this.cacheService.cacheDelete({
      key: await this.cacheService.cacheKeys({
        prefix: userEmailKey({
          email,
          subject: EmailSubjectEnum.CONFIRM_EMAIL,
        }),
      }),
    });

    return;
  }

  async resendEmailConfirmation({
    email,
  }: ResendEmailConfirmationDto): Promise<void> {
    const existingAccount = await this.userRepository.findOne({
      filter: {
        email,
        provider: ProviderEnum.SYSTEM,
        confirmEmail: { $exists: false },
      },
    });

    if (!existingAccount) {
      throw new NotFoundException("Invalid Account.");
    }

    await this.sendEmailOtp({ email, subject: EmailSubjectEnum.CONFIRM_EMAIL });

    return;
  }

  async manageLogin(
    { email, password }: LoginDto,
    issuer: string,
  ): Promise<ILoginResponse | void> {
    const user = await this.userRepository.findOne({
      filter: {
        email,
        provider: ProviderEnum.SYSTEM,
      },
      options: {},
    });

    const oldAttempts =
      (await this.cacheService.cacheGet({
        key: userLoginAttemptsKey({ email }),
      })) ?? 0;

    if (oldAttempts >= LOGIN_MAX_ATTEMPTS) {
      throw new TooManyRequestsException(
        "You have reached maximum Login attempts please try again later.",
      );
    }

    if (user && !user?.confirmEmail)
      throw new UnauthorizedException(
        "Please confirm your email before logging in.",
      );

    if (!user) throw new UnauthorizedException("Invalid login credentials.");

    const approval = await compare(password, user.password);

    if (!approval) {
      const currentAttempts = await this.cacheService.cacheIncrementBy({
        key: userLoginAttemptsKey({ email }),
      });
      if (currentAttempts == LOGIN_MAX_ATTEMPTS) {
        await this.cacheService.cacheExpire({
          key: userLoginAttemptsKey({ email }),
          ttl: LOGIN_BLOCK_TIME,
        });
      }
      throw new UnauthorizedException("Invalid login credentials.");
    }

    await this.cacheService.cacheDelete({
      key: userLoginAttemptsKey({ email }),
    });

    if (user?.twoStepVerification) {
      await this.sendEmailOtp({
        email,
        subject: EmailSubjectEnum.LOGIN_TWO_FACTOR,
      });
      return;
    }

    return await this.tokenService.createLoginCredentials({ user, issuer });
  }

  async loginWith2FA({ otp, email }: loginWith2FADto, issuer: string) {
    const user = await this.userRepository.findOne({
      filter: {
        email,
        provider: ProviderEnum.SYSTEM,
        confirmEmail: { $exists: true },
      },
      options: {},
    });

    if (!user) {
      throw new NotFoundException("Invalid Account.");
    }

    const hashOtp = await this.cacheService.cacheGet({
      key: userEmailKey({ email, subject: EmailSubjectEnum.LOGIN_TWO_FACTOR }),
    });

    if (!hashOtp || !(await compare(otp, hashOtp))) {
      throw new BadRequestException("Invalid or expired verification code.");
    }

    await this.cacheService.cacheDelete({
      key: await this.cacheService.cacheKeys({
        prefix: userEmailKey({
          email,
          subject: EmailSubjectEnum.LOGIN_TWO_FACTOR,
        }),
      }),
    });

    return await this.tokenService.createLoginCredentials({ user, issuer });
  }

  async send2StepVerificationCode({ email }: Send2StepVerificationCodeDto) {
    const existingAccount = await this.userRepository.findOne({
      filter: {
        email,
        provider: ProviderEnum.SYSTEM,
        confirmEmail: { $exists: true },
      },
    });

    if (!existingAccount) {
      throw new NotFoundException("Invalid Account.");
    }

    await this.sendEmailOtp({
      email,
      subject: EmailSubjectEnum.ENABLE_TWO_FACTOR,
    });

    return;
  }

  async enable2StepVerification({ otp, email }: Enable2StepVerificationDto) {
    const existingAccount = await this.userRepository.findOne({
      filter: {
        email,
        provider: ProviderEnum.SYSTEM,
        confirmEmail: { $exists: true },
      },
      options: {},
    });

    if (!existingAccount) {
      throw new NotFoundException("Invalid Account.");
    }

    const hashOtp = await this.cacheService.cacheGet({
      key: userEmailKey({ email, subject: EmailSubjectEnum.ENABLE_TWO_FACTOR }),
    });

    if (!hashOtp || !(await compare(otp, hashOtp))) {
      throw new BadRequestException("Invalid or expired verification code.");
    }

    existingAccount.twoStepVerification = true;
    await existingAccount.save();

    await this.cacheService.cacheDelete({
      key: await this.cacheService.cacheKeys({
        prefix: userEmailKey({
          email,
          subject: EmailSubjectEnum.ENABLE_TWO_FACTOR,
        }),
      }),
    });

    return;
  }

  async sendForgottenPasswordCode({
    email,
  }: SendForgottenPasswordCodeDto): Promise<void> {
    const existingAccount = await this.userRepository.findOne({
      filter: {
        email,
        provider: ProviderEnum.SYSTEM,
        confirmEmail: { $exists: true },
      },
    });

    if (!existingAccount) {
      throw new NotFoundException("Invalid Account.");
    }

    await this.sendEmailOtp({
      email,
      subject: EmailSubjectEnum.FORGET_PASSWORD,
    });

    return;
  }

  async verifyForgottenPasswordCode({
    otp,
    email,
  }: verifyForgottenPasswordCodeDto): Promise<HUser> {
    const existingAccount = await this.userRepository.findOne({
      filter: {
        email,
        provider: ProviderEnum.SYSTEM,
        confirmEmail: { $exists: true },
      },
      options: {},
    });

    if (!existingAccount) {
      throw new NotFoundException("Invalid Account.");
    }

    const hashOtp = await this.cacheService.cacheGet({
      key: userEmailKey({ email, subject: EmailSubjectEnum.FORGET_PASSWORD }),
    });

    if (!hashOtp || !(await compare(otp, hashOtp))) {
      throw new BadRequestException("Invalid or expired verification code.");
    }

    return existingAccount;
  }

  resetForgottenPassword = async ({
    otp,
    email,
    password,
  }: resetForgottenPasswordDto): Promise<void> => {
    const account = await this.verifyForgottenPasswordCode({ otp, email });

    account.password = password;
    account.changeCredentialsTime = new Date();
    await account.save();

    const keysResult = await Promise.all([
      this.cacheService.cacheKeys({
        prefix: this.tokenService.userBaseRevokeTokenKey({
          userId: account._id.toString(),
        }),
      }),
      this.cacheService.cacheKeys({
        prefix: userEmailKey({
          email,
          subject: EmailSubjectEnum.FORGET_PASSWORD,
        }),
      }),
    ]);

    await this.cacheService.cacheDelete({
      key: [...keysResult[0], ...keysResult[1]],
    });

    return;
  };
}

export default new AuthenticationService();
