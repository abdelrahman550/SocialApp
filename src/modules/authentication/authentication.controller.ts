import { NextFunction, Request, Response, Router } from "express";
import { responseFormatter, validation } from "../../middleware";
import authService from "./authentication.service";
import { IResponse, IUser } from "../../common/interface";
import * as validators from "./authentication.validation";
import { getIssuer } from "../../common/utils";
import {
  ILoginResponse,
  ISignupWithGmailResponse,
} from "./entities/authentication.entities";

const router = Router({ strict: true, caseSensitive: true });

router.post(
  "/signup",
  validation(validators.signup),
  responseFormatter(
    async (
      req: Request,
      res: Response,
      next: NextFunction,
    ): Promise<IResponse<IUser>> => {
      const data = await authService.signup(req.validate.body);
      return {
        status: 201,
        message: "Signup successful",
        data,
      };
    },
  ),
);

router.post(
  "/verify-forgot-password",
  validation(validators.emailAndCode),
  responseFormatter(
    async (
      req: Request,
      res: Response,
      next: NextFunction,
    ): Promise<IResponse<IUser>> => {
      const data = await authService.verifyForgottenPasswordCode(
        req.validate.body,
      );
      return {
        message: "Forgotten password code verified Successfully.",
      };
    },
  ),
);

router.patch(
  "/reset-forgot-password",
  validation(validators.resetForgottenPassword),
  responseFormatter(
    async (
      req: Request,
      res: Response,
      next: NextFunction,
    ): Promise<IResponse<IUser>> => {
      const data = await authService.resetForgottenPassword(req.validate.body);
      return {
        message: "Password reset Successfully.",
      };
    },
  ),
);

router.post(
  "/forgot-password",
  validation(validators.emailConfirmation),
  responseFormatter(
    async (
      req: Request,
      res: Response,
      next: NextFunction,
    ): Promise<IResponse<IUser>> => {
      const data = await authService.sendForgottenPasswordCode(
        req.validate.body,
      );
      return {
        message: "Password reset code sent Successfully.",
      };
    },
  ),
);

router.post(
  "/signup-with-gmail",
  responseFormatter(
    async (
      req: Request,
      res: Response,
      next: NextFunction,
    ): Promise<IResponse<ILoginResponse>> => {
      const { data, status } = await authService.signupWithGmail(
        req.body,
        getIssuer(req),
      );
      return {
        status,
        message: "Signup successful",
        data,
      };
    },
  ),
);

router.post(
  "/login",
  validation(validators.login),
  responseFormatter(
    async (
      req: Request,
      res: Response,
      next: NextFunction,
    ): Promise<IResponse<ILoginResponse | void>> => {
      const data = await authService.manageLogin(
        req.validate.body,
        getIssuer(req),
      );
      return {
        status: 201,
        message: "Login successful",
        data,
      };
    },
  ),
);

router.patch(
  "/confirm-email",
  validation(validators.emailAndCode),
  responseFormatter(async (req: Request, res: Response, next: NextFunction) => {
    await authService.confirmEmail(req.validate.body);
  }),
);

router.patch(
  "/resend-confirmation-email",
  validation(validators.emailConfirmation),
  responseFormatter(async (req: Request, res: Response, next: NextFunction) => {
    await authService.resendEmailConfirmation(req.validate.body);
  }),
);

export default router;
