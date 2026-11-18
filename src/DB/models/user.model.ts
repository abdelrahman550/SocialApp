import mongoose, { HydratedDocument } from "mongoose";
import {
  AccountStatusEnum,
  GenderEnum,
  ProviderEnum,
  RoleEnum,
  UserVisibilityEnum,
} from "../../common/enum/index.js";
import { IUser } from "../../common/interface/user.interface.js";
import { encryption, hash } from "../../common/security";

const userSchema = new mongoose.Schema<IUser>(
  {
    firstName: {
      type: String,
      minLength: 2,
      maxLength: 25,
      required: true,
    },

    lastName: {
      type: String,
      minLength: 2,
      maxLength: 25,
      required: true,
    },

    email: {
      type: String,
      unique: true,
      required: true,
    },

    password: {
      type: String,
      required: function (): boolean {
        return this.provider == ProviderEnum.SYSTEM;
      },
    },

    confirmPassword: String,

    phone: {
      type: String,
      required: function (): boolean {
        return this.provider == ProviderEnum.SYSTEM;
      },
    },

    DOB: Date,

    confirmEmail: Date,

    image: String,

    changeCredentialsTime: Date,

    twoStepVerification: {
      type: Boolean,
      default: false,
    },

    coverImage: [String],

    gender: {
      type: Number,
      enum: GenderEnum,
      default: GenderEnum.MALE,
    },
    role: {
      type: Number,
      default: RoleEnum.USER,
      enum: RoleEnum,
    },
    provider: {
      type: Number,
      default: ProviderEnum.SYSTEM,
      enum: ProviderEnum,
    },
    status: {
      type: Number,
      enum: AccountStatusEnum,
      default: AccountStatusEnum.ACTIVE,
    },
    followers: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },

    following: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    visibility: {
      type: Number,
      enum: UserVisibilityEnum,
      default: UserVisibilityEnum.PUBLIC,
    },
    changeStatusAt: Date,
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
    strict: true,
    strictQuery: true,
  },
);

userSchema
  .virtual("username")
  .set(function (value) {
    const [firstName, lastName] = value?.split(" ") || [];
    this.set({ firstName, lastName });
  })
  .get(function () {
    return `${this.firstName} ${this.lastName}`;
  });

userSchema.pre("validate", function () {
  if (this.provider == ProviderEnum.GOOGLE && this.password) {
    throw new Error("Google account can not hold a password");
  }
});

userSchema.pre("save", async function () {
  if (this.isModified("password") && this.password) {
    this.password = await hash(this.password);
  }

  if (this.isModified("phone") && this.phone) {
    this.phone = encryption(this.phone);
  }
});

userSchema.pre(["findOne", "find", "countDocuments"], function () {
  const query = this.getFilter();
  if (query.paranoid != false)
    this.setQuery({ ...query, status: { $ne: AccountStatusEnum.INACTIVE } });
});

userSchema.pre(["updateOne", "updateMany", "findOneAndUpdate"], function () {
  const query = this.getFilter();
  const update = this.getUpdate() as HUser;

  if (update.status == AccountStatusEnum.ACTIVE) {
    this.setQuery({ ...query, status: { $eq: AccountStatusEnum.INACTIVE } });
  } else if (update.status == AccountStatusEnum.INACTIVE) {
    this.setQuery({ ...query, status: { $ne: AccountStatusEnum.INACTIVE } });
  }

  if (update.status === undefined && query.paranoid != false) {
    this.setQuery({ ...query, status: { $ne: AccountStatusEnum.INACTIVE } });
  }

  this.setUpdate({
    ...this.getUpdate(),
    ...(update.status ? { changeStatusAt: new Date() } : {}),
  });
});

userSchema.pre(["deleteOne", "deleteMany", "findOneAndDelete"], function () {
  const query = this.getFilter();

  if (!query.force) {
    this.setQuery({ ...query, status: { $eq: AccountStatusEnum.INACTIVE } });
  }
});

export const UserModel =
  mongoose.models.User || mongoose.model<IUser>("User", userSchema);

export type HUser = HydratedDocument<IUser>;
