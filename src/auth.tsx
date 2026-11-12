import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { handleAuthCallback, logout, acceptInvite, updateUser } from "@netlify/identity";
type User = {
  id: string;
  name: string;
  email?: string;
  role: "student" | "teacher" | "admin";
  proUntil?: string;
};
const Auth = createContext<{
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  callback: {type:string;token?:string}|null;
  finishCallback:(password:string)=>Promise<void>;
}>({
  user: null,
  loading: true,
  refresh: async () => {},
  signOut: async () => {},
  callback:null,finishCallback:async()=>{},
});
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [loading, setLoading] = useState(true);
  const [callback,setCallback]=useState<{type:string;token?:string}|null>(null);
  async function refresh() {
    try {
      const r = await fetch("/.netlify/functions/auth-me");
      const j = await r.json();
      setUser(j.user || null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    handleAuthCallback()
      .then((r) => {if(r?.type==='invite'||r?.type==='recovery'){setCallback({type:r.type,token:r.token});location.hash='auth'}return refresh()})
      .catch(() => refresh());
  }, []);
  async function finishCallback(password:string){if(callback?.type==='invite'&&callback.token)await acceptInvite(callback.token,password);else await updateUser({password});setCallback(null);await refresh();location.hash='dashboard'}
  async function signOut() {
    await fetch("/.netlify/functions/auth-logout", { method: "POST" });
    await logout().catch(() => {});
    setUser(null);
  }
  return (
    <Auth.Provider value={{ user, loading, refresh, signOut,callback,finishCallback }}>
      {children}
    </Auth.Provider>
  );
}
export const useAuth = () => useContext(Auth);
