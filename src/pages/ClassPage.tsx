import { useEffect, useState } from "react";
import {
  BookOpen,
  Users,
  Plus,
  ArrowLeft,
  MessageCircle,
  Send,
  Trophy,
  CalendarDays,
  ClipboardCheck,
  Copy,
  GraduationCap,
} from "lucide-react";
import { api } from "../api";
import { useAuth } from "../auth";
import "../community.css";

type Props = { data: any; onRefresh: () => Promise<void> };
const date = (value: string) =>
  value
    ? new Date(value).toLocaleString("uz-UZ", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";
export default function ClassPage({ data, onRefresh }: Props) {
  const { user } = useAuth();
  const [id, setId] = useState("");
  const [detail, setDetail] = useState<any>(null);
  const [tab, setTab] = useState("assignments");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState("");
  const [notice, setNotice] = useState("");
  const [tests, setTests] = useState<any[]>([]);
  const classes = data?.classes || [];
  const load = async (classId = id) => {
    if (classId) {
      const result = await api<any>("class.detail", { id: classId });
      setDetail(result);
    }
  };
  useEffect(() => {
    setDetail(null);
    if (!id) return;
    let alive = true;
    const poll = () =>
      api<any>("class.detail", { id })
        .then((r) => {
          if (alive) setDetail(r);
        })
        .catch((e) => {
          if (alive) setError(e.message);
        });
    void poll();
    const interval = setInterval(poll, 5000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [id]);
  const perform = async (action: string, payload: any) => {
    setError("");
    setBusy(true);
    try {
      const result = await api<any>(action, payload);
      await onRefresh();
      if (id) await load();
      return result;
    } catch (e: any) {
      setError(e.message);
      return null;
    } finally {
      setBusy(false);
    }
  };
  const open = async (kind: string) => {
    setModal(kind);
    setError("");
    if (kind === "assign") {
      try {
        const modules = await Promise.all(
          (data.modules || []).map((m: any) =>
            api<any>("module.detail", { id: m.id }),
          ),
        );
        setTests(modules.flatMap((m: any) => m.tests || []));
      } catch (e: any) {
        setError(e.message);
      }
    }
  };
  if (!user)
    return (
      <div className="panel community-welcome">
        <GraduationCap size={46} />
        <h1>Birga o‘rganish yanada oson.</h1>
        <p className="muted">
          Ustozingiz sinfiga qo‘shiling, vazifalarni bajaring va
          natijalaringizni kuzating.
        </p>
        <a className="btn primary" href="#auth">
          Sinfga qo‘shilish uchun kiring
        </a>
      </div>
    );
  const cls = detail?.class || detail?.classroom || {};
  const owns =
    cls.teacherId === user.id ||
    cls.teacher_id === user.id ||
    cls.ownerId === user.id ||
    user.role === "admin";
  const assignments = detail?.assignments || [],
    submissions = detail?.submissions || [],
    members = detail?.members || [],
    messages = detail?.messages || [];
  return (
    <section className="community-page">
      <div className="page-heading">
        <div>
          {id && (
            <button className="back-link" onClick={() => setId("")}>
              <ArrowLeft size={16} /> Barcha sinflar
            </button>
          )}
          <p className="eyebrow">BIRGA O‘RGANAMIZ</p>
          <h1>{id ? cls.name || "Sinf yuklanmoqda…" : "Mening sinflarim"}</h1>
          <p className="muted">
            {id
              ? "Ustoz, sinfdoshlar va yangi marralar — bir joyda."
              : "Sinfingizga qo‘shiling va maqsad sari birga harakat qiling."}
          </p>
        </div>
        <div className="action-row">
          {!id && (
            <>
              <button className="btn" onClick={() => void open("join")}>
                <Users size={17} /> Kod orqali qo‘shilish
              </button>
              {["teacher", "admin"].includes(user.role) && (
                <button
                  className="btn primary"
                  onClick={() => void open("create")}
                >
                  <Plus size={17} /> Sinf yaratish
                </button>
              )}
            </>
          )}
          {id && owns && (
            <button className="btn primary" onClick={() => void open("assign")}>
              <Plus size={17} /> Vazifa berish
            </button>
          )}
        </div>
      </div>
      {error && (
        <div className="inline-error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <p className="success-message" role="status">
          {notice}
        </p>
      )}
      {!id ? (
        <div className="community-grid">
          {classes.map((c: any) => (
            <button
              className="panel class-card"
              key={c.id}
              onClick={() => {
                setId(c.id);
                setError("");
              }}
            >
              <div className="class-icon">
                <GraduationCap size={26} />
              </div>
              <span className="badge">{c.subject || "Umumiy"}</span>
              <h2>{c.name}</h2>
              <p className="muted">
                {c.teacherName || c.teacher_name || "O‘quv sinfi"}
              </p>
              <div className="class-card-foot">
                <span>
                  <Users size={15} /> {c.memberCount ?? c.member_count ?? "—"}{" "}
                  o‘quvchi
                </span>
                <span>Sinfga kirish ↗</span>
              </div>
            </button>
          ))}
          {!classes.length && (
            <div className="panel empty-state">
              <Users size={36} />
              <h2>Yangi jamoangiz shu yerda bo‘ladi</h2>
              <p className="muted">
                Ustoz bergan 6 belgili kodni kiriting va birinchi sinfingizga
                qo‘shiling.
              </p>
              <button className="btn primary" onClick={() => void open("join")}>
                Kodni kiritish
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          {detail && (
            <div className="class-summary panel">
              <span>
                <Users size={18} /> {members.length} a’zo
              </span>
              <span>
                <BookOpen size={18} /> {cls.subject || "Ta’lim"}
              </span>
              {owns && (
                <button
                  className="code-copy"
                  onClick={() => {
                    navigator.clipboard
                      .writeText(cls.code || "")
                      .then(() => setNotice("Sinf kodi nusxalandi."))
                      .catch(() => setNotice(`Sinf kodi: ${cls.code}`));
                  }}
                >
                  Sinf kodi: <strong>{cls.code}</strong>
                  <Copy size={15} />
                </button>
              )}
            </div>
          )}
          <div className="tabs class-tabs">
            {[
              ["assignments", "Vazifalar", ClipboardCheck],
              ["chat", "Chat", MessageCircle],
              ["leaderboard", "Reyting", Trophy],
              ["diary", "Kundalik", CalendarDays],
              ["members", "A’zolar", Users],
            ].map(([key, label, Icon]: any) => (
              <button
                key={key}
                className={tab === key ? "active" : ""}
                onClick={() => setTab(key)}
              >
                <Icon size={17} />
                {label}
              </button>
            ))}
          </div>
          {!detail ? (
            <p className="muted">Sinf ma’lumotlari yuklanmoqda…</p>
          ) : (
            <>
              {tab === "assignments" && (
                <div className="assignment-list">
                  {assignments.map((a: any) => {
                    const mine = submissions.find(
                      (s: any) =>
                        (s.assignmentId || s.assignment_id) === a.id &&
                        (s.userId || s.user_id) === user.id,
                    );
                    const late = new Date(a.deadline).getTime() < Date.now();
                    return (
                      <article className="panel assignment-card" key={a.id}>
                        <div className="assignment-icon">
                          <ClipboardCheck size={23} />
                        </div>
                        <div className="assignment-copy">
                          <span className={"badge " + (mine ? "green" : "")}>
                            {mine
                              ? "Topshirilgan"
                              : late
                                ? "Muddati tugagan"
                                : "Bajarish kerak"}
                          </span>
                          <h3>{a.title}</h3>
                          <p className="muted">
                            {a.instructions ||
                              "Testni yeching va natijangizni ustozga yuboring."}
                          </p>
                          <small className="muted">
                            Muddat: {date(a.deadline)}
                          </small>
                        </div>
                        {!owns && (
                          <a
                            className="btn"
                            href={`#practice?test=${encodeURIComponent(a.testId || a.test_id)}&assignment=${a.id}`}
                          >
                            {mine ? "Qayta ko‘rish" : "Boshlash →"}
                          </a>
                        )}
                        {owns && (
                          <span className="muted">
                            {
                              submissions.filter(
                                (s: any) =>
                                  (s.assignmentId || s.assignment_id) === a.id,
                              ).length
                            }{" "}
                            topshirilgan
                          </span>
                        )}
                      </article>
                    );
                  })}
                  {!assignments.length && (
                    <div className="panel empty-state">
                      <ClipboardCheck size={34} />
                      <h3>Hozircha vazifa yo‘q</h3>
                      <p className="muted">
                        Ustoz yuborgan yangi vazifalar shu yerda chiqadi.
                      </p>
                    </div>
                  )}
                </div>
              )}
              {tab === "chat" && (
                <div className="panel class-chat">
                  <div className="chat-top">
                    <div>
                      <strong>Sinf suhbati</strong>
                      <p className="muted">
                        {members.length} a’zo · xabarlar avtomatik yangilanadi
                      </p>
                    </div>
                    <MessageCircle size={22} />
                  </div>
                  <div className="chat-messages" aria-live="polite">
                    {messages.map((m: any) => (
                      <div
                        key={m.id}
                        className={
                          "chat-message " +
                          ((m.userId || m.user_id) === user.id ? "mine" : "")
                        }
                      >
                        <strong>
                          {m.name || m.userName || m.user_name || "Sinf a’zosi"}
                        </strong>
                        <p>{m.text || m.body}</p>
                        <small>{date(m.createdAt || m.created_at)}</small>
                      </div>
                    ))}
                    {!messages.length && (
                      <p className="empty-state muted">
                        Suhbatni birinchi bo‘lib boshlang.
                      </p>
                    )}
                  </div>
                  <form
                    className="chat-composer"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      const text = String(
                        new FormData(form).get("text") || "",
                      ).trim();
                      if (!text) return;
                      const result = await perform("class.message", {
                        classId: id,
                        text,
                      });
                      if (result !== null) form.reset();
                    }}
                  >
                    <input
                      name="text"
                      maxLength={2000}
                      placeholder="Sinfga xabar yozing…"
                      aria-label="Xabar"
                      required
                    />
                    <button
                      className="btn primary"
                      disabled={busy}
                      aria-label="Xabarni yuborish"
                    >
                      <Send size={19} />
                    </button>
                  </form>
                </div>
              )}
              {tab === "members" && (
                <div className="panel table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Ism</th>
                        <th>Rol</th>
                        <th>Qo‘shilgan sana</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((m: any) => (
                        <tr key={m.id || m.userId}>
                          <td>
                            <span className="avatar-dot">
                              {(m.name || "O")[0]}
                            </span>
                            {m.name || m.userName}
                          </td>
                          <td>
                            {m.role === "teacher"
                              ? "Ustoz"
                              : m.role === "admin"
                                ? "Administrator"
                                : "O‘quvchi"}
                          </td>
                          <td>
                            {date(m.joinedAt || m.joined_at || m.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {tab === "leaderboard" && (
                <div className="panel table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>O‘rin</th>
                        <th>O‘quvchi</th>
                        <th>Natija</th>
                        <th>Bajarilgan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(detail.leaderboard || []).map((r: any, i: number) => (
                        <tr key={r.userId || r.id || i}>
                          <td>
                            <span className={"rank rank-" + i}>{i + 1}</span>
                          </td>
                          <td>{r.name}</td>
                          <td>{r.score ?? r.totalScore ?? r.average ?? 0}</td>
                          <td>
                            {r.completed ?? r.submissions ?? r.count ?? 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!(detail.leaderboard || []).length && (
                    <p className="empty-state muted">
                      Birinchi vazifalardan keyin reyting shakllanadi.
                    </p>
                  )}
                </div>
              )}
              {tab === "diary" && (
                <div className="panel table-wrap">
                  <table>
                    <thead>
                      <tr>
                        {owns && <th>O‘quvchi</th>}
                        <th>Vazifa</th>
                        <th>Natija</th>
                        <th>Baho</th>
                        <th>Izoh</th>
                        {owns && <th>Baholash</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {submissions
                        .filter(
                          (s: any) =>
                            owns || (s.userId || s.user_id) === user.id,
                        )
                        .map((s: any) => (
                          <tr key={s.id}>
                            {owns && (
                              <td>{s.name || s.studentName || s.user_name}</td>
                            )}
                            <td>
                              {s.assignmentTitle ||
                                s.assignment_title ||
                                assignments.find(
                                  (a: any) =>
                                    a.id ===
                                    (s.assignmentId || s.assignment_id),
                                )?.title}
                            </td>
                            <td>{s.percent ?? s.score ?? 0}%</td>
                            <td>
                              {s.grade ? (
                                <span className={"grade grade-" + s.grade}>
                                  {s.grade}
                                </span>
                              ) : (
                                <span className="badge">Kutilmoqda</span>
                              )}
                            </td>
                            <td>{s.comment || "—"}</td>
                            {owns && (
                              <td>
                                <form
                                  className="grade-form"
                                  onSubmit={async (e) => {
                                    e.preventDefault();
                                    const f = new FormData(e.currentTarget);
                                    await perform("class.grade", {
                                      submissionId: s.id,
                                      grade: Number(f.get("grade")),
                                      comment: String(f.get("comment") || ""),
                                    });
                                  }}
                                >
                                  <select
                                    name="grade"
                                    defaultValue={s.grade || 5}
                                    aria-label="Baho"
                                  >
                                    {[5, 4, 3, 2].map((g) => (
                                      <option key={g}>{g}</option>
                                    ))}
                                  </select>
                                  <input
                                    name="comment"
                                    defaultValue={s.comment || ""}
                                    placeholder="Ustoz izohi"
                                    maxLength={1000}
                                  />
                                  <button className="btn" disabled={busy}>
                                    Saqlash
                                  </button>
                                </form>
                              </td>
                            )}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  {!submissions.length && (
                    <p className="empty-state muted">
                      Vazifa topshirilgach natija, ustoz bahosi va izohi bu
                      yerda saqlanadi.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal("")}>
          <section
            className="panel community-modal"
            role="dialog"
            aria-modal="true"
            aria-label={
              modal === "join"
                ? "Sinfga qo‘shilish"
                : modal === "create"
                  ? "Sinf yaratish"
                  : "Vazifa berish"
            }
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setModal("")}
              aria-label="Yopish"
            >
              ×
            </button>
            <h2>
              {modal === "join"
                ? "Jamoangizga qo‘shiling"
                : modal === "create"
                  ? "Yangi sinf yarating"
                  : "Yangi vazifa"}
            </h2>
            <form
              className="form-stack"
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                let result: any;
                if (modal === "join")
                  result = await perform("class.join", {
                    code: String(f.get("code")).toUpperCase(),
                  });
                else if (modal === "create")
                  result = await perform("class.create", {
                    name: f.get("name"),
                    subject: f.get("subject"),
                  });
                else
                  result = await perform("class.assign", {
                    classId: id,
                    title: f.get("title"),
                    testId: f.get("testId"),
                    deadline: new Date(String(f.get("deadline"))).toISOString(),
                    instructions: f.get("instructions"),
                  });
                if (result !== null) {
                  setModal("");
                  if (result.id && modal !== "assign") setId(result.id);
                  setNotice("Muvaffaqiyatli saqlandi.");
                }
              }}
            >
              {modal === "join" ? (
                <>
                  <p className="muted">
                    Ustozingiz bergan 6 belgili kodni kiriting.
                  </p>
                  <label className="field">
                    Sinf kodi
                    <input
                      name="code"
                      minLength={6}
                      maxLength={6}
                      pattern="[A-Za-z0-9]{6}"
                      placeholder="A7K2P9"
                      className="join-code"
                      required
                    />
                  </label>
                </>
              ) : modal === "create" ? (
                <>
                  <label className="field">
                    Sinf nomi
                    <input
                      name="name"
                      placeholder="Masalan: Matematika 9-A"
                      maxLength={100}
                      required
                    />
                  </label>
                  <label className="field">
                    Fan
                    <select name="subject">
                      <option value="math">Matematika</option>
                      <option value="physics">Fizika</option>
                      <option value="english">Ingliz tili</option>
                    </select>
                  </label>
                </>
              ) : (
                <>
                  <label className="field">
                    Vazifa nomi
                    <input name="title" maxLength={120} required />
                  </label>
                  <label className="field">
                    Test
                    <select name="testId" required>
                      <option value="">Testni tanlang</option>
                      {tests.map((t) => (
                        <option value={t.id} key={t.id}>
                          {t.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    Topshirish muddati
                    <input name="deadline" type="datetime-local" required />
                  </label>
                  <label className="field">
                    Ko‘rsatma
                    <textarea name="instructions" rows={3} maxLength={2000} />
                  </label>
                </>
              )}
              {error && <p className="inline-error">{error}</p>}
              <button className="btn primary" disabled={busy}>
                {busy
                  ? "Saqlanmoqda…"
                  : modal === "join"
                    ? "Sinfga qo‘shilish"
                    : modal === "create"
                      ? "Sinf yaratish"
                      : "Vazifani yuborish"}
              </button>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
