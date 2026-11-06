import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { db, globalUsers, type GlobalCommandUser } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import type { Socket } from "socket.io";

const scrypt = promisify(scryptCallback);
const COOKIE = "santi_global_session";
const ISSUER = "santi-global";
const SESSION_SECONDS = 3600;
export type Role = GlobalCommandUser["role"];
export type SessionUser = Pick<GlobalCommandUser, "id" | "username" | "role" | "sessionVersion">;

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_SECRET debe tener al menos 32 caracteres.");
  return value;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = await scrypt(password, salt, 64) as Buffer;
  return `${salt}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [salt, hex] = encoded.split(":");
  if (!salt || !hex) return false;
  const hash = await scrypt(password, salt, 64) as Buffer;
  const stored = Buffer.from(hex, "hex");
  return stored.length === hash.length && timingSafeEqual(hash, stored);
}

export function publicUser(user: SessionUser) {
  return { id: user.id, username: user.username, role: user.role };
}

export function createSession(res: Response, user: SessionUser): void {
  const token = jwt.sign({ ver: user.sessionVersion }, secret(), {
    algorithm: "HS256", subject: String(user.id), issuer: ISSUER, audience: ISSUER,
    expiresIn: SESSION_SECONDS,
  });
  // Retire the old narrower cookie on login without invalidating existing
  // sessions. /api scope also protects the legacy Nexus report endpoints.
  res.cookie(COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "strict", path: "/api", maxAge: SESSION_SECONDS * 1000,
  });
  res.clearCookie(COOKIE, { path: "/api/global", httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" });
}

export function clearSession(res: Response): void {
  res.clearCookie(COOKIE, { path: "/api/global", httpOnly: true,
    secure: process.env.NODE_ENV === "production", sameSite: "strict" });
  res.clearCookie(COOKIE, { path: "/api", httpOnly: true,
    secure: process.env.NODE_ENV === "production", sameSite: "strict" });
}

function readCookie(raw?: string): string | undefined {
  return raw?.split(";").map(part => part.trim()).find(part => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
}

export async function authenticateCookie(raw?: string): Promise<SessionUser> {
  const token = readCookie(raw);
  if (!token) throw new Error("Sin sesión.");
  const payload = jwt.verify(token, secret(), {
    algorithms: ["HS256"], issuer: ISSUER, audience: ISSUER,
  });
  if (typeof payload === "string" || !payload.sub || !/^\d+$/.test(payload.sub)) throw new Error("Sesión inválida.");
  const [user] = await db.select().from(globalUsers).where(eq(globalUsers.id, Number(payload.sub))).limit(1);
  if (!user || payload.ver !== user.sessionVersion) throw new Error("Sesión revocada.");
  return user;
}

export async function requireSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.locals.user = await authenticateCookie(req.headers.cookie);
    next();
  } catch {
    res.status(401).json({ error: "Inicia sesión para acceder al Centro Global." });
  }
}

export function requireRole(...roles: Role[]) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const role = (res.locals.user as SessionUser).role;
    if (!roles.includes(role) && !(role === "analista" && roles.includes("oficial"))) {
      res.status(403).json({ error: "Tu rol no tiene permiso para esta acción." });
      return;
    }
    next();
  };
}

// A revoked session also closes sockets; no request-time role comes from the JWT.
const activeSockets = new Map<number, Set<Socket>>();
let distributedDisconnect: ((userId: number) => void) | undefined;
export function setDistributedDisconnect(handler: (userId: number) => void) { distributedDisconnect = handler; }
export function trackSocket(userId: number, socket: Socket) {
  const sockets = activeSockets.get(userId) ?? new Set<Socket>();
  sockets.add(socket);
  activeSockets.set(userId, sockets);
  socket.once("disconnect", () => {
    sockets.delete(socket);
    if (!sockets.size) activeSockets.delete(userId);
  });
}
export function disconnectUser(userId: number) {
  for (const socket of activeSockets.get(userId) ?? []) socket.disconnect(true);
  distributedDisconnect?.(userId);
}
export async function revokeSession(userId: number) {
  await db.update(globalUsers).set({ sessionVersion: sql`${globalUsers.sessionVersion} + 1` }).where(eq(globalUsers.id, userId));
  disconnectUser(userId);
}

// Cookie-authenticated writes must originate from this application. Allow absent
// Origin only for non-browser clients with no cross-site Fetch metadata.
export function sameOrigin(req: Request, res: Response, next: NextFunction): void {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) { next(); return; }
  const origin = req.headers.origin;
  const forwardedHost = req.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || req.get("host");
  let valid = req.get("sec-fetch-site") !== "cross-site";
  try { if (origin) valid &&= new URL(origin).host === host; } catch { valid = false; }
  if (!valid) { res.status(403).json({ error: "Origen no permitido." }); return; }
  next();
}
