import mongoose from "mongoose";
import { AccountStatusEnum, GenderEnum, ProviderEnum, RoleEnum, UserVisibilityEnum } from "../enum";

export interface IUser {
  firstName: string;
  lastName: string;
  username?: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone?: string;
  DOB?: Date;
  confirmEmail?: Date;
  image?: string;
  changeCredentialsTime?: Date;
  twoStepVerification?: boolean;
  coverImage?: string[];
  gender?: GenderEnum;
  role?: RoleEnum;
  provider?: ProviderEnum;
  status: AccountStatusEnum;
  followers: mongoose.Types.ObjectId[];
  following: mongoose.Types.ObjectId[];
  changeStatusAt?: Date;
  visibility?: UserVisibilityEnum;
  createdAt?: Date;
  updatedAt?: Date;
}
