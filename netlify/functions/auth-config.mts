import { env, authJson } from "../../server/auth";
export default async (req: Request) => {
  if (req.method !== "GET")
    return authJson({ error: "Method not allowed" }, 405);
  return authJson({
    telegram: Boolean(
      env("TELEGRAM_BOT_TOKEN") &&
      env("TELEGRAM_BOT_USERNAME") &&
      env("TELEGRAM_WEBHOOK_SECRET"),
    ),
  });
};
