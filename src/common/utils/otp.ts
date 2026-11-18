import crypto from "node:crypto";

export const createOtp = (): string => {
  return crypto.randomInt(100000, 1000000).toString();
};
