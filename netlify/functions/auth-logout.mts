import { logout, verifyRequestOrigin } from "@netlify/identity";
import {
  authJson,
  authFailure,
  cookieValue,
  secureCookie,
  SESSION_COOKIE,
  CHALLENGE_COOKIE,
  hashToken,
  database,
} from "../../server/auth";
export default async (req: Request) => {
  if (req.method !== "POST")
    return authJson({ error: "Method not allowed" }, 405);
  try {
    verifyRequestOrigin(req);
    const token = cookieValue(req, SESSION_COOKIE);
    if (token)
      await database()
        .sql`DELETE FROM tm_sessions WHERE token_hash=${hashToken(token)}`;
    if (cookieValue(req, "nf_jwt")) await logout();
    return authJson({ ok: true }, 200, [
      secureCookie(SESSION_COOKIE, "", 0),
      secureCookie(CHALLENGE_COOKIE, "", 0),
    ]);
  } catch (e) {
    return authFailure(e);
  }
};
