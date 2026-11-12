import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  handleAuthCallback,
  logout,
  acceptInvite,
  updateUser,
  getUser,
} from "@netlify/identity";
export type User = {
  id: string;
  name: string;
  email?: string;
  role: "student" | "teacher" | "admin";
  proUntil?: string;
};
type Callback = { type: string; token?: string };
const Auth = createContext<{
  user: User | null;
  loading: boolean;
  authError: string;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  callback: Callback | null;
  finishCallback: (password: string) => Promise<void>;
}>({
  user: null,
  loading: true,
  authError: "",
  refresh: async () => {},
  signOut: async () => {},
  callback: null,
  finishCallback: async () => {},
});
// Callback tokens are single-use. React StrictMode must not exchange them twice.
let callbackPromise: ReturnType<typeof handleAuthCallback> | undefined;
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [loading, setLoading] = useState(true),
    [authError, setAuthError] = useState(""),
    [callback, setCallback] = useState<Callback | null>(null);
  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/.netlify/functions/auth-me", {
        credentials: "same-origin",
        cache: "no-store",
      });
      const j = await r.json();
      if (!r.ok) throw Error(j.error || "Hisob ma’lumotlari yuklanmadi.");
      setUser(j.user || null);
      setAuthError("");
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Server bilan bog‘lanib bo‘lmadi.";
      setAuthError(message);
      throw Error(message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    let active = true;
    callbackPromise ??= handleAuthCallback();
    callbackPromise
      .then(async (r) => {
        if (!active) return;
        if (r?.type === "invite" || r?.type === "recovery") {
          setCallback({ type: r.type, token: r.token });
          location.hash = "auth";
        } else if (r) {
          location.hash = "dashboard";
        }
        await getUser().catch(() => null);
        await refresh();
      })
      .catch((e) => {
        if (active) {
          setAuthError(
            e.message || "Kirish havolasi eskirgan. Qaytadan urinib ko‘ring.",
          );
          setLoading(false);
          location.hash = "auth";
        }
      });
    return () => {
      active = false;
    };
  }, [refresh]);
  useEffect(() => {
    const check = () => {
      if (document.visibilityState === "visible")
        void getUser()
          .then(() => refresh())
          .catch(() => {});
    };
    document.addEventListener("visibilitychange", check);
    return () => document.removeEventListener("visibilitychange", check);
  }, [refresh]);
  async function finishCallback(password: string) {
    if (!callback) throw Error("Parolni tiklash havolasi kerak.");
    if (callback.type === "invite" && callback.token)
      await acceptInvite(callback.token, password);
    else await updateUser({ password });
    await refresh();
    setCallback(null);
    location.hash = "dashboard";
  }
  async function signOut() {
    const r = await fetch("/.netlify/functions/auth-logout", {
      method: "POST",
    });
    if (!r.ok)
      throw Error("Hisobdan chiqib bo‘lmadi. Qaytadan urinib ko‘ring.");
    await logout();
    setUser(null);
    location.hash = "auth";
  }
  return (
    <Auth.Provider
      value={{
        user,
        loading,
        refresh,
        signOut,
        callback,
        finishCallback,
        authError,
      }}
    >
      {children}
    </Auth.Provider>
  );
}
export const useAuth = () => useContext(Auth);
