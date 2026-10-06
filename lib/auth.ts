import "server-only";
import { createHash, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE = "challenge_admin";

// 환경변수 미설정 시 관리자 기능 전체 잠금
function config() {
  const pin = process.env.ADMIN_PIN?.trim();
  const secret = process.env.SESSION_SECRET?.trim() || (process.env.NODE_ENV === "production" ? undefined : "dev-secret");
  return pin && secret ? { pin, secret } : null;
}

/** 빠진 환경변수 이름 (로그인 화면 안내용) */
export function missingConfig() {
  const missing: string[] = [];
  if (!process.env.ADMIN_PIN?.trim()) missing.push("ADMIN_PIN");
  if (!process.env.SESSION_SECRET?.trim() && process.env.NODE_ENV === "production") missing.push("SESSION_SECRET");
  return missing;
}

function token(c: { pin: string; secret: string }) {
  return createHash("sha256").update(`${c.pin}:${c.secret}`).digest("hex");
}

export function checkPin(pin: string) {
  const c = config();
  if (!c) return false;
  const a = Buffer.from(pin.trim());
  const b = Buffer.from(c.pin);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function isAdmin() {
  const c = config();
  if (!c) return false;
  const jar = await cookies();
  return jar.get(COOKIE)?.value === token(c);
}

export async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("관리자 PIN이 필요합니다.");
}

export async function setAdminCookie() {
  const c = config();
  if (!c) return;
  const jar = await cookies();
  jar.set(COOKIE, token(c), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearAdminCookie() {
  (await cookies()).delete(COOKIE);
}
