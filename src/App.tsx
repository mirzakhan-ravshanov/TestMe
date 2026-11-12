import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  BookOpen,
  Target,
  Users,
  Trophy,
  Gamepad2,
  ArrowUpRight,
  ArrowRight,
  Crown,
  LogOut,
  Menu,
  Bell,
} from "lucide-react";
import { useAuth } from "./auth";
import { loadBootstrap, api } from "./api";
import AuthPage from "./pages/AuthPage";
import LearnPage from "./pages/LearnPage";
import PracticePage from "./pages/PracticePage";
import ClassPage from "./pages/ClassPage";
import AdminPage from "./pages/AdminPage";
const menu = [
  ["dashboard", "Dashboard", LayoutDashboard],
  ["learn", "Learn", BookOpen],
  ["practice", "Practice", Target],
  ["class", "Class", Users],
  ["tournament", "Tournament", Trophy],
  ["arcade", "Arcade", Gamepad2],
] as const;
export default function App() {
  const { user, loading, signOut } = useAuth();
  const [route, setRoute] = useState(location.hash.slice(1) || "dashboard"),
    [data, setData] = useState<any>({
      courses: [],
      modules: [],
      classes: [],
      results: [],
      tournaments: [],
      notifications: [],
      settings: {},
    }),
    [error, setError] = useState(""),
    [open, setOpen] = useState(false);
  const page = route.split(/[/?]/)[0];
  async function refresh() {
    try {
      setData(await loadBootstrap());
      setError("");
    } catch (e: any) {
      setError(e.message);
    }
  }
  useEffect(() => {
    const fn = () => {
      setRoute(location.hash.slice(1) || "dashboard");
      setOpen(false);
    };
    addEventListener("hashchange", fn);
    return () => removeEventListener("hashchange", fn);
  }, []);
  useEffect(() => {
    if (!loading) void refresh();
  }, [loading, user?.id]);
  if (page === "auth") return <AuthPage />;
  const props = { data, onRefresh: refresh };
  return (
    <div className="app-shell">
      <aside className={"sidebar " + (open ? "is-open" : "")}>
        <a href="#dashboard" className="brand">
          <img src="/assets/testme-logo.png" alt="TestMe" />
          <b>
            test<span>me.</span>
          </b>
        </a>
        <small className="nav-label">YOUR LEARNING SPACE</small>
        <nav>
          {menu.map(([k, n, I]) => (
            <a key={k} className={page === k ? "active" : ""} href={"#" + k}>
              <I size={20} />
              {n}
              {page === k && <i />}
            </a>
          ))}
        </nav>
        {user?.role === "admin" && (
          <a className="btn" href="#admin">
            Admin panel
          </a>
        )}
        <div className="pro-card">
          <Crown />
          <h3>
            Ko‘proq imkoniyat.
            <br />
            Kattaroq natijalar.
          </h3>
          <p>Barcha Pro kurs va testlar — bitta obunada.</p>
          <a className="btn primary" href="#pro">
            Pro bilan o‘sing ↗
          </a>
        </div>
        <small className="muted">Kichik qadamlar. Katta kelajak.</small>
      </aside>
      <div className="main-shell">
        <header>
          <button
            className="mobile-toggle btn"
            onClick={() => setOpen(!open)}
            aria-label="Menyu"
          >
            <Menu />
          </button>
          <span className="muted">
            O‘quv maydoni / <b>{page}</b>
          </span>
          <div className="row">
            {user ? (
              <>
                <button
                  className="btn"
                  onClick={() =>
                    alert(
                      data.notifications
                        .map((n: any) => n.title + ": " + n.body)
                        .join("\n") || "Yangi xabar yo‘q",
                    )
                  }
                  aria-label="Bildirishnomalar"
                >
                  <Bell size={16} />
                </button>
                <span className="avatar">{user.name[0]}</span>
                {user.name}
                <button
                  className="btn"
                  onClick={() => void signOut()}
                  aria-label="Chiqish"
                >
                  <LogOut size={16} />
                </button>
              </>
            ) : (
              <a className="btn" href="#auth">
                Kirish →
              </a>
            )}
          </div>
        </header>
        <main>
          {error && (
            <p className="notice">
              Serverga ulanish amalga oshmadi.{" "}
              <button className="text-button" onClick={() => void refresh()}>
                Qayta urinish
              </button>
            </p>
          )}
          {page === "learn" ? (
            <LearnPage {...props} />
          ) : page === "practice" ? (
            <PracticePage {...props} />
          ) : page === "class" ? (
            <ClassPage {...props} />
          ) : page === "admin" ? (
            <AdminPage {...props} />
          ) : page === "arcade" ? (
            <Arcade />
          ) : page === "tournament" ? (
            <>
              <h1>Tournament</h1>
              <p>Bilimingizni musobaqada namoyish eting.</p>
              {data.tournaments.length ? (
                data.tournaments.map((t: any) => (
                  <div className="panel" key={t.id}>
                    <h2>{t.title}</h2>
                    <p>{t.description}</p>
                    <button
                      className="btn primary"
                      onClick={() =>
                        api("tournament.join", { id: t.id })
                          .then(() => alert("Ro‘yxatdan o‘tdingiz"))
                          .catch((e) => alert(e.message))
                      }
                    >
                      Qatnashish
                    </button>
                  </div>
                ))
              ) : (
                <div className="panel empty-state">
                  <Trophy size={40} />
                  <h2>Yangi turnirlar kutilmoqda</h2>
                  <p>
                    Administrator e’lon qilgan musobaqalar bu yerda chiqadi.
                  </p>
                </div>
              )}
            </>
          ) : ["pro", "subscription"].includes(page) ? (
            <div className="panel pricing">
              <Crown size={44} />
              <h1>TestMe Pro</h1>
              <h2>
                {Number(data.settings.proPrice || 49000).toLocaleString()} so‘m
                / oy
              </h2>
              <p>Barcha Pro kurslar va modullar bitta obunada.</p>
              {data.settings.paymentUrl?.startsWith("https://") ? (
                <a className="btn primary" href={data.settings.paymentUrl}>
                  Obunani rasmiylashtirish
                </a>
              ) : (
                <p>
                  To‘lov xizmati tayyorlanmoqda. Administrator bilan bog‘laning.
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="page-heading">
                <span className="eyebrow">BUGUN HAM BIR QADAM OLDINGA</span>
                <h1>
                  {user
                    ? "Salom, " + user.name.split(" ")[0] + "!"
                    : "Kelajagingiz shu yerdan boshlanadi."}{" "}
                  <span className="violet-text">✦</span>
                </h1>
                <p>
                  Bilimingizni oshiring, o‘zingizni sinang va yangi marralarni
                  zabt eting.
                </p>
              </div>
              <section className="hero">
                <div>
                  <span className="badge">
                    ✦ O‘Z IMKONIYATINGIZNI KASHF ETING
                  </span>
                  <h2>
                    Katta orzular.
                    <br />
                    <em>Har kungi kichik qadamlar.</em>
                  </h2>
                  <p>
                    Matematika, fizika va ingliz tili.
                    <br />
                    O‘rganish uchun hammasi bir joyda.
                  </p>
                  <a className="btn primary" href="#learn">
                    O‘rganishni boshlash <ArrowRight size={17} />
                  </a>
                </div>
                <div className="orbit-art">
                  <div className="ring r1" />
                  <div className="ring r2" />
                  <img src="/assets/testme-logo.png" alt="" />
                  <span className="formula f1">x² + y²</span>
                  <span className="formula f2">Aa</span>
                  <span className="formula f3">F = ma</span>
                </div>
              </section>
              <div className="stats-grid">
                {[
                  ["Bajarilgan testlar", data.results.length],
                  [
                    "O‘rtacha natija",
                    data.results.length
                      ? Math.round(
                          data.results.reduce(
                            (s: number, r: any) => s + r.percent,
                            0,
                          ) / data.results.length,
                        ) + "%"
                      : "0%",
                  ],
                  ["Mening sinflarim", data.classes.length],
                  ["O‘rganish yo‘nalishlari", 3],
                ].map(([a, b]) => (
                  <div className="panel stat" key={a}>
                    <span>{a}</span>
                    <strong>{b}</strong>
                    <small>Har bir qadam muhim</small>
                  </div>
                ))}
              </div>
              <div className="section-title">
                <h2>Qaysi fandan boshlaymiz?</h2>
                <a href="#learn">Barcha kurslar →</a>
              </div>
              <div className="subjects">
                {[
                  ["Matematika", "x²", "math"],
                  ["Fizika", "F = ma", "physics"],
                  ["Ingliz tili", "Aa", "english"],
                ].map(([n, s, k]) => (
                  <a
                    href={"#learn?subject=" + k}
                    className={"subject " + k}
                    key={k}
                  >
                    <div className="row between">
                      <b>{s}</b>
                      <ArrowUpRight />
                    </div>
                    <h2>{n}</h2>
                    <p>Qiziqishingizni yangi bilimga aylantiring.</p>
                    <small>
                      {data.courses.filter((c: any) => c.subject === k).length}{" "}
                      ta kurs ·{" "}
                      {data.modules.filter((c: any) => c.subject === k).length}{" "}
                      ta modul
                    </small>
                  </a>
                ))}
              </div>
              <div className="grid">
                <section className="panel">
                  <h2>So‘nggi natijalar</h2>
                  {data.results.length ? (
                    data.results.slice(0, 5).map((r: any) => (
                      <p className="row between" key={r.id}>
                        <span>{r.testTitle}</span>
                        <b>{r.percent}%</b>
                      </p>
                    ))
                  ) : (
                    <div className="empty-state">
                      <Target size={32} />
                      <h3>Birinchi natijangizni yarating</h3>
                      <p>Har bir urinish — o‘sish sari qadam.</p>
                      <a className="btn" href="#practice">
                        Testlarni ko‘rish →
                      </a>
                    </div>
                  )}
                </section>
                <section className="panel community-banner">
                  <Users size={36} />
                  <h2>O‘z sinfingizni toping.</h2>
                  <p>
                    Ustoz bergan 6 belgili kod orqali qo‘shiling. Vazifalar,
                    chat va kundalik bir joyda.
                  </p>
                  <a href="#class" className="btn">
                    Sinfga qo‘shilish ↗
                  </a>
                </section>
              </div>
            </>
          )}
          <footer>
            © {new Date().getFullYear()} TestMe{" "}
            <span>Har kuni yangi bilim. Har kuni yangi imkoniyat.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
function Arcade() {
  const [round, setRound] = useState(0),
    [score, setScore] = useState(0),
    [a, setA] = useState(() => Math.ceil(Math.random() * 12)),
    [b, setB] = useState(() => Math.ceil(Math.random() * 12)),
    [message, setMessage] = useState("");
  return (
    <>
      <h1>Arcade</h1>
      <p className="muted">Tez hisoblash · 10 bosqichli matematik mashq</p>
      <div className="panel arcade">
        <Gamepad2 size={42} />
        <span className="badge">{Math.min(round + 1, 10)} / 10</span>
        {round === 10 ? (
          <>
            <h2>Natijangiz: {score}/10</h2>
            <button
              className="btn primary"
              onClick={() => {
                setRound(0);
                setScore(0);
                setMessage("");
              }}
            >
              Yana o‘ynash
            </button>
          </>
        ) : (
          <>
            <h2>
              {a} × {b} = ?
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = e.currentTarget;
                const answer = Number(new FormData(f).get("answer"));
                if (answer === a * b) {
                  setScore(score + 1);
                  setMessage("To‘g‘ri! ✦");
                } else
                  setMessage(`Javob: ${a * b}. Keyingisini sinab ko‘ring!`);
                setRound(round + 1);
                setA(Math.ceil(Math.random() * 12));
                setB(Math.ceil(Math.random() * 12));
                f.reset();
              }}
            >
              <input
                autoFocus
                name="answer"
                type="number"
                required
                aria-label="Javob"
              />
              <button className="btn primary">Tekshirish</button>
            </form>
            <p>{message}</p>
            <small>
              Ball: {score} · Mashq natijasi shu o‘yin davomida saqlanadi.
            </small>
          </>
        )}
      </div>
    </>
  );
}
