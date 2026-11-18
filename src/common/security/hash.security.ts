import bcrypt from "bcrypt";

export const hash = async (
  plaintext: string,
  rounds: number = 12,
): Promise<string> => {
  return await bcrypt.hash(plaintext, rounds);
};

export const compare = async (
  plaintext: string,
  hashedText: string,
): Promise<boolean> => {
  return await bcrypt.compare(plaintext, hashedText);
};
