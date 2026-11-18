import { RoleEnum, TokenTypeEnum } from "../common/enum";
import { NextFunction, Request, Response } from "express";
import { tokenService } from "../common/service";
import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from "../common/exception";

export const bearerAuth = async ({
  req,
  tokenType = TokenTypeEnum.ACCESS,
}: {
  req: Request;
  tokenType: TokenTypeEnum;
}) => {
  const [key, credential] = (req.headers["authorization"]?.split(" ") ||
    []) as [string, string];
  const { user, payload } = await tokenService.decodeToken({
    authorization: credential,
    tokenType,
  });
  req.user = user;
  req.payload = payload;
};

export const authentication = (tokenType = TokenTypeEnum.ACCESS) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { authorization } = req.headers;
    if (!authorization)
      throw new UnauthorizedException("Unauthorized account.");

    const [key, credential] = (authorization.split(" ") || []) as [
      string,
      string,
    ];

    switch (key) {
      case "Basic":
        const [email, password] = Buffer.from(credential, "base64")
          .toString()
          ?.split(":") as [string, string];

        req.user = await tokenService.basicAuth({ email, password });
        break;
      case "Bearer":
        await bearerAuth({ req, tokenType });
        break;

      default:
        throw new BadRequestException("Invalid authentication schema");
        break;
    }
    next();
  };
};

export const authorization = (accessRole: RoleEnum) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if ((req.user.role as number) < accessRole) {
      throw new ForbiddenException("Forbidden account");
    }

    next();
  };
};
