import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { env } from "@/lib/env";

const secretKey = new TextEncoder().encode(env.JWT_SECRET);

export interface SessionTokenPayload extends JWTPayload {
  sub: string; // userId
  jti: string; // sessionId
  role: string;
  mustChangePassword: boolean;
}

export async function signSessionToken(
  payload: Omit<SessionTokenPayload, "iat" | "exp">,
  expiresInSeconds: number,
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresInSeconds)
    .sign(secretKey);
}

export async function verifySessionToken(token: string): Promise<SessionTokenPayload | null> {
  try {
    const { payload } = await jwtVerify<SessionTokenPayload>(token, secretKey);
    if (typeof payload.sub !== "string" || typeof payload.jti !== "string") return null;
    return payload;
  } catch {
    return null;
  }
}
