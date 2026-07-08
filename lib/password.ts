import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { env } from "@/lib/env";

export function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, env.BCRYPT_COST);
}

export function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

const PASSWORD_MIN_LENGTH = 10;
const PASSWORD_COMPLEXITY_REGEX = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

export function validatePasswordPolicy(password: string): { valid: boolean; reason?: string } {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { valid: false, reason: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.` };
  }
  if (!PASSWORD_COMPLEXITY_REGEX.test(password)) {
    return {
      valid: false,
      reason: "Password must contain an uppercase letter, a lowercase letter, and a digit.",
    };
  }
  return { valid: true };
}

const TEMP_PASSWORD_LOWER = "abcdefghjkmnpqrstuvwxyz";
const TEMP_PASSWORD_UPPER = "ABCDEFGHJKMNPQRSTUVWXYZ";
const TEMP_PASSWORD_DIGITS = "23456789";

/** Generates a random temporary password that satisfies `validatePasswordPolicy`. */
export function generateTempPassword(): string {
  const pick = (charset: string) => charset[randomInt(charset.length)];
  const required = [pick(TEMP_PASSWORD_UPPER), pick(TEMP_PASSWORD_LOWER), pick(TEMP_PASSWORD_DIGITS)];
  const all = TEMP_PASSWORD_LOWER + TEMP_PASSWORD_UPPER + TEMP_PASSWORD_DIGITS;
  const rest = Array.from({ length: 9 }, () => pick(all));

  return [...required, ...rest].sort(() => randomInt(3) - 1).join("");
}
