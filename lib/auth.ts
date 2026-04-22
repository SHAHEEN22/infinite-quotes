import { createClient } from "@vercel/kv";
import { randomBytes, timingSafeEqual, createHash } from "crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const kv = createClient({
  url: process.env.upstash_KV_REST_API_URL ?? process.env.KV_REST_API_URL ?? "",
  token: process.env.upstash_KV_REST_API_TOKEN ?? process.env.KV_REST_API_TOKEN ?? "",
});

const SESSION_TTL = 86400; // 24 hours in seconds
const SESSION_COOKIE = "paranormnl_session";
const MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW = 60; // 1 minute in seconds

// --- Password verification ---

export function verifyPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const inputHash = createHash("sha256").update(input).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(inputHash, expectedHash);
}

// --- Rate limiting ---

function getClientIp(req: VercelRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0]?.trim();
  return ip ?? "unknown";
}

export async function checkRateLimit(req: VercelRequest): Promise<boolean> {
  const ip = getClientIp(req);
  const key = `paranormnl:admin:login-attempts:${ip.replace(/[^a-zA-Z0-9.:]/g, "")}`;
  const attempts = await kv.get<number>(key);
  return (attempts ?? 0) < MAX_ATTEMPTS;
}

export async function recordFailedAttempt(req: VercelRequest): Promise<void> {
  const ip = getClientIp(req);
  const key = `paranormnl:admin:login-attempts:${ip.replace(/[^a-zA-Z0-9.:]/g, "")}`;
  const newVal = await kv.incr(key);
  if (newVal === 1) {
    await kv.expire(key, RATE_LIMIT_WINDOW);
  }
}

// --- Session management ---

export async function createSession(): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await kv.set(`paranormnl:admin:session:${token}`, { expires: new Date(Date.now() + SESSION_TTL * 1000).toISOString() }, { ex: SESSION_TTL });
  return token;
}

export async function validateSession(token: string): Promise<boolean> {
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return false;
  const session = await kv.get(`paranormnl:admin:session:${token}`);
  return session !== null;
}

export async function deleteSession(token: string): Promise<void> {
  if (token && /^[0-9a-f]{64}$/.test(token)) {
    await kv.del(`paranormnl:admin:session:${token}`);
  }
}

// --- Cookie helpers ---

export function setSessionCookie(res: VercelResponse, token: string): void {
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL}`);
}

export function clearSessionCookie(res: VercelResponse): void {
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`);
}

export function getSessionToken(req: VercelRequest): string {
  const cookies = req.headers.cookie ?? "";
  const match = cookies.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  return match ? match[1] : "";
}

// --- Auth middleware helper ---

export async function requireAuth(req: VercelRequest, res: VercelResponse): Promise<boolean> {
  const token = getSessionToken(req);
  const valid = await validateSession(token);
  if (!valid) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}
