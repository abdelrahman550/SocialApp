import { NextFunction, Request, Response } from "express";
import { IError } from "../common/interface";
import { ApplicationException } from "../common/exception";

export const globalErrorHandling = (
  error: IError,
  req: Request,
  res: Response,
  next: NextFunction,
): Response => {
  if (error instanceof ApplicationException) {
    return res.status(error.status).json(error);
  }
  return res.status(error.status ?? 500).json({
    error: {
      message: error.message || "server error",
      status: error.status ?? 500,
      cause: error.cause,
      name: error.name,
    },
    stack: error.stack,
  });
};
