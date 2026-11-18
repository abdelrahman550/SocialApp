import { NextFunction, Request, Response, Router } from "express";
import {
  RoleEnum,
  StorageApproachEnum,
  TokenTypeEnum,
} from "../../common/enum";
import {
  authentication,
  authorization,
  multerUpload,
  responseFormatter,
  validation,
} from "../../middleware";
import { userService } from "./user.service";
import { getIssuer } from "../../common/utils";
import { fileTypeValidation, localFileUpload } from "../../common/utils/multer";
import * as validators from "./user.validation";
import mongoose from "mongoose";

const router = Router({ strict: true, caseSensitive: true });

router.get(
  "/",
  authentication(),
  responseFormatter(async (req: Request, res: Response, next: NextFunction) => {
    return { data: req.user };
  }),
);

router.patch(
  "/profile-image",
  authentication(),
  multerUpload({
    multerMiddleware: localFileUpload({
      storageApproach: StorageApproachEnum.DISK,
    }).single("attachment"),
    validation: fileTypeValidation.images,
    customPath: "users",
  }),
  responseFormatter(async (req: Request, res: Response, next: NextFunction) => {
    return { data: req.file };
  }),
);

router.patch(
  "/",
  authentication(),
  authorization(RoleEnum.USER),
  validation(validators.updateProfile),
  responseFormatter(async (req: Request, res: Response, next: NextFunction) => {
    const data = await userService.updateProfile(req.user, req.validate.body);
    return { data };
  }),
);

router.post(
  "/rotate-token",
  authentication(TokenTypeEnum.REFRESH),
  responseFormatter(async (req: Request, res: Response, next: NextFunction) => {
    const data = await userService.rotateToken(
      req.payload,
      req.user,
      getIssuer(req),
    );
    return { data };
  }),
);

router.post(
  "/logout",
  authentication(),
  responseFormatter(async (req: Request, res: Response, next: NextFunction) => {
    const data = await userService.logout(req.payload, req.user, req.body);
    return { data };
  }),
);

router.post(
  "/follow/:id",
  authentication(),
  responseFormatter(async (req: Request, res: Response, next: NextFunction) => {
    const message = await userService.followUser(
      req.user,
      req.params.id as unknown as mongoose.Types.ObjectId,
    );
    return { message };
  }),
);

router.post(
  "/unfollow/:id",
  authentication(),
  responseFormatter(async (req: Request, res: Response, next: NextFunction) => {
    const message = await userService.unfollowUser(
      req.user,
      req.params.id as unknown as mongoose.Types.ObjectId,
    );
    return { message };
  }),
);

router.patch(
  "/manage-follow-request/:id",
  authentication(),
  validation(validators.managePrivateFollowRequest),
  responseFormatter(async (req: Request, res: Response, next: NextFunction) => {
    const message = await userService.managePrivateFollowRequest(
      req.params.id as unknown as mongoose.Types.ObjectId,
      req.user,
      req.validate.body,
    );
    return { message };
  }),
);

router.delete(
  "/cancel-follow-request/:id",
  authentication(),
  responseFormatter(async (req: Request, res: Response, next: NextFunction) => {
    const message = await userService.cancelFollowRequest(
      req.params.id as unknown as mongoose.Types.ObjectId,
      req.user,
    );
    return { message };
  }),
);

router.get(
  "/search",
  authentication(),
  validation(validators.searchUsers),
  responseFormatter(async (req: Request, res: Response, next: NextFunction) => {
    const data = await userService.searchUsersByName(req.user, {
      name: req.query.name as string,
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 10,
    });
    return { data };
  }),
);

router.get(
  "/follow-suggestions",
  authentication(),
  responseFormatter(async (req: Request, res: Response, next: NextFunction) => {
    const data = await userService.getFollowSuggestions(req.user);
    return { data };
  }),
);

router.get(
  "/follow-requests-received",
  authentication(),
  responseFormatter(async (req: Request, res: Response, next: NextFunction) => {
    const data = await userService.getReceivedFollowRequests(req.user, {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 10,
    });
    return { data };
  }),
);

router.get(
  "/followers",
  authentication(),
  responseFormatter(async (req: Request, res: Response, next: NextFunction) => {
    const data = await userService.getUserFollowers(req.user, {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 10,
    });
    return { data };
  }),
);

router.get(
  "/following",
  authentication(),
  responseFormatter(async (req: Request, res: Response, next: NextFunction) => {
    const data = await userService.getUserFollowing(req.user, {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 10,
    });
    return { data };
  }),
);

router.patch(
  "/toggle-visibility",
  authentication(),
  responseFormatter(async (req: Request, res: Response, next: NextFunction) => {
    const message = await userService.toggleUserVisibility(req.user);
    return { message };
  }),
);

export default router;
