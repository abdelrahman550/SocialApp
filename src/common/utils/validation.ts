import { z } from "zod";
import mongoose from "mongoose";
import {
  FollowRequestActionsEnum,
  FollowRequestEnum,
  GenderEnum,
  LanguageEnum,
} from "../enum";
import {
  getValidationMessage,
  VALIDATION_CODES,
  type ValidationCode,
} from "../messages";

const PASSWORD_REGEX =
  /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,64}$/;

const OTP_REGEX = /^\d{6}$/;

const requiredOrInvalid =
  (
    lang: LanguageEnum,
    requiredCode: ValidationCode,
    invalidCode: ValidationCode,
  ) =>
  (issue: { input?: unknown }): string =>
    issue.input === undefined
      ? getValidationMessage(requiredCode, lang)
      : getValidationMessage(invalidCode, lang);

interface MatchFieldsOptions {
  original: string;
  copy: string;
  data: Record<string, unknown>;
  ctx: z.RefinementCtx;
  lang?: LanguageEnum;
  code?: ValidationCode;
}

const matchFields = ({
  original,
  copy,
  data,
  ctx,
  lang = LanguageEnum.EN,
  code = VALIDATION_CODES.FIELDS_MISMATCH,
}: MatchFieldsOptions): void => {
  if (data[original] !== data[copy]) {
    ctx.addIssue({
      code: "custom",
      path: [copy],
      message: getValidationMessage(code, lang, { original, copy }),
    });
  }
};

const nameField = (lang: LanguageEnum, code: ValidationCode) => {
  const message = getValidationMessage(code, lang);
  return z
    .string({ error: () => message })
    .trim()
    .min(2, message)
    .max(25, message);
};

export const generalValidationFields = {
  email: (lang: LanguageEnum) =>
    z.email({
      error: requiredOrInvalid(
        lang,
        VALIDATION_CODES.EMAIL_REQUIRED,
        VALIDATION_CODES.EMAIL_INVALID,
      ),
    }),

  password: (lang: LanguageEnum) =>
    z
      .string({
        error: requiredOrInvalid(
          lang,
          VALIDATION_CODES.PASSWORD_REQUIRED,
          VALIDATION_CODES.PASSWORD_INVALID,
        ),
      })
      .regex(
        PASSWORD_REGEX,
        getValidationMessage(VALIDATION_CODES.PASSWORD_WEAK, lang),
      ),

  passwordPresence: (lang: LanguageEnum) =>
    z
      .string({
        error: requiredOrInvalid(
          lang,
          VALIDATION_CODES.PASSWORD_REQUIRED,
          VALIDATION_CODES.PASSWORD_INVALID,
        ),
      })
      .min(1, getValidationMessage(VALIDATION_CODES.PASSWORD_REQUIRED, lang)),

  otp: (lang: LanguageEnum) =>
    z
      .string({
        error: requiredOrInvalid(
          lang,
          VALIDATION_CODES.OTP_REQUIRED,
          VALIDATION_CODES.OTP_INVALID,
        ),
      })
      .regex(
        OTP_REGEX,
        getValidationMessage(VALIDATION_CODES.OTP_FORMAT, lang),
      ),

  username: (lang: LanguageEnum) =>
    z
      .string({
        error: requiredOrInvalid(
          lang,
          VALIDATION_CODES.USERNAME_REQUIRED,
          VALIDATION_CODES.USERNAME_INVALID,
        ),
      })
      .min(1, getValidationMessage(VALIDATION_CODES.USERNAME_REQUIRED, lang)),

  firstName: (lang: LanguageEnum) =>
    nameField(lang, VALIDATION_CODES.FIRST_NAME_INVALID),

  lastName: (lang: LanguageEnum) =>
    nameField(lang, VALIDATION_CODES.LAST_NAME_INVALID),

  DOB: (lang: LanguageEnum) => {
    const message = getValidationMessage(VALIDATION_CODES.DOB_INVALID, lang);
    return z.iso
      .date({ error: () => message })
      .refine((value) => new Date(value) <= new Date(), { message });
  },

  phone: (lang: LanguageEnum) =>
    z.e164({
      error: requiredOrInvalid(
        lang,
        VALIDATION_CODES.PHONE_REQUIRED,
        VALIDATION_CODES.PHONE_INVALID,
      ),
    }),

  gender: (lang: LanguageEnum) =>
    z.enum(GenderEnum, {
      error: requiredOrInvalid(
        lang,
        VALIDATION_CODES.GENDER_REQUIRED,
        VALIDATION_CODES.GENDER_INVALID,
      ),
    }),

  messageContent: (lang: LanguageEnum) =>
    z
      .string({
        error: requiredOrInvalid(
          lang,
          VALIDATION_CODES.MESSAGE_CONTENT_REQUIRED,
          VALIDATION_CODES.MESSAGE_CONTENT_INVALID,
        ),
      })
      .min(
        2,
        getValidationMessage(VALIDATION_CODES.MESSAGE_CONTENT_MIN, lang, {
          min: 2,
        }),
      )
      .max(
        50000,
        getValidationMessage(VALIDATION_CODES.MESSAGE_CONTENT_MAX, lang, {
          max: 50000,
        }),
      ),

  mongoId: (lang: LanguageEnum) =>
    z
      .string({
        error: requiredOrInvalid(
          lang,
          VALIDATION_CODES.ID_REQUIRED,
          VALIDATION_CODES.ID_INVALID,
        ),
      })
      .refine((data) => mongoose.Types.ObjectId.isValid(data), {
        message: getValidationMessage(VALIDATION_CODES.ID_INVALID, lang),
      }),

  messageFiles: (lang: LanguageEnum) =>
    z
      .array(
        z.strictObject(
          {
            fieldname: z.string(),
            originalname: z.string(),
            encoding: z.string(),
            mimetype: z.string(),
            buffer: z.instanceof(Buffer),
            size: z.number(),
            path: z.string(),
          },
          {
            error: () =>
              getValidationMessage(VALIDATION_CODES.FILE_INVALID, lang),
          },
        ),
        {
          error: () =>
            getValidationMessage(VALIDATION_CODES.FILES_INVALID, lang),
        },
      )
      .max(
        3,
        getValidationMessage(VALIDATION_CODES.FILES_MAX, lang, { max: 3 }),
      ),

  followRequestAction: (lang: LanguageEnum) =>
    z.enum(FollowRequestActionsEnum, {
      message: getValidationMessage(
        VALIDATION_CODES.FOLLOW_REQUEST_ACTION_INVALID,
        lang,
      ),
    }),

  followRequestStatus: (lang: LanguageEnum) =>
    z.enum(FollowRequestEnum, {
      message: getValidationMessage(
        VALIDATION_CODES.FOLLOW_REQUEST_STATUS_INVALID,
        lang,
      ),
    }),

  searchedName: (lang: LanguageEnum) =>
    z
      .string({
        error: requiredOrInvalid(
          lang,
          VALIDATION_CODES.SEARCHED_NAME_REQUIRED,
          VALIDATION_CODES.SEARCHED_NAME_INVALID,
        ),
      })
      .trim()
      .min(1, getValidationMessage(VALIDATION_CODES.SEARCHED_NAME_MIN, lang))
      .max(51, getValidationMessage(VALIDATION_CODES.SEARCHED_NAME_MAX, lang)),

  matchFields,
};
