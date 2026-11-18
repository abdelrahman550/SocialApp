import mongoose from "mongoose";
import {
  FollowRequestEnum,
  LogoutEnum,
  UserVisibilityEnum,
} from "../../common/enum";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "../../common/exception";
import {
  UserRepository,
  FollowRequestRepository,
} from "../../common/repository";
import {
  cacheService,
  CacheService,
  JwtPayloadType,
} from "../../common/service";
import { ACCESS_TOKEN_EXPIRATION } from "../../config";
import { HFollowRequest, HUser } from "../../DB/models";
import { ILoginResponse } from "../authentication/entities/authentication.entities";
import {
  TokenService,
  tokenService,
} from "./../../common/service/token.service";
import { UpdateProfileDto } from "./dto/user.dto";
import { toObjectId } from "../../common/utils";
import { IPagination } from "../../common/interface";

export class UserService {
  private readonly tokenService: TokenService;
  private readonly userRepository: UserRepository;
  private readonly followRequestRepository: FollowRequestRepository;
  private readonly cacheService: CacheService;

  constructor() {
    this.tokenService = tokenService;
    this.cacheService = cacheService;
    this.userRepository = new UserRepository();
    this.followRequestRepository = new FollowRequestRepository();
  }

  async rotateToken(
    payload: JwtPayloadType,
    user: HUser,
    issuer: string,
  ): Promise<ILoginResponse> {
    const accessExpiration = (payload.iat + ACCESS_TOKEN_EXPIRATION) * 1000;
    const maxTimeAllowed = Date.now() + 5 * 60000;
    if (maxTimeAllowed < accessExpiration) {
      throw new ConflictException(
        "Cannot create new credentials as the current one is still within time range.",
      );
    }
    const data = await this.tokenService.createLoginCredentials({
      user,
      issuer,
    });
    await this.tokenService.createRevokeToken({ payload });
    return data;
  }

  async logout(
    payload: JwtPayloadType,
    user: HUser,
    { action = LogoutEnum.ONE }: { action: LogoutEnum },
  ): Promise<void> {
    switch (action) {
      case LogoutEnum.ALL:
        user.changeCredentialsTime = new Date();
        await user.save();

        await this.cacheService.cacheDelete({
          key: await this.cacheService.cacheKeys({
            prefix: this.tokenService.userBaseRevokeTokenKey({
              userId: payload.sub,
            }),
          }),
        });
        break;

      default:
        await this.tokenService.createRevokeToken({ payload });
        break;
    }
    return;
  }

  async updateProfile(
    user: HUser,
    { firstName, lastName, phone, DOB, gender }: UpdateProfileDto,
  ): Promise<HUser> {
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;

    if (phone !== undefined) user.phone = phone;
    if (DOB !== undefined) user.DOB = DOB as unknown as Date;
    if (gender !== undefined) user.gender = gender;

    await user.save();

    return user;
  }

  async followUser(
    user: HUser,
    requestedUserId: mongoose.Types.ObjectId,
  ): Promise<string> {
    const targetUser = (await this.userRepository.findById({
      id: requestedUserId,
    })) as HUser;
    if (!targetUser) {
      throw new NotFoundException(
        "The user you are trying to follow was not found",
      );
    }

    const existingRequest = await this.followRequestRepository.findOne({
      filter: {
        followerId: user._id,
        followingId: targetUser._id,
      },
    });

    if (existingRequest) {
      if (existingRequest.status === FollowRequestEnum.PENDING) {
        throw new ConflictException("Follow request already pending");
      }

      if (existingRequest.status === FollowRequestEnum.ACCEPTED) {
        throw new ConflictException("You are already following this user");
      }

      if (existingRequest.status === FollowRequestEnum.REJECTED) {
        throw new ConflictException("This user rejected your request");
      }
    }

    if (targetUser._id.toString() == user._id.toString()) {
      throw new BadRequestException("You cannot follow yourself");
    }

    let message;

    if (targetUser.visibility === UserVisibilityEnum.PRIVATE) {
      await this.followRequestRepository.create({
        data: {
          followerId: user._id,
          followingId: targetUser._id,
          status: FollowRequestEnum.PENDING,
        },
      });
      message = `Follow request sent to  ${targetUser.firstName} ${targetUser.lastName} successfully`;
    }

    if (targetUser.visibility === UserVisibilityEnum.PUBLIC) {
      await this.followRequestRepository.create({
        data: {
          followerId: user._id,
          followingId: targetUser._id,
          status: FollowRequestEnum.ACCEPTED,
        },
      });
      user.following.push(targetUser._id);
      targetUser.followers.push(user._id);
      message = `You are now following ${targetUser.firstName} ${targetUser.lastName} successfully`;
    }

    await Promise.all([user.save(), targetUser.save()]);

    return message as string;
  }

  async getReceivedFollowRequests(
    user: HUser,
    {
      page = 1,
      limit = 10,
    }: {
      page?: number;
      limit?: number;
    },
  ): Promise<IPagination<HFollowRequest>> {
    const followRequestsPagination =
      await this.followRequestRepository.paginate({
        filter: {
          followingId: user._id,
          status: FollowRequestEnum.PENDING,
        },
        page,
        size: limit,
        options: {},
      });

    if (!followRequestsPagination.result.length) {
      throw new NotFoundException("No follow requests found");
    }

    return followRequestsPagination;
  }

  async getUserFollowers(
    user: HUser,
    {
      page = 1,
      limit = 10,
    }: {
      page?: number;
      limit?: number;
    },
  ): Promise<IPagination<HFollowRequest>> {
    const followersPagination = await this.followRequestRepository.paginate({
      filter: {
        followingId: user._id,
        status: FollowRequestEnum.ACCEPTED,
      },
      page,
      size: limit,
      options: {
        projection: "followerId",
        populate: {
          path: "followerId",
          select: "firstName lastName image visibility",
        },
      },
    });

    if (!followersPagination.result.length) {
      throw new NotFoundException("No followers found");
    }

    const result = followersPagination.result.map((request) => {
      const { followerId } = request.toObject();

      return {
        user: followerId,
      };
    });

    return result as unknown as IPagination<HFollowRequest>;
  }

  async getUserFollowing(
    user: HUser,
    {
      page = 1,
      limit = 10,
    }: {
      page?: number;
      limit?: number;
    },
  ): Promise<IPagination<HFollowRequest>> {
    const followingPagination = await this.followRequestRepository.paginate({
      filter: {
        followerId: user._id,
        status: FollowRequestEnum.ACCEPTED,
      },
      page,
      size: limit,
      options: {
        projection: "followingId",
        populate: {
          path: "followingId",
          select: "firstName lastName image visibility",
        },
      },
    });

    if (!followingPagination.result.length) {
      throw new NotFoundException("No following found");
    }

    const result = followingPagination.result.map((request) => {
      const { followingId } = request.toObject();

      return {
        user: followingId,
      };
    });

    return result as unknown as IPagination<HFollowRequest>;
  }

  async managePrivateFollowRequest(
    requestId: mongoose.Types.ObjectId,
    user: HUser,
    { action }: { action: FollowRequestEnum },
  ): Promise<string> {
    const followRequest = (await this.followRequestRepository.findById({
      id: requestId,
    })) as HFollowRequest;

    if (!followRequest) {
      throw new NotFoundException("Follow request not found");
    }

    const follower = (await this.userRepository.findById({
      id: followRequest.followerId,
    })) as HUser;

    const following = user;

    console.log({
      followOwnerStatus:
        followRequest.followingId.toString() !== user._id.toString(),
    });

    if (followRequest.followingId.toString() !== user._id.toString()) {
      throw new BadRequestException(
        "You are not authorized to manage this follow request",
      );
    }

    let message;

    if (followRequest?.status === FollowRequestEnum.ACCEPTED) {
      throw new ConflictException(
        "This follow request has already been accepted",
      );
    }

    if (followRequest?.status === FollowRequestEnum.REJECTED) {
      throw new ConflictException(
        "This follow request has already been rejected",
      );
    }

    if (action === FollowRequestEnum.ACCEPTED) {
      followRequest.status = FollowRequestEnum.ACCEPTED;
      follower.following.push(followRequest.followingId);
      following.followers.push(followRequest.followerId);

      await Promise.all([
        followRequest.save(),
        follower.save(),
        following.save(),
      ]);

      message = `You have accepted the follow request from ${follower.firstName} ${follower.lastName}`;
    }

    if (action === FollowRequestEnum.REJECTED) {
      followRequest.status = FollowRequestEnum.REJECTED;
      await followRequest.save();
      message = `You have rejected the follow request from ${follower.firstName} ${follower.lastName}`;
    }

    return message as string;
  }

  async cancelFollowRequest(
    requestId: mongoose.Types.ObjectId,
    user: HUser,
  ): Promise<string> {
    const followRequest = (await this.followRequestRepository.findById({
      id: requestId,
    })) as HFollowRequest;

    if (!followRequest) {
      throw new NotFoundException("Follow request not found");
    }

    if (followRequest.followerId.toString() !== user._id.toString()) {
      throw new BadRequestException(
        "You are not authorized to manage this follow request",
      );
    }

    if (followRequest?.status === FollowRequestEnum.ACCEPTED) {
      throw new ConflictException(
        "You can not cancel an accepted follow request",
      );
    }

    if (followRequest?.status === FollowRequestEnum.REJECTED) {
      throw new ConflictException(
        "You can not cancel a rejected follow request",
      );
    }

    await this.followRequestRepository.deleteOne({
      filter: {
        _id: followRequest._id,
      },
    });

    const message = "Follow request canceled successfully";

    return message as string;
  }

  async toggleUserVisibility(user: HUser): Promise<string> {
    let message;

    switch (user.visibility) {
      case UserVisibilityEnum.PUBLIC:
        user.visibility = UserVisibilityEnum.PRIVATE;
        await user.save();
        message =
          "Your account is now private. Only approved followers can see your content.";
        break;
      case UserVisibilityEnum.PRIVATE:
        user.visibility = UserVisibilityEnum.PUBLIC;
        await user.save();
        message = "Your account is now public. Anyone can see your content.";
        break;
    }

    return message as string;
  }

  async unfollowUser(user: HUser, requestedUserId: mongoose.Types.ObjectId) {
    const targetUser = (await this.userRepository.findById({
      id: requestedUserId,
    })) as HUser;

    if (!targetUser) {
      throw new NotFoundException(
        "The user you are trying to unfollow was not found",
      );
    }

    const follow = (await this.followRequestRepository.findOne({
      filter: {
        followerId: user._id,
        followingId: requestedUserId,
        status: FollowRequestEnum.ACCEPTED,
      },
      options: {},
    })) as HFollowRequest;

    if (targetUser._id.toString() == user._id.toString()) {
      throw new BadRequestException("You cannot unfollow yourself");
    }

    if (!follow) {
      throw new NotFoundException("You already do not follow this user");
    }

    if (follow.followerId.toString() !== user._id.toString()) {
      throw new BadRequestException(
        "You are not authorized to manage this follow",
      );
    }

    if (targetUser._id == user._id) {
      throw new BadRequestException("You cannot unfollow yourself");
    }

    await this.followRequestRepository.deleteOne({
      filter: {
        _id: follow._id,
      },
    });

    user.following = user.following.filter(
      (id) => id.toString() !== targetUser._id.toString(),
    );

    targetUser.followers = targetUser.followers.filter(
      (id) => id.toString() !== user._id.toString(),
    );

    await Promise.all([user.save(), targetUser.save()]);

    const message = `You unfollowed  ${targetUser.firstName} ${targetUser.lastName} successfully`;

    return message;
  }

  async searchUsersByName(
    user: HUser,
    {
      name,
      page = 1,
      limit = 10,
    }: {
      name: string;
      page?: number;
      limit?: number;
    },
  ): Promise<IPagination<HUser>> {
    const searchedName = name.trim();

    if (!searchedName) {
      throw new BadRequestException("Search name is required");
    }

    const escapedName = searchedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const paginationResult = await this.userRepository.paginate({
      filter: {
        _id: { $ne: user._id },
        $or: [
          { firstName: { $regex: escapedName, $options: "i" } },
          { lastName: { $regex: escapedName, $options: "i" } },
        ],
      },
      page,
      size: limit,
      projection: "firstName lastName image visibility",
      options: {
        sort: { firstName: 1, lastName: 1 },
      },
    });

    return paginationResult;
  }

  async getFollowSuggestions(user: HUser): Promise<mongoose.Types.ObjectId[]> {
    const userOwnFollowing = user.following ?? [];

    const followingUsers = (await this.userRepository.find({
      filter: {
        _id: { $in: userOwnFollowing },
      },
      options: {
        populate: {
          path: "following",
          select: "firstName lastName image visibility",
        },
      },
    })) as HUser[];

    const rawFollowSuggestions = followingUsers.flatMap(
      (u) => u.following ?? [],
    );

    const followSuggestions = rawFollowSuggestions.filter((fSuggestion) => {
      return (
        !fSuggestion._id.equals(user._id) &&
        !user.following.some((id) => id.equals(fSuggestion._id))
      );
    });

    return followSuggestions;
  }
}

export const userService = new UserService();
