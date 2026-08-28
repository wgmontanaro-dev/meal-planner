import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getSessionSecret } from "@/lib/constants/env";

export const SESSION_COOKIE_NAME = "meal_planner_session";

const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30; // 30 days.
const SESSION_ISSUER = "meal-planner";
const SESSION_SUBJECT = "shared-household";

function getSigningKey(): Uint8Array {
  return new TextEncoder().encode(getSessionSecret());
}

async function createSessionToken(): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(SESSION_ISSUER)
    .setSubject(SESSION_SUBJECT)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSigningKey());
}

async function verifySessionToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, getSigningKey(), {
      issuer: SESSION_ISSUER,
      subject: SESSION_SUBJECT,
    });
    return payload.sub === SESSION_SUBJECT;
  } catch {
    return false;
  }
}

/**
 * Creates a signed session cookie for the shared household session.
 * Must only be called from a Server Function or Route Handler.
 */
export async function createSession(): Promise<void> {
  const token = await createSessionToken();
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

/**
 * Clears the session cookie, signing the household out.
 * Must only be called from a Server Function or Route Handler.
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Validates the current request's session cookie. Safe to call from
 * Server Components, Server Functions, Route Handlers and Proxy.
 */
export async function validateSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return false;
  }
  return verifySessionToken(token);
}

/**
 * Validates a session cookie value taken directly from a request (for use
 * in Proxy, where reading via next/headers `cookies()` is not available).
 */
export async function validateSessionToken(
  token: string | undefined
): Promise<boolean> {
  if (!token) {
    return false;
  }
  return verifySessionToken(token);
}
