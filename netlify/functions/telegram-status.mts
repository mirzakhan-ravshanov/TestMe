import { randomUUID } from "node:crypto";
import {
  authJson,
  authFailure,
  sameOrigin,
  database,
  cookieValue,
  hashToken,
  randomToken,
  secureCookie,
  SESSION_COOKIE,
  CHALLENGE_COOKIE,
  SESSION_SECONDS,
  publicUser,
  HttpError,
} from "../../server/auth";
export default async (req: Request) => {
  if (req.method !== "POST")
    return authJson({ error: "Method not allowed" }, 405);
  try {
    sameOrigin(req);
    const cookie = cookieValue(req, CHALLENGE_COOKIE) || "";
    if (!/^[A-Za-z0-9_-]{43}\.[A-Za-z0-9_-]{43}$/.test(cookie))
      throw new HttpError(401, "Kirish havolasini qaytadan yarating.");
    const [challenge, browser] = cookie.split(".");
    const client = await database().pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
        "SELECT * FROM tm_telegram_challenges WHERE token_hash=$1 AND browser_hash=$2 FOR UPDATE",
        [hashToken(challenge), hashToken(browser)],
      );
      const row = rows[0];
      if (
        !row ||
        row.consumed_at ||
        new Date(row.expires_at).getTime() < Date.now()
      )
        throw new HttpError(
          410,
          "Kirish havolasi eskirgan. Qaytadan urinib ko‘ring.",
        );
      if (!row.confirmed_at || !row.telegram_id) {
        await client.query("COMMIT");
        return authJson({ status: "pending" });
      }
      const result = await client.query(
        "INSERT INTO tm_users(id,telegram_id,name) VALUES ($1,$2,$3) ON CONFLICT(telegram_id) DO UPDATE SET name=EXCLUDED.name RETURNING *",
        [`telegram:${randomUUID()}`, row.telegram_id, row.telegram_name],
      );
      const user = result.rows[0];
      if (user.blocked)
        throw new HttpError(403, "Hisobingiz vaqtincha cheklangan.");
      const session = randomToken();
      await client.query(
        "INSERT INTO tm_sessions(token_hash,user_id,expires_at) VALUES ($1,$2,$3)",
        [
          hashToken(session),
          user.id,
          new Date(Date.now() + SESSION_SECONDS * 1000),
        ],
      );
      await client.query(
        "UPDATE tm_telegram_challenges SET consumed_at=now() WHERE token_hash=$1",
        [hashToken(challenge)],
      );
      await client.query("COMMIT");
      return authJson(
        { status: "authenticated", user: publicUser(user) },
        200,
        [
          secureCookie(SESSION_COOKIE, session, SESSION_SECONDS),
          secureCookie(CHALLENGE_COOKIE, "", 0),
        ],
      );
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    return authFailure(e);
  }
};
