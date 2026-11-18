import { z } from "zod";
import {
  emailAndCode,
  emailConfirmation,
  login,
  resetForgottenPassword,
  signup,
} from "../authentication.validation";

export type SignupDto = z.infer<ReturnType<typeof signup>>;
export type LoginDto = z.infer<ReturnType<typeof login>>["body"];
export type ConfirmEmailDto = z.infer<ReturnType<typeof emailAndCode>>["body"];
export type loginWith2FADto = z.infer<ReturnType<typeof emailAndCode>>["body"];
export type verifyForgottenPasswordCodeDto = z.infer<ReturnType<typeof emailAndCode>>["body"];
export type resetForgottenPasswordDto = z.infer<ReturnType<typeof resetForgottenPassword>>["body"];
export type Enable2StepVerificationDto = z.infer<
  ReturnType<typeof emailAndCode>
>["body"];
export type ResendEmailConfirmationDto = z.infer<
  ReturnType<typeof emailConfirmation>
>["body"];
export type Send2StepVerificationCodeDto = z.infer<
  ReturnType<typeof emailConfirmation>
>["body"];

export type SendForgottenPasswordCodeDto = z.infer<
  ReturnType<typeof emailConfirmation>
>["body"];
