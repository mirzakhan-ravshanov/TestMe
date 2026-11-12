import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Crown,
  Layers,
  Loader2,
  LockKeyhole,
  Play,
  Search,
  Video,
} from "lucide-react";
import { api } from "../api";
import { useAuth } from "../auth";
import "../learning.css";

type Course = {
  id: string;
  title: string;
  subject: string;
  description?: string;
  isPro?: boolean;
  access?: string;
  level?: string;
  lessonCount?: number;
  durationMinutes?: number;
  lessons?: Lesson[];
  completedLessonIds?: string[];
  [key: string]: any;
};
type Lesson = {
  id: string;
  title: string;
  content?: string;
  videoUrl?: string;
  durationMinutes?: number;
  isPreview?: boolean;
  [key: string]: any;
};
type Props = { data: any; onRefresh: () => Promise<void> };
const subjects = [
  ["all", "Barchasi"],
  ["math", "Matematika"],
  ["physics", "Fizika"],
  ["english", "Ingliz tili"],
];
const subjectName = (subject: string) =>
  subjects.find(([id]) => id === subject)?.[1] || subject;
const isPro = (item: Course) =>
  item.isPro === true || item.access === "pro" || item.tier === "pro";
const errorText = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Ma’lumot yuklanmadi. Qayta urinib ko‘ring.";

export function CourseArtwork({
  subject,
  title,
  index = 1,
}: {
  subject: string;
  title: string;
  index?: number;
}) {
  return (
    <div className={`course-cover ${subject}`} role="img" aria-label={title}>
      <span className="cover-grid" />
      <span className="cover-orbit" />
      <span className="cover-orbit second" />
      <span className="cover-label">{subjectName(subject)} • TESTME</span>
      <span className="cover-symbol">
        {subject === "physics"
          ? "F = ma"
          : subject === "english"
            ? "Aa."
            : "∑ x²"}
      </span>
      <span className="cover-dot" />
      <span className="cover-index">
        {String(index).padStart(2, "0")} / BILIMLAR OLAMI
      </span>
    </div>
  );
}

function safeVideo(
  url?: string,
): { kind: "youtube" | "video"; url: string } | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;
    const host = parsed.hostname.toLowerCase();
    if (
      [
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "youtube-nocookie.com",
        "www.youtube-nocookie.com",
        "youtu.be",
      ].includes(host)
    ) {
      const id =
        host === "youtu.be"
          ? parsed.pathname.slice(1)
          : parsed.searchParams.get("v") ||
            parsed.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1];
      return id && /^[a-zA-Z0-9_-]{11}$/.test(id)
        ? {
            kind: "youtube",
            url: `https://www.youtube-nocookie.com/embed/${id}?rel=0`,
          }
        : null;
    }
    return /\.(mp4|webm|ogg)$/i.test(parsed.pathname)
      ? { kind: "video", url: parsed.href }
      : null;
  } catch {
    return null;
  }
}

export default function LearnPage({ data, onRefresh }: Props) {
  const { user } = useAuth();
  const [hash, setHash] = useState(window.location.hash);
  const [access, setAccess] = useState("free");
  const [subject, setSubject] = useState(new URLSearchParams(location.hash.split('?')[1]).get('subject') || "all");
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<Course | null>(null);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const courseId = hash.match(/^#learn\/([^?]+)/)?.[1];
  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => {
    let alive = true;
    setDetail(null);
    setError("");
    setNotice("");
    setSelected(0);
    if (!courseId) return;
    setLoading(true);
    api<any>("course.detail", { id: courseId })
      .then((result) => {
        if (alive)
          setDetail(
            result.course
              ? {
                  ...result.course,
                  lessons: result.lessons || result.course.lessons,
                  completedLessonIds:
                    result.completedLessonIds || result.completed || [],
                }
              : result,
          );
      })
      .catch((e) => {
        if (alive) setError(errorText(e));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [courseId, user?.id]);
  const courses: Course[] = data?.courses || [];
  const visible = courses.filter(
    (c) =>
      (access === "pro") === isPro(c) &&
      (subject === "all" || c.subject === subject) &&
      (c.title + " " + (c.description || ""))
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()),
  );
  const selectedCourse = detail || courses.find((c) => c.id === courseId);
  const locked =
    !!selectedCourse &&
    isPro(selectedCourse) &&
    !(
      (user?.proUntil && new Date(user.proUntil) > new Date()) ||
      user?.role === "admin"
    );
  const lessons = detail?.lessons || [];
  const lesson = lessons[selected];
  const completed = detail?.completedLessonIds || detail?.completed || [];
  const media = safeVideo(lesson?.videoUrl || lesson?.video_url);
  async function complete() {
    if (!user) {
      window.location.hash = "auth";
      return;
    }
    if (!detail || !lesson) return;
    setSaving(true);
    setError("");
    try {
      await api("course.complete", {
        courseId: detail.id,
        lessonId: lesson.id,
      });
      setDetail({
        ...detail,
        completedLessonIds: Array.from(new Set([...completed, lesson.id])),
      });
      setNotice("Dars tugallandi. Yana bir qadam oldinga!");
      await onRefresh();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="learning-page">
      {courseId ? (
        <>
          <a href="#learn" className="back-link">
            <ArrowLeft size={15} /> Kurslarga qaytish
          </a>
          <div className="learning-heading">
            <div>
              <span className="eyebrow">
                LEARN / {subjectName(selectedCourse?.subject || "")}
              </span>
              <h1>{selectedCourse?.title || "Kurs darslari"}</h1>
              <p>{selectedCourse?.description}</p>
            </div>
          </div>
          {loading && (
            <div className="quiz-loading">
              <Loader2 className="spin" size={20} /> Darslar yuklanmoqda…
            </div>
          )}
          {error && (
            <div className="learning-message error" role="alert">
              {error}
            </div>
          )}
          {!loading && locked ? (
            <div className="course-lock">
              <Crown size={39} />
              <h2>Bilimga kengroq yo‘l oching</h2>
              <p>
                Ushbu kurs Pro obunaga kiradi. Bir oylik obuna bilan barcha Pro
                kurslar va testlardan foydalaning. O‘qish jarayoningiz
                hisobingizda saqlanadi.
              </p>
              <a className="btn primary" href="#subscription">
                Pro imkoniyatlarini ko‘rish <ArrowRight size={15} />
              </a>
            </div>
          ) : !loading && detail ? (
            <div className="course-detail-layout">
              <div>
                {lesson ? (
                  <>
                    <div className="lesson-player">
                      {media?.kind === "youtube" ? (
                        <iframe
                          key={media.url}
                          src={media.url}
                          title={lesson.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : media?.kind === "video" ? (
                        <video
                          key={media.url}
                          controls
                          preload="metadata"
                          src={media.url}
                        />
                      ) : (
                        <div className="lesson-player-placeholder">
                          <Video size={42} />
                          <h3>Video dars tayyorlanmoqda</h3>
                          <p>
                            Hozircha pastdagi dars materialini o‘rganishingiz
                            mumkin. Video qo‘shilganda shu yerda ochiladi.
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="lesson-details">
                      <span className="eyebrow">
                        {selected + 1}-DARS · {subjectName(detail.subject)}
                      </span>
                      <h2>{lesson.title}</h2>
                      <div className="lesson-body">
                        {lesson.content ||
                          lesson.description ||
                          "Dars materiali tez orada qo‘shiladi."}
                      </div>
                      {notice && (
                        <p className="learning-message" role="status">
                          {notice}
                        </p>
                      )}
                      <div className="lesson-actions">
                        <button
                          className="btn primary"
                          onClick={complete}
                          disabled={saving || completed.includes(lesson.id)}
                        >
                          {saving ? (
                            <Loader2 size={16} className="spin" />
                          ) : completed.includes(lesson.id) ? (
                            <CheckCircle2 size={16} />
                          ) : (
                            <Check size={16} />
                          )}{" "}
                          {completed.includes(lesson.id)
                            ? "Dars tugallangan"
                            : "Darsni tugatish"}
                        </button>
                        {selected < lessons.length - 1 && (
                          <button
                            className="btn"
                            onClick={() => {
                              setSelected(selected + 1);
                              setNotice("");
                            }}
                          >
                            Keyingi dars <ArrowRight size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="learning-empty">
                    <BookOpen size={34} />
                    <h3>Darslar tayyorlanmoqda</h3>
                    <p>
                      Ushbu kursga darslar qo‘shilganda shu yerda ko‘rinadi.
                    </p>
                  </div>
                )}
              </div>
              <aside className="lesson-list">
                <div className="lesson-list-head">
                  <h3>Kurs dasturi</h3>
                  <p>
                    {lessons.length} ta dars · {completed.length} ta tugallangan
                  </p>
                  <div className="learning-progress">
                    <span
                      style={{
                        width: `${lessons.length ? (completed.length / lessons.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
                {lessons.map((l, i) => (
                  <button
                    key={l.id}
                    className={`lesson-row-button ${selected === i ? "active" : ""}`}
                    onClick={() => {
                      setSelected(i);
                      setNotice("");
                    }}
                  >
                    <span className="lesson-number">
                      {completed.includes(l.id) ? (
                        <Check size={14} />
                      ) : (
                        String(i + 1).padStart(2, "0")
                      )}
                    </span>
                    <span className="lesson-name">
                      {l.title}
                      <small>
                        {l.durationMinutes
                          ? `${l.durationMinutes} daqiqa`
                          : "Video va materiallar"}
                      </small>
                    </span>
                    <Play size={13} />
                  </button>
                ))}
              </aside>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <div className="learning-heading">
            <div>
              <span className="eyebrow">HAR BIR DARS — YANGI IMKONIYAT</span>
              <h1>O‘rganishga vaqt ajrating.</h1>
              <p>
                Qiziqishingizni bilimga aylantiring. Sizga mos kursni tanlang va
                o‘z sur’atingizda o‘rganing.
              </p>
            </div>
            <span className="badge">
              <BookOpen size={13} /> Learn
            </span>
          </div>
          <div className="category-switch">
            <button
              className={`category-choice ${access === "free" ? "selected" : ""}`}
              onClick={() => setAccess("free")}
            >
              <span className="choice-icon">
                <BookOpen size={23} />
              </span>
              <span>
                <strong>Bepul kurslar</strong>
                <small>Bilim sari birinchi qadam</small>
              </span>
              <ChevronRight size={18} />
            </button>
            <button
              className={`category-choice pro ${access === "pro" ? "selected" : ""}`}
              onClick={() => setAccess("pro")}
            >
              <span className="choice-icon">
                <Crown size={24} />
              </span>
              <span>
                <strong>Pro kurslar</strong>
                <small>Chegarasiz imkoniyatlar</small>
              </span>
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="learning-toolbar">
            <div className="subject-tabs" aria-label="Fan bo‘yicha filtr">
              {subjects.map(([id, label]) => (
                <button
                  key={id}
                  className={subject === id ? "active" : ""}
                  onClick={() => setSubject(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="learning-search">
              <Search size={16} />
              <input
                placeholder="Kursni qidirish…"
                aria-label="Kursni qidirish"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
          </div>
          {visible.length ? (
            <div className="course-grid">
              {visible.map((course, index) => (
                <article className="course-card" key={course.id}>
                  <CourseArtwork
                    subject={course.subject}
                    title={course.title}
                    index={index + 1}
                  />
                  <div className="course-card-body">
                    <span className="course-category">
                      {subjectName(course.subject)} ·{" "}
                      {course.level || "Boshlang‘ich"}
                    </span>
                    <h3>{course.title}</h3>
                    <p>
                      {course.description ||
                        "Yangi bilimlarni bosqichma-bosqich egallang."}
                    </p>
                    <div className="course-meta">
                      <span>
                        <Layers size={12} />
                        {course.lessonCount ?? course.lessons?.length ?? 0} ta
                        dars
                      </span>
                      {!!course.durationMinutes && (
                        <span>
                          <Clock3 size={12} />
                          {course.durationMinutes} daqiqa
                        </span>
                      )}
                    </div>
                    <div className="course-card-bottom">
                      <span
                        className={`access-tag ${isPro(course) ? "pro" : ""}`}
                      >
                        {isPro(course) ? (
                          <>
                            <Crown size={12} /> Pro
                          </>
                        ) : (
                          <>Bepul</>
                        )}
                      </span>
                      <a href={`#learn/${course.id}`}>
                        Kursni ko‘rish <ArrowRight size={13} />
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="learning-empty">
              <BookOpen size={36} />
              <h3>
                {search ? "Kurs topilmadi" : "Yangi kurslar tayyorlanmoqda"}
              </h3>
              <p>
                {search
                  ? "Qidiruvni o‘zgartiring yoki boshqa fanni tanlang."
                  : "Ushbu yo‘nalishdagi kurslar nashr etilganda shu yerda ko‘rinadi."}
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
