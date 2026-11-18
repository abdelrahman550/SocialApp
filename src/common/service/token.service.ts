import mongoose from "mongoose";
import { UserRepository } from "../repository";
import { cacheService, CacheService } from "./cache.service";
import {
  ACCESS_TOKEN_EXPIRATION,
  ACCESS_TOKEN_SIGNATURE,
  ADMIN_ACCESS_TOKEN_SIGNATURE,
  ADMIN_REFRESH_TOKEN_SIGNATURE,
  REFRESH_TOKEN_EXPIRATION,
  REFRESH_TOKEN_SIGNATURE,
} from "../../config";
import jwt, { JwtPayload, Secret, SignOptions } from "jsonwebtoken";
import { NotFoundException, UnauthorizedException } from "../exception";
import { RoleEnum, TokenTypeEnum } from "../enum";
import { toObjectId } from "../utils";
import { HUser } from "../../DB/models";
import { randomUUID } from "node:crypto";
import { compare } from "../security";

type UserIdType = mongoose.Types.ObjectId | string;
export type JwtPayloadType = JwtPayload & {
  sub: string | mongoose.Types.ObjectId;
  aud: number[];
  jti: string;
  iat: number;
};

export class TokenService {
  private readonly userRepository: UserRepository;
  private readonly cacheService: CacheService;
  constructor() {
    this.userRepository = new UserRepository();
    this.cacheService = cacheService;
  }

  userBaseRevokeTokenKey({ userId }: { userId: UserIdType }): string {
    return `User::${userId.toString()}::Revoke_Token`;
  }

  userRevokeTokenKey({
    userId,
    jti,
  }: {
    userId: UserIdType;
    jti: string;
  }): string {
    return `${this.userBaseRevokeTokenKey({ userId })}::${jti}`;
  }

  async createToken({
    payload,
    options,
    secret = ACCESS_TOKEN_SIGNATURE,
  }: {
    payload: string | Buffer | object;
    options?: SignOptions;
    secret: Secret;
  }): Promise<string> {
    return jwt.sign(payload, secret, options);
  }

  async verifyToken({
    token = "",
    secret = ACCESS_TOKEN_SIGNATURE,
  }: {
    token: string;
    secret?: Secret;
  }): Promise<JwtPayloadType> {
    try {
      return jwt.verify(token, secret) as JwtPayloadType;
    } catch {
      throw new UnauthorizedException("Invalid or expired token.");
    }
  }

  async getTokenSignatures({
    role = RoleEnum.USER,
  }: {
    role: RoleEnum;
  }): Promise<{
    accessSignature: string;
    refreshSignature: string;
  }> {
    let signatures: {
      accessSignature: string;
      refreshSignature: string;
    };

    switch (role) {
      case RoleEnum.ADMIN:
        signatures = {
          accessSignature: ADMIN_ACCESS_TOKEN_SIGNATURE,
          refreshSignature: ADMIN_REFRESH_TOKEN_SIGNATURE,
        };
        break;

      default:
        signatures = {
          accessSignature: ACCESS_TOKEN_SIGNATURE,
          refreshSignature: REFRESH_TOKEN_SIGNATURE,
        };

        break;
    }
    return signatures;
  }

  async getSignature({
    tokenType = TokenTypeEnum.ACCESS,
    role = RoleEnum.USER,
  }: {
    tokenType: TokenTypeEnum;
    role?: RoleEnum;
  }): Promise<string> {
    const signatures = await this.getTokenSignatures({ role });
    return tokenType == TokenTypeEnum.ACCESS
      ? signatures.accessSignature
      : signatures.refreshSignature;
  }

  async decodeToken({
    authorization = "",
    tokenType = TokenTypeEnum.ACCESS,
  }: {
    authorization: string;
    tokenType?: TokenTypeEnum;
  }): Promise<{ user: HUser; payload: JwtPayloadType }> {
    const decoded = jwt.decode(authorization) as JwtPayloadType;

    if (!decoded?.aud?.length) {
      throw new UnauthorizedException("Invalid token payload.");
    }

    const payload = await this.verifyToken({
      token: authorization,
      secret: await this.getSignature({
        tokenType,
        role: decoded.aud[0] as unknown as RoleEnum,
      }),
    });
    if (!payload.sub) {
      throw new UnauthorizedException("Invalid token payload.");
    }

    if (
      await this.cacheService.cacheExist({
        key: this.userRevokeTokenKey({ userId: payload.sub, jti: payload.jti }),
      })
    ) {
      throw new UnauthorizedException("Expired login credentials");
    }

    const user = await this.userRepository.findById({
      id: toObjectId(payload.sub),
      options: {},
    });

    if (!user) {
      throw new NotFoundException("User not found.");
    }

    if ((user.changeCredentialsTime?.getTime() ?? 0) > payload.iat * 1000) {
      throw new UnauthorizedException("Expired login credentials");
    }

    return { user, payload };
  }

  async createLoginCredentials({
    user,
    issuer,
  }: {
    user: HUser;
    issuer: string;
  }): Promise<{ access_token: string; refresh_token: string }> {
    const { accessSignature, refreshSignature } = await this.getTokenSignatures(
      {
        role: user.role as RoleEnum,
      },
    );
    const jwtid = randomUUID();
    const access_token = await this.createToken({
      payload: { },
      secret: accessSignature,
      options: {
        subject: user.id,
        issuer,
        audience: [user.role as unknown as string],
        expiresIn: ACCESS_TOKEN_EXPIRATION,
        jwtid,
      },
    });

    const refresh_token = await this.createToken({
      payload: { },
      secret: refreshSignature,
      options: {
        subject: user.id,
        issuer,
        audience: [user.role as unknown as string],
        expiresIn: REFRESH_TOKEN_EXPIRATION,
        jwtid,
      },
    });

    return { access_token, refresh_token };
  }

  async basicAuth({
    email,
    password,
  }: {
    email: string;
    password: string;
  }): Promise<HUser> {
    const user = await this.userRepository.findOne({
      filter: { email },
      options: {},
    });

    if (!user) throw new UnauthorizedException("Invalid login credentials.");

    const approval = await compare(password, user.password);

    if (!approval)
      throw new UnauthorizedException("Invalid login credentials.");

    return user;
  }

  async createRevokeToken({ payload }: { payload: JwtPayloadType }) {
    const consumedTime = Math.ceil(Date.now() / 1000) - payload.iat;
    const refreshExpiration = payload.iat + REFRESH_TOKEN_EXPIRATION;
    const ttl = refreshExpiration - consumedTime;

    (await this,
      cacheService.cacheSet({
        key: this.userRevokeTokenKey({ userId: payload.sub, jti: payload.jti }),
        value: payload.jti,
        ttl,
      }));
    return;
  }
}

export const tokenService = new TokenService();
