import mongoose, { HydratedDocument } from "mongoose";
import { IFollowRequest } from "../../common/interface";
import { FollowRequestEnum } from "../../common/enum";

const followRequestSchema = new mongoose.Schema<IFollowRequest>(
  {
    followerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    followingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: FollowRequestEnum,
      required: true,
    },
  },
  {
    timestamps: true,
    strict: true,
    strictQuery: true,
  },
);

followRequestSchema.index({ followerId: 1, followingId: 1 }, { unique: true });

export const FollowRequestModel =
  mongoose.models.FollowRequest ||
  mongoose.model<IFollowRequest>("FollowRequest", followRequestSchema);

export type HFollowRequest = HydratedDocument<IFollowRequest>;
