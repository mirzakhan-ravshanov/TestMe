import type { Config } from "@netlify/functions";
import { randomInt } from "node:crypto";
import {
  authJson,
  authFailure,
  sameOrigin,
  env,
  randomToken,
  hashToken,
  database,
  secureCookie,
  CHALLENGE_COOKIE,
  CHALLENGE_SECONDS,
  HttpError,
} from "../../server/auth";
export default async (req: Request) => {
  if (req.method !== "POST")
    return authJson({ error: "Method not allowed" }, 405);
  try {
    sameOrigin(req);
    const bot = env("TELEGRAM_BOT_USERNAME");
    if (
      !bot ||
      !/^[A-Za-z0-9_]{5,32}$/.test(bot) ||
      !env("TELEGRAM_BOT_TOKEN") ||
      !env("TELEGRAM_WEBHOOK_SECRET")
    )
      throw new HttpError(
        503,
        "Telegram orqali kirish hozircha sozlanmagan. Email orqali kiring.",
      );
    const challenge = randomToken(),
      browser = randomToken(),
      code = String(randomInt(100000, 1000000));
    const expiry = new Date(
      Date.now() + CHALLENGE_SECONDS * 1000,
    ).toISOString();
    await database()
      .sql`INSERT INTO tm_telegram_challenges(token_hash,browser_hash,confirmation_code,expires_at) VALUES (${hashToken(challenge)},${hashToken(browser)},${code},${expiry})`;
    return authJson(
      {
        url: `https://t.me/${bot}?start=${challenge}`,
        code,
        expiresAt: expiry,
      },
      200,
      [
        secureCookie(
          CHALLENGE_COOKIE,
          `${challenge}.${browser}`,
          CHALLENGE_SECONDS,
        ),
      ],
    );
  } catch (e) {
    return authFailure(e);
  }
};
export const config: Config = {
  rateLimit: {
    action: "rate_limit",
    aggregateBy: ["ip", "domain"],
    windowLimit: 10,
    windowSize: 60,
  },
};
