import { resolve } from "node:path";
import { config } from "dotenv";

config({ path: resolve(`.env.${process.env.NODE_ENV ?? "dev"}`) });

export const APPLICATION_NAME: string = process.env.APPLICATION_NAME as string;

export const PORT: number = parseInt(process.env.PORT ?? "5000") as number;

export const ORIGINS: string = process.env.ORIGINS as string;

export const DB_URI: string = process.env.DB_URI as string;

export const REDIS_URI: string = process.env.REDIS_URI as string;

export const APP_EMAIL: string = process.env.APP_EMAIL as string;
export const APP_PASSWORD: string = process.env.APP_PASSWORD as string;

export const ENC_KEY: string = process.env.ENC_KEY as string;
export const IV_LENGTH: number = parseInt(
  process.env.IV_LENGTH ?? "16",
) as number;

export const ACCESS_TOKEN_SIGNATURE: string = process.env
  .ACCESS_TOKEN_SIGNATURE as string;
export const ADMIN_ACCESS_TOKEN_SIGNATURE: string = process.env
  .ADMIN_ACCESS_TOKEN_SIGNATURE as string;

export const ACCESS_TOKEN_EXPIRATION: number = parseInt(
  process.env.ACCESS_TOKEN_EXPIRATION ?? "1800",
) as number;

export const REFRESH_TOKEN_SIGNATURE: string = process.env
  .REFRESH_TOKEN_SIGNATURE as string;
export const ADMIN_REFRESH_TOKEN_SIGNATURE: string = process.env
  .ADMIN_REFRESH_TOKEN_SIGNATURE as string;

export const REFRESH_TOKEN_EXPIRATION: number = parseInt(
  process.env.REFRESH_TOKEN_EXPIRATION ?? "86400",
) as number;

export const WEB_CLIENT_IDS: string[] =
  process.env.WEB_CLIENT_IDS?.split(",") || [];

export const LOGIN_MAX_ATTEMPTS: number = parseInt(
  process.env.LOGIN_MAX_ATTEMPTS ?? "5",
) as number;
export const LOGIN_BLOCK_TIME: number = parseInt(
  process.env.LOGIN_BLOCK_TIME ?? "300",
) as number;
