import { useEffect, useRef, useState } from "react";
import {
  login,
  signup,
  oauthLogin,
  getSettings,
  requestPasswordRecovery,
  type Settings,
} from "@netlify/identity";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { useAuth } from "../auth";
import { ThemeToggle } from "../theme";
type Mode = "login" | "signup" | "forgot";
const friendly = (e: unknown) => {
  const m = e instanceof Error ? e.message : String(e);
  if (/invalid.*credentials|invalid.*password/i.test(m))
    return "Email yoki parol noto‘g‘ri. Tekshirib qayta kiriting.";
  if (/not.*confirm/i.test(m))
    return "Emailingizdagi tasdiqlash havolasini oching, keyin qayta kiring.";
  if (/already.*register|already.*exist/i.test(m))
    return "Bu email bilan hisob mavjud. Kirish yoki parolni tiklashni tanlang.";
  if (/rate|too many/i.test(m))
    return "Urinishlar ko‘payib ketdi. Birozdan keyin qayta urinib ko‘ring.";
  return m;
};
export default function AuthPage() {
  const { refresh, callback, finishCallback, authError, user } = useAuth();
  const [mode, setMode] = useState<Mode>("login"),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [busy, setBusy] = useState(""),
    [settings, setSettings] = useState<Settings | null>(null),
    [configLoading, setConfigLoading] = useState(true),
    [telegramReady, setTelegramReady] = useState(false),
    [show, setShow] = useState(false),
    [password, setPassword] = useState(""),
    [telegram, setTelegram] = useState<{
      url: string;
      code: string;
      expiresAt: string;
    } | null>(null),
    [remaining, setRemaining] = useState(0);
  const requestId = useRef(0);
  useEffect(() => {
    let active = true;
    Promise.allSettled([
      getSettings(),
      fetch("/.netlify/functions/auth-config").then((r) => r.json()),
    ]).then(([identity, bot]) => {
      if (!active) return;
      if (identity.status === "fulfilled") setSettings(identity.value);
      if (bot.status === "fulfilled") setTelegramReady(!!bot.value.telegram);
      setConfigLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!telegram) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      if (cancelled) return;
      const seconds = Math.max(
        0,
        Math.ceil((Date.parse(telegram!.expiresAt) - Date.now()) / 1000),
      );
      setRemaining(seconds);
      if (!seconds) {
        setError("Tasdiqlash vaqti tugadi. Yangi havola oching.");
        setTelegram(null);
        return;
      }
      try {
        const r = await fetch("/.netlify/functions/telegram-status", {
          method: "POST",
        });
        const j = await r.json();
        if (cancelled) return;
        if (!r.ok) throw Error(j.error);
        if (j.status === "authenticated") {
          await refresh();
          if (!cancelled) location.hash = "dashboard";
          return;
        }
        timer = setTimeout(poll, 2500);
      } catch (e) {
        if (!cancelled) {
          setError(friendly(e));
          setTelegram(null);
        }
      }
    }
    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [telegram, refresh]);
  const change = (next: Mode) => {
    requestId.current++;
    setMode(next);
    setError("");
    setSuccess("");
    setPassword("");
    setTelegram(null);
  };
  const title = callback
    ? "Yangi parol yarating."
    : mode === "signup"
      ? "Kelajagingizga birinchi qadam."
      : mode === "forgot"
        ? "Hisobingizga qaytamiz."
        : "Yana birga o‘rganamiz.";
  const emailEnabled = !!settings?.providers.email;
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const form = new FormData(e.currentTarget),
      email = String(form.get("email") || "").trim();
    if (
      (mode === "signup" || callback) &&
      password !== String(form.get("confirm"))
    )
      return setError("Parollar bir xil bo‘lishi kerak.");
    setBusy("email");
    const id = ++requestId.current;
    try {
      if (callback) await finishCallback(password);
      else if (mode === "forgot") {
        await requestPasswordRecovery(email);
        if (id === requestId.current)
          setSuccess(
            "Agar bu email bilan hisob mavjud bo‘lsa, tiklash havolasi yuboriladi. Emailingizni tekshiring.",
          );
      } else if (mode === "signup") {
        if (settings?.disableSignup)
          throw Error("Yangi hisob yaratish vaqtincha yopiq.");
        await signup(email, password, {
          full_name: String(form.get("name") || "").trim(),
        });
        if (settings?.autoconfirm) {
          await login(email, password);
          await refresh();
          location.hash = "dashboard";
        } else if (id === requestId.current)
          setSuccess(
            "Tasdiqlash havolasi yuborildi! Emailingizni oching va hisobingizni tasdiqlang.",
          );
      } else {
        await login(email, password);
        await refresh();
        location.hash = "dashboard";
      }
    } catch (e) {
      if (id === requestId.current) setError(friendly(e));
    } finally {
      setBusy("");
    }
  };
  async function startTelegram() {
    setBusy("telegram");
    setError("");
    try {
      const r = await fetch("/.netlify/functions/telegram-start", {
        method: "POST",
      });
      const j = await r.json();
      if (!r.ok) throw Error(j.error);
      setTelegram(j);
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy("");
    }
  }
  return (
    <div className="auth-v3">
      <div className="auth-top">
        <a href="#dashboard" className="auth-brand">
          <img src="/assets/testme-logo.png" alt="" />
          <b>
            test<span>me.</span>
          </b>
        </a>
        <ThemeToggle />
      </div>
      <div className="auth-content">
        <section className="auth-visual">
          <div className="auth-overline">
            <span /> O‘RGANISHNING YANGI TOMONI
          </div>
          <h1>
            Kichik qadam.
            <br />
            Katta <span>imkoniyat.</span>
          </h1>
          <p>
            Bugungi qiziqishingiz — ertangi kuchingiz.
            <br />
            O‘rganing, mashq qiling va o‘zingizni kashf eting.
          </p>
          <div className="knowledge-art" aria-hidden="true">
            <div className="knowledge-grid" />
            <div className="knowledge-ring one" />
            <div className="knowledge-ring two" />
            <div className="knowledge-core">
              <img src="/assets/testme-logo.png" alt="" />
            </div>
            <div className="knowledge-chip chip-math">
              <span>∑</span>
              <div>
                <b>Matematika</b>
                <small>Har bir masalada yangi yechim</small>
              </div>
            </div>
            <div className="knowledge-chip chip-physics">
              <span>⚛</span>
              <div>
                <b>Fizika</b>
                <small>Olamni kashf eting</small>
              </div>
            </div>
            <div className="knowledge-chip chip-english">
              <span>Aa</span>
              <div>
                <b>English</b>
                <small>Yangi dunyoga yo‘l</small>
              </div>
            </div>
            <span className="knowledge-spark">✦</span>
          </div>
          <div className="auth-values">
            <span>
              <CheckCircle2 size={15} /> O‘z sur’atingizda
            </span>
            <span>
              <CheckCircle2 size={15} /> Uchta yo‘nalish
            </span>
            <span>
              <CheckCircle2 size={15} /> Bir platforma
            </span>
          </div>
        </section>
        <section className="auth-form-area">
          <a href="#dashboard" className="auth-back">
            <ArrowLeft size={15} /> Bosh sahifa
          </a>
          <div className="auth-form-card">
            <span className="auth-welcome">
              <Sparkles size={15} /> TESTME’GA XUSH KELIBSIZ
            </span>
            <h2>{title}</h2>
            <p className="auth-subtitle">
              {callback
                ? "Hisobingiz uchun yangi, mustahkam parol tanlang."
                : mode === "forgot"
                  ? "Tiklash havolasini olish uchun emailingizni kiriting."
                  : "Barcha bilimlaringiz, maqsadlaringiz va natijalaringiz bir joyda."}
            </p>
            {user && !callback && (
              <a href="#dashboard" className="btn primary wide">
                Hisobingizga qaytish <ArrowRight size={16} />
              </a>
            )}
            {!callback && (
              <div className="auth-segments" aria-label="Kirish turi">
                <button
                  type="button"
                  disabled={!!busy}
                  className={mode !== "signup" ? "selected" : ""}
                  onClick={() => change("login")}
                >
                  Kirish
                </button>
                <button
                  type="button"
                  disabled={!!busy || !!settings?.disableSignup}
                  className={mode === "signup" ? "selected" : ""}
                  onClick={() => change("signup")}
                >
                  Ro‘yxatdan o‘tish
                </button>
              </div>
            )}
            {!callback && mode !== "forgot" && (
              <>
                <div className="social-login">
                  <button
                    type="button"
                    className="provider-button"
                    disabled={!!busy || !settings?.providers.google}
                    onClick={async () => {
                      setError("");
                      setBusy("google");
                      try {
                        await oauthLogin("google");
                      } catch (e) {
                        setError(friendly(e));
                        setBusy("");
                      }
                    }}
                  >
                    <svg
                      width="19"
                      height="19"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        fill="currentColor"
                        d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36ZM12 22c2.7 0 4.96-.9 6.62-2.42l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.6-4.12H3.06v2.6A10 10 0 0 0 12 22ZM6.4 13.91a6 6 0 0 1 0-3.82v-2.6H3.06a10 10 0 0 0 0 9.02l3.34-2.6ZM12 5.97c1.47 0 2.79.51 3.83 1.51l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.94 5.49l3.34 2.6A5.99 5.99 0 0 1 12 5.97Z"
                      />
                    </svg>
                    Google
                  </button>
                  <button
                    type="button"
                    className="provider-button telegram"
                    disabled={!!busy || !telegramReady}
                    onClick={() => void startTelegram()}
                  >
                    {busy === "telegram" ? (
                      <Loader2 className="spin" size={19} />
                    ) : (
                      <Send size={19} />
                    )}
                    Telegram
                  </button>
                </div>
                {!configLoading &&
                  (!settings?.providers.google || !telegramReady) && (
                    <p className="provider-note">
                      Xira tugma — ushbu kirish usuli hozircha ulanmagan.
                    </p>
                  )}
                <div className="auth-divider">
                  <span />
                  yoki email orqali
                  <span />
                </div>
              </>
            )}
            {configLoading && (
              <p className="auth-status">
                <Loader2 className="spin" size={16} /> Kirish usullari
                yuklanmoqda…
              </p>
            )}
            {telegram && (
              <div className="telegram-confirm">
                <div className="row between">
                  <b>Telegram’da tasdiqlang</b>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Tasdiqlashni yopish"
                    onClick={() => setTelegram(null)}
                  >
                    <X size={16} />
                  </button>
                </div>
                <p>Botdagi kod shu kod bilan mos kelishi kerak:</p>
                <strong>{telegram.code}</strong>
                <a
                  href={telegram.url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn primary wide"
                >
                  @testmeauthbot ni ochish <ArrowRight size={16} />
                </a>
                <small>
                  Tasdiqlangach avtomatik kirasiz · {Math.floor(remaining / 60)}
                  :{String(remaining % 60).padStart(2, "0")}
                </small>
              </div>
            )}
            <form className="auth-fields" onSubmit={submit}>
              {mode === "signup" && !callback && (
                <label>
                  Ism va familiya
                  <div className="input-shell">
                    <UserRound size={17} />
                    <input
                      name="name"
                      autoComplete="name"
                      required
                      maxLength={100}
                      placeholder="Ismingizni kiriting"
                      disabled={!!busy}
                    />
                  </div>
                </label>
              )}
              {!callback && (
                <label>
                  Email manzil
                  <div className="input-shell">
                    <Mail size={17} />
                    <input
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="siz@example.com"
                      disabled={!!busy}
                    />
                  </div>
                </label>
              )}
              {(mode !== "forgot" || callback) && (
                <label htmlFor="auth-password">
                  <span className="row between">
                    <span>{callback ? "Yangi parol" : "Parol"}</span>
                    {mode === "login" && !callback && (
                      <button
                        type="button"
                        className="forgot-link"
                        disabled={!!busy}
                        onClick={() => change("forgot")}
                      >
                        Unutdingizmi?
                      </button>
                    )}
                  </span>
                  <div className="input-shell">
                    <LockKeyhole size={17} />
                    <input
                      id="auth-password"
                      name="password"
                      type={show ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={mode === "login" && !callback ? 1 : 8}
                      maxLength={128}
                      autoComplete={
                        mode === "login" && !callback
                          ? "current-password"
                          : "new-password"
                      }
                      required
                      placeholder={
                        mode === "signup" || callback
                          ? "Kamida 8 ta belgi"
                          : "Parolingizni kiriting"
                      }
                      disabled={!!busy}
                    />
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={
                        show ? "Parolni yashirish" : "Parolni ko‘rsatish"
                      }
                      onClick={() => setShow(!show)}
                    >
                      {show ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </label>
              )}
              {(mode === "signup" || callback) && (
                <>
                  <div className="password-strength">
                    <div>
                      <span
                        style={{
                          width: `${Math.min(100, (password.length / 12) * 100)}%`,
                        }}
                      />
                    </div>
                    <small>
                      Kamida 8 ta belgi. Harf, raqam va belgi ishlatish tavsiya
                      etiladi.
                    </small>
                  </div>
                  <label>
                    Parolni tasdiqlang
                    <div className="input-shell">
                      <ShieldCheck size={17} />
                      <input
                        name="confirm"
                        type={show ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        minLength={8}
                        placeholder="Parolni qayta kiriting"
                        disabled={!!busy}
                      />
                    </div>
                  </label>
                </>
              )}
              {(error || authError) && (
                <div className="auth-feedback error" role="alert">
                  {error || authError}
                </div>
              )}
              {success && (
                <div className="auth-feedback success" role="status">
                  <CheckCircle2 size={18} />
                  {success}
                </div>
              )}
              {!configLoading && !emailEnabled && !callback && (
                <div className="auth-feedback" role="status">
                  Email orqali kirish hozircha ulanmagan. Xizmat yoqilgach shu
                  yerda hisob yaratishingiz mumkin.
                </div>
              )}
              <button
                className="auth-submit"
                disabled={!!busy || (!callback && !emailEnabled)}
              >
                {busy === "email" ? (
                  <>
                    <Loader2 size={18} className="spin" /> Bir oz kuting…
                  </>
                ) : (
                  <>
                    {callback
                      ? "Yangi parolni saqlash"
                      : mode === "signup"
                        ? "Hisob yaratish"
                        : mode === "forgot"
                          ? "Tiklash havolasini yuborish"
                          : "Hisobga kirish"}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
            {mode === "forgot" && (
              <button
                type="button"
                className="auth-return"
                onClick={() => change("login")}
              >
                <ArrowLeft size={14} /> Kirishga qaytish
              </button>
            )}
            <div className="auth-trust">
              <ShieldCheck size={14} />
              <span>Shaxsiy o‘quv maydoningizga xavfsiz kirish</span>
            </div>
          </div>
          <div className="auth-bottom-note">
            © {new Date().getFullYear()} TestMe{" "}
            <span>Bilimingizning yangi orbitasi.</span>
          </div>
        </section>
      </div>
    </div>
  );
}
