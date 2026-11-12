import { useEffect, useState } from "react";
import { api } from "../api";
import { CourseArtwork } from "./LearnPage";
import { useAuth } from "../auth";
export default function PracticePage({
  data,
  onRefresh,
}: {
  data: any;
  onRefresh: () => Promise<void>;
}) {
  const { user } = useAuth();
  const [pro, setPro] = useState(false),
    [module, setModule] = useState<any>(null),
    [attempt, setAttempt] = useState<any>(null),
    [answers, setAnswers] = useState<Record<string, string>>({}),
    [result, setResult] = useState<any>(null),
    [error, setError] = useState(""),
    [seconds, setSeconds] = useState(0),
    [busy, setBusy] = useState(false);
  async function start(id: string) {
    setError("");
    setBusy(true);
    try {
      const params = new URLSearchParams(location.hash.split("?")[1]);
      setAttempt(
        await api("test.start", {
          id,
          assignmentId: params.get("assignment") || undefined,
        }),
      );
      setAnswers({});
      setResult(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    if (busy) return;
    setBusy(true);
    try {
      setResult(
        await api("test.submit", { attemptId: attempt.attemptId, answers }),
      );
      setAttempt(null);
      await onRefresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    const test = new URLSearchParams(location.hash.split("?")[1]).get("test");
    if (test && user) void start(test);
  }, [user?.id]);
  useEffect(() => {
    if (!attempt) return;
    const t = setInterval(() => {
      const s = Math.max(
        0,
        Math.ceil((Date.parse(attempt.expiresAt) - Date.now()) / 1000),
      );
      setSeconds(s);
      if (s === 0) void submit();
    }, 1000);
    return () => clearInterval(t);
  }, [attempt, answers, busy]);
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">PRACTICE / BILIMINGIZNI SINANG</span>
        <h1>Har bir mashq — yangi yutuq.</h1>
        <p>Fanlar bo‘yicha modullar, testlar va batafsil natijalar.</p>
      </div>
      {error && (
        <p className="notice" role="alert">
          {error} {!user && <a href="#auth">Kirish →</a>}
        </p>
      )}
      {result ? (
        <div className="panel quiz">
          <span className="eyebrow">TEST YAKUNLANDI</span>
          <h1>{result.percent}%</h1>
          <p>
            {result.score}/{result.total} ta to‘g‘ri javob · Tavsiya baho:{" "}
            {result.grade}
          </p>
          {result.review.map((q: any) => (
            <div className="review" key={q.id}>
              <b>{q.text}</b>
              <p>
                Sizning javobingiz: {q.options[q.selected] || "Belgilanmagan"}
              </p>
              <p>To‘g‘ri javob: {q.options[q.answer]}</p>
              <small>{q.explanation}</small>
            </div>
          ))}
          <button className="btn primary" onClick={() => setResult(null)}>
            Testlarga qaytish
          </button>
        </div>
      ) : attempt ? (
        <div className="panel quiz">
          <div className="row between">
            <h2>{attempt.title}</h2>
            <b>
              {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
            </b>
          </div>
          {attempt.questions.map((q: any, i: number) => (
            <fieldset key={q.id}>
              <legend>
                {i + 1}. {q.text}
              </legend>
              {q.options.map((o: string, j: number) => (
                <label
                  className={`option ${answers[q.id] === String(j) ? "selected" : ""}`}
                  key={j}
                >
                  <input
                    type="radio"
                    name={q.id}
                    checked={answers[q.id] === String(j)}
                    onChange={() =>
                      setAnswers({ ...answers, [q.id]: String(j) })
                    }
                  />
                  {o}
                </label>
              ))}
            </fieldset>
          ))}
          <button
            className="btn primary"
            disabled={busy}
            onClick={() => {
              if (confirm("Testni yakunlaysizmi?")) void submit();
            }}
          >
            Yakunlash
          </button>
        </div>
      ) : module ? (
        <>
          <button className="btn" onClick={() => setModule(null)}>
            ← Modullar
          </button>
          <h2>{module.title}</h2>
          <div className="grid">
            {module.tests.map((t: any) => (
              <div className="panel" key={t.id}>
                <h3>{t.title}</h3>
                <p>
                  {t.questionCount} savol · {Math.round(t.duration / 60)} daqiqa
                </p>
                <button
                  className="btn primary"
                  disabled={busy}
                  onClick={() => void start(t.id)}
                >
                  Testni boshlash
                </button>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="tabs">
            <button
              className={!pro ? "active" : ""}
              onClick={() => setPro(false)}
            >
              Bepul testlar
            </button>
            <button
              className={pro ? "active" : ""}
              onClick={() => setPro(true)}
            >
              ♛ Pro testlar
            </button>
          </div>
          <div className="course-grid">
            {data.modules
              .filter((m: any) => !!m.isPro === pro)
              .map((m: any) => (
                <article className="course-card" key={m.id}>
                  <CourseArtwork subject={m.subject} title={m.title} />
                  <div className="course-card-body">
                    <span className="badge">
                      {m.isPro ? "Pro" : "Bepul"} · {m.year}
                    </span>
                    <h2>{m.title}</h2>
                    <p>{m.description}</p>
                    <button
                      className="btn"
                      onClick={async () => {
                        try {
                          setModule(await api("module.detail", { id: m.id }));
                          setError("");
                        } catch (e: any) {
                          setError(e.message);
                        }
                      }}
                    >
                      Modulni ochish →
                    </button>
                  </div>
                </article>
              ))}
          </div>
        </>
      )}
    </>
  );
}
