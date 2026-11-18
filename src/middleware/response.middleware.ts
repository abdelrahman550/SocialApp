import { NextFunction, Request, RequestHandler, Response } from "express";
import { IResponse } from "../common/interface";

export const responseFormatter = (handler: Function): RequestHandler => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> => {
    const {
      status = 200,
      success = true,
      message = "success",
      data = undefined,
      extra = undefined,
    }: IResponse = (await handler(req, res, next)) || {};

    if (res.headersSent) return;
    return res.status(status).json({
      status,
      success,
      message,
      data,
      extra,
    });
  };
};
