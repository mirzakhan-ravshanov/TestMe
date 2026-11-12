import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { getDatabase } from "@netlify/database";
import { getUser } from "@netlify/identity";

export interface AppUser {
  id: string;
  name: string;
  email?: string;
  role: "student" | "teacher" | "admin";
  proUntil?: string;
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function env(name: string): string | undefined {
  return typeof Netlify !== "undefined"
    ? Netlify.env.get(name)
    : process.env[name];
}

let cachedDatabase: ReturnType<typeof getDatabase> | undefined;
export function database() {
  if (cachedDatabase) return cachedDatabase;
  const connectionString = env("NETLIFY_DB_URL");
  cachedDatabase = connectionString ? getDatabase({ connectionString }) : getDatabase();
  return cachedDatabase;
}

export const SESSION_COOKIE = "__Host-tm_session";
export const CHALLENGE_COOKIE = "__Host-tm_challenge";
export const SESSION_SECONDS = 60 * 60 * 24 * 7;
export const CHALLENGE_SECONDS = 60 * 5;
export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
export function randomToken() {
  return randomBytes(32).toString("base64url");
}
export function safeEqual(a: string, b: string) {
  const left = Buffer.from(a),
    right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
export function cookieValue(req: Request, name: string): string | null {
  const part = (req.headers.get("cookie") || "")
    .split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(`${name}=`));
  return part ? part.slice(name.length + 1) : null;
}
export function secureCookie(name: string, value: string, seconds: number) {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${seconds}`;
}
export function sameOrigin(req: Request) {
  if (req.headers.get("origin") !== new URL(req.url).origin)
    throw new HttpError(403, "So‘rov manbasi tasdiqlanmadi.");
}
export function authJson(data: unknown, status = 200, cookies: string[] = []) {
  const headers = new Headers({
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  for (const cookie of cookies) headers.append("Set-Cookie", cookie);
  return new Response(JSON.stringify(data), { status, headers });
}
export function authFailure(error: unknown) {
  if (error instanceof HttpError)
    return authJson({ error: error.message }, error.status);
  console.error(
    "Authentication operation failed",
    error instanceof Error ? error.name : "UnknownError",
  );
  return authJson(
    { error: "Kirish xizmati hozircha mavjud emas. Keyinroq urinib ko‘ring." },
    503,
  );
}
type UserRow = {
  id: string;
  name: string;
  email: string | null;
  role: AppUser["role"];
  pro_until: Date | string | null;
  blocked: boolean;
};
export function publicUser(row: UserRow): AppUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email || undefined,
    role: row.role,
    proUntil: row.pro_until ? new Date(row.pro_until).toISOString() : undefined,
  };
}

/** Identity verifies the signed session; all app permissions are then read afresh from our database. */
export async function authenticate(req: Request): Promise<AppUser | null> {
  const token = cookieValue(req, SESSION_COOKIE);
  if (token && /^[A-Za-z0-9_-]{43}$/.test(token)) {
    const rows = await database()
      .sql<UserRow>`SELECT u.* FROM tm_sessions s JOIN tm_users u ON u.id=s.user_id WHERE s.token_hash=${hashToken(token)} AND s.expires_at > now()`;
    if (rows[0]) return rows[0].blocked ? null : publicUser(rows[0]);
  }
  if (!cookieValue(req, "nf_jwt") && !cookieValue(req, "nf_refresh"))
    return null;
  const identity = await getUser();
  if (!identity) return null;
  const name = (
    identity.name ||
    identity.email?.split("@")[0] ||
    "O‘quvchi"
  ).slice(0, 100);
  const bootstrapAdmin = env("ADMIN_IDENTITY_ID") === identity.id;
  const role = bootstrapAdmin ? "admin" : "student";
  // Role is not copied from editable metadata or client input. Existing roles are preserved.
  const rows = await database()
    .sql<UserRow>`INSERT INTO tm_users (id,identity_id,name,email,role)
    VALUES (${`identity:${identity.id}`},${identity.id},${name},${identity.email || null},${role})
    ON CONFLICT (identity_id) DO UPDATE SET name=EXCLUDED.name,email=EXCLUDED.email
    RETURNING *`;
  const row = rows[0];
  if (!row || row.blocked) return null;
  // Explicit bootstrap ID is required; the first visitor never becomes an administrator.
  if (bootstrapAdmin && row.role !== "admin") {
    await database().sql`UPDATE tm_users SET role='admin' WHERE id=${row.id}`;
    row.role = "admin";
  }
  return publicUser(row);
}

export async function requireUser(req: Request) {
  const user = await authenticate(req);
  if (!user) throw new HttpError(401, "Davom etish uchun hisobingizga kiring.");
  return user;
}
