import {
  authJson,
  authFailure,
  database,
  env,
  hashToken,
  safeEqual,
  HttpError,
} from "../../server/auth";

async function telegram(method: string, data: unknown) {
  const response = await fetch(
    `https://api.telegram.org/bot${env("TELEGRAM_BOT_TOKEN")}/${method}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(8000),
    },
  );
  if (!response.ok) throw new HttpError(502, "Telegram xizmati javob bermadi.");
}

export default async (req: Request) => {
  if (req.method !== "POST")
    return authJson({ error: "Method not allowed" }, 405);
  try {
    const expected = env("TELEGRAM_WEBHOOK_SECRET");
    if (
      !expected ||
      !safeEqual(
        req.headers.get("X-Telegram-Bot-Api-Secret-Token") || "",
        expected,
      )
    )
      throw new HttpError(403, "Forbidden");
    if (Number(req.headers.get("content-length") || 0) > 32768)
      throw new HttpError(413, "Payload too large");
    const body = await req.text();
    if (body.length > 32768) throw new HttpError(413, "Payload too large");
    const update = JSON.parse(body);
    const message = update.message;
    if (
      message?.chat?.type === "private" &&
      message.from?.id &&
      !message.from?.is_bot
    ) {
      const match = /^\/start(?:@[A-Za-z0-9_]+)? ([A-Za-z0-9_-]{43})$/.exec(
        message.text || "",
      );
      if (!match) return authJson({ ok: true });
      const rows = await database()
        .sql`SELECT confirmation_code FROM tm_telegram_challenges WHERE token_hash=${hashToken(match[1])} AND expires_at>now() AND confirmed_at IS NULL AND consumed_at IS NULL`;
      if (!rows[0]) return authJson({ ok: true });
      await telegram("sendMessage", {
        chat_id: message.chat.id,
        text: `TestMe hisobiga kirish.\nBrauzerdagi kod: ${rows[0].confirmation_code}\n\nKod o‘zingiz ochgan TestMe sahifasidagi kod bilan bir xil bo‘lsa, tasdiqlang. Begona odam yuborgan havolani tasdiqlamang.`,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Kirishni tasdiqlash",
                callback_data: `login:${match[1]}`,
              },
            ],
          ],
        },
      });
    }
    const callback = update.callback_query;
    if (
      callback?.from?.id &&
      !callback.from.is_bot &&
      callback.message?.chat?.type === "private" &&
      String(callback.message.chat.id) === String(callback.from.id)
    ) {
      const match = /^login:([A-Za-z0-9_-]{43})$/.exec(callback.data || "");
      if (!match) return authJson({ ok: true });
      const name =
        [callback.from.first_name, callback.from.last_name]
          .filter(Boolean)
          .join(" ")
          .slice(0, 100) || "O‘quvchi";
      const rows = await database()
        .sql`UPDATE tm_telegram_challenges SET telegram_id=${String(callback.from.id)},telegram_name=${name},confirmed_at=now() WHERE token_hash=${hashToken(match[1])} AND expires_at>now() AND confirmed_at IS NULL AND consumed_at IS NULL RETURNING token_hash`;
      await telegram("answerCallbackQuery", {
        callback_query_id: callback.id,
        text: rows.length
          ? "Tasdiqlandi. TestMe sahifasiga qayting."
          : "Havola ishlatilgan yoki eskirgan.",
      });
    }
    return authJson({ ok: true });
  } catch (e) {
    return authFailure(e);
  }
};
