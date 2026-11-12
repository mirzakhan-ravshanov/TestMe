import { useEffect, useState } from "react";
import { login, signup, oauthLogin, getSettings, requestPasswordRecovery } from "@netlify/identity";
import { useAuth } from "../auth";
export default function AuthPage() {
  const [mode, setMode] = useState("login"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [settings, setSettings] = useState<any>(null),
    [telegram, setTelegram] = useState<any>(null);
  const { refresh,callback,finishCallback } = useAuth();
  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch(() =>
        setError(
          "Kirish xizmati hali sozlanmagan. Administrator Netlify Identity xizmatini yoqishi kerak.",
        ),
      );
  }, []);
  useEffect(() => {
    if (!telegram) return;
    const t = setInterval(async () => {
      try {
      const r = await fetch("/.netlify/functions/telegram-status", {
        method: "POST",
      });
      const j = await r.json();
      if (j.status === "authenticated") {
        clearInterval(t);
        await refresh();
        location.hash = "dashboard";
      } else if (j.error) {
        clearInterval(t);
        setError(j.error);
      }
      } catch { clearInterval(t); setError('Telegram holatini tekshirib bo‘lmadi. Qaytadan urinib ko‘ring.'); }
    }, 2500);
    return () => clearInterval(t);
  }, [telegram]);
  return (
    <div className="auth-layout">
      <section className="auth-story">
        <a href="#dashboard" className="brand">
          testme.
        </a>
        <h1>
          Bilimingizga
          <br />
          yangi orbita.
        </h1>
        <p>
          Matematika, fizika va ingliz tili.
          <br />
          Maqsadlaringiz sari har kuni bir qadam.
        </p>
        <img src="/assets/testme-logo.png" alt="TestMe" />
      </section>
      <section className="auth-box">
        <a href="#dashboard">← Bosh sahifa</a>
        <h1>
          {mode === "login"
            ? "Yana ko‘rishganimizdan xursandmiz."
            : "Katta maqsadlar shu yerdan boshlanadi."}
        </h1>
        <p className="muted">
          O‘rganishni davom ettirish uchun hisobingizga kiring.
        </p>
        <button
          className="btn wide"
          disabled={!settings?.providers?.google}
          onClick={() => oauthLogin("google")}
        >
          Google orqali davom etish
        </button>
        <button
          className="btn wide"
          onClick={async () => {
            setError("");
            try {
              const r = await fetch("/.netlify/functions/telegram-start", {
                method: "POST",
              });
              const j = await r.json();
              if (!r.ok) throw Error(j.error);
              setTelegram(j);
            } catch (e: any) {
              setError(e.message);
            }
          }}
        >
          Telegram bot orqali kirish
        </button>
        {telegram && (
          <div className="notice">
            <p>
              Tasdiqlash kodi: <b>{telegram.code}</b>
            </p>
            <a href={telegram.url} target="_blank" rel="noreferrer">
              @testmeauthbot ni ochish ↗
            </a>
            <p>Botda tasdiqlang va shu sahifaga qayting.</p>
          </div>
        )}
        <div className="divider">yoki email orqali</div>
        <form
          className="form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const f = new FormData(e.currentTarget);
            try {
              if(callback){await finishCallback(String(f.get('password')))}else if(mode==='forgot'){await requestPasswordRecovery(String(f.get('email')));setError('Parolni tiklash havolasi emailingizga yuborildi.')}else if (mode === "signup") {
                if(settings?.disableSignup)throw Error('Ro‘yxatdan o‘tish vaqtincha yopilgan.');
                await signup(
                  String(f.get("email")),
                  String(f.get("password")),
                  { full_name: String(f.get("name")) },
                );
                setError(
                  "Email manzilingizga kelgan tasdiqlash havolasini oching.",
                );
              } else {
                await login(String(f.get("email")), String(f.get("password")));
                await refresh();
                location.hash = "dashboard";
              }
            } catch (e: any) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {mode === "signup" && (
            <label className="field">
              Ismingiz
              <input name="name" required maxLength={100} />
            </label>
          )}
          {!callback&&<label className="field">
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>}
          {mode!=='forgot'&&<label className="field">
            Parol
            <input
              name="password"
              type="password"
              minLength={8}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              required
            />
          </label>}
          {error && (
            <p role="status" className="notice">
              {error}
            </p>
          )}
          <button className="btn primary wide" disabled={busy || !settings}>
            {busy
              ? "Kutilmoqda…"
              : callback?'Yangi parolni saqlash':mode==='forgot'?'Tiklash havolasini yuborish':mode === "login"
                ? "Kirish"
                : "Hisob yaratish"}
          </button>
        </form>
        <button className="text-button" onClick={()=>setMode('forgot')}>Parolni unutdingizmi?</button>
        <button
          className="text-button"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
        >
          {mode === "login"
            ? "Hisobingiz yo‘qmi? Ro‘yxatdan o‘ting"
            : "Hisobingiz bormi? Kirish"}
        </button>
      </section>
    </div>
  );
}
