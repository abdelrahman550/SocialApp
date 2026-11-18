import { HUser } from "../../DB/models";
import { JwtPayloadType } from "../service/token.service";

declare module "express-serve-static-core" {
  interface Request {
    validate: any;
    user: HUser;
    payload: JwtPayloadType;
  }
}
