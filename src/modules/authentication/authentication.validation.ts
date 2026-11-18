import { z } from "zod";
import {
  VALIDATION_CODES,
  getValidationMessage,
} from "../../common/messages/index.js";
import { generalValidationFields } from "../../common/utils";
import { LanguageEnum } from "../../common/enum";

export const loginSchema = (lang: LanguageEnum) => {
  return z.strictObject({
    email: generalValidationFields.email(lang),
    password: generalValidationFields.passwordPresence(lang),
  });
};

export const login = (lang: LanguageEnum) => {
  return z.object({
    body: loginSchema(lang),
  });
};

export const signupSchema = (lang: LanguageEnum) => {
  return loginSchema(lang)
    .safeExtend({
      username: generalValidationFields.username(lang),
      phone: generalValidationFields.phone(lang),
      password: generalValidationFields.password(lang),
      confirmPassword: generalValidationFields.passwordPresence(lang),
      gender: generalValidationFields.gender(lang),
      DOB: generalValidationFields.DOB(lang),
    })
    .superRefine((data, ctx) => {
      generalValidationFields.matchFields({
        original: "password",
        copy: "confirmPassword",
        data,
        ctx,
        lang,
        code: VALIDATION_CODES.PASSWORD_MISMATCH,
      });

      if (
        typeof data.username === "string" &&
        !data.username.trim().includes(" ")
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["username"],
          message: getValidationMessage(
            VALIDATION_CODES.USERNAME_FULL_NAME,
            lang,
          ),
        });
      }
    });
};

export const signup = (lang: LanguageEnum) => {
  return z.object({
    body: signupSchema(lang),
  });
};

export const emailAndCodeSchema = (lang: LanguageEnum) => {
  return z.strictObject({
    email: generalValidationFields.email(lang),
    otp: generalValidationFields.otp(lang),
  });
};

export const emailAndCode = (lang: LanguageEnum) => {
  return z.object({
    body: emailAndCodeSchema(lang),
  });
};

export const emailConfirmationSchema = (lang: LanguageEnum) => {
  return z.strictObject({
    email: generalValidationFields.email(lang),
  });
};

export const emailConfirmation = (lang: LanguageEnum) => {
  return z.object({
    body: emailConfirmationSchema(lang),
  });
};

export const resetForgottenPasswordSchema = (lang: LanguageEnum) => {
  return z
    .strictObject({
      email: generalValidationFields.email(lang),
      otp: generalValidationFields.otp(lang),
      password: generalValidationFields.password(lang),
      confirmPassword: generalValidationFields.passwordPresence(lang),
    })
    .superRefine((data, ctx) => {
      generalValidationFields.matchFields({
        original: "password",
        copy: "confirmPassword",
        data,
        ctx,
        lang,
        code: VALIDATION_CODES.PASSWORD_MISMATCH,
      });
    });
};

export const resetForgottenPassword = (lang: LanguageEnum) => {
  return z.object({
    body: resetForgottenPasswordSchema(lang),
  });
};
