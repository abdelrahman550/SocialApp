import mongoose from "mongoose";
import { FollowRequestEnum } from "../enum";

export interface IFollowRequest {
  followerId: mongoose.Types.ObjectId;
  followingId: mongoose.Types.ObjectId;
  status: FollowRequestEnum;
  createdAt?: Date;
  updatedAt?: Date;
}