import { z } from "zod";
import { getValidationMessage, VALIDATION_CODES } from "../../common/messages";
import { FollowRequestEnum, LanguageEnum } from "../../common/enum";
import { generalValidationFields } from "../../common/utils";

export const updateProfileSchema = (lang: LanguageEnum) => {
  return z
    .strictObject({
      firstName: generalValidationFields.firstName(lang).optional(),
      lastName: generalValidationFields.lastName(lang).optional(),
      phone: generalValidationFields.phone(lang).optional(),
      DOB: generalValidationFields.DOB(lang).optional(),
      gender: generalValidationFields.gender(lang).optional(),
    })
    .superRefine((data, ctx) => {
      if (Object.values(data).every((value) => value === undefined)) {
        ctx.addIssue({
          code: "custom",
          path: [],
          message: getValidationMessage(VALIDATION_CODES.UPDATE_EMPTY, lang),
        });
      }
    });
};

export const updateProfile = (lang: LanguageEnum) => {
  return z.object({
    body: updateProfileSchema(lang),
  });
};

export const managePrivateFollowRequestSchema = (lang: LanguageEnum) => {
  return z.strictObject({
    action: generalValidationFields.followRequestAction(lang),
  });
};

export const managePrivateFollowRequest = (lang: LanguageEnum) => {
  return z.object({
    body: managePrivateFollowRequestSchema(lang),
  });
};

export const searchUsersSchema = (lang: LanguageEnum) => {
  return z.strictObject({
    name: generalValidationFields.searchedName(lang),
  });
};

export const searchUsers = (lang: LanguageEnum) => {
  return z.object({
    query: searchUsersSchema(lang),
  });
};
