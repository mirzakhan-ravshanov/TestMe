import { randomUUID, randomInt } from "node:crypto";
import {
  authenticate,
  requireUser,
  sameOrigin,
  HttpError,
  authJson,
  authFailure,
  database,
  type AppUser,
} from "../../server/auth";
const q = async (sql: string, args: unknown[] = []): Promise<any[]> =>
  (await database().pool.query(sql, args)).rows;
const clean = (r: any) => {
  const { questions, lessons, ...data } = r.data;
  return {
    id: r.id,
    ...data,
    isPro: r.pro,
    lessonCount: lessons?.length,
    questionCount: questions?.length,
    published: r.published,
  };
};
async function content(id: string, user: AppUser | null) {
  const [r] = await q("SELECT * FROM tm_content WHERE id=$1", [id]);
  if (!r || (!r.published && user?.role !== "admin"))
    throw new HttpError(404, "Topilmadi");
  if (
    r.pro &&
    user?.role !== "admin" &&
    !(user?.proUntil && new Date(user.proUntil) > new Date())
  )
    throw new HttpError(403, "Pro obuna talab qilinadi.");
  return r;
}
async function member(id: string, u: AppUser, owner = false) {
  const [c] = await q(
    "SELECT c.* FROM tm_classes c WHERE c.id=$1 AND (c.teacher_id=$2 OR $3 OR EXISTS(SELECT 1 FROM tm_members m WHERE m.class_id=c.id AND m.user_id=$2))",
    [id, u.id, u.role === "admin"],
  );
  if (!c || (owner && c.teacher_id !== u.id && u.role !== "admin"))
    throw new HttpError(403, "Bu amal uchun ruxsat yo‘q.");
  return c;
}
export default async (req: Request) => {
  try {
    if (
      req.method === "GET" &&
      new URL(req.url).pathname === "/api/bootstrap"
    ) {
      const user = await authenticate(req);
      const all = await q("SELECT * FROM tm_content WHERE published=true");
      return authJson({
        data: {
          courses: all.filter((r) => r.kind === "courses").map(clean),
          modules: all.filter((r) => r.kind === "modules").map(clean),
          tournaments: all.filter((r) => r.kind === "tournaments").map(clean),
          settings: all.find((r) => r.id === "platform")?.data || {},
          classes: user
            ? await q(
                "SELECT DISTINCT c.* FROM tm_classes c LEFT JOIN tm_members m ON m.class_id=c.id WHERE c.teacher_id=$1 OR m.user_id=$1",
                [user.id],
              )
            : [],
          results: user
            ? await q(
                'SELECT a.id,a.percent,a.submitted_at AS "createdAt",c.data->>\'title\' AS "testTitle" FROM tm_attempts a JOIN tm_content c ON c.id=a.test_id WHERE a.user_id=$1 AND submitted_at IS NOT NULL ORDER BY submitted_at DESC',
                [user.id],
              )
            : [],
          notifications: user
            ? await q(
                "SELECT * FROM tm_notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 30",
                [user.id],
              )
            : [],
        },
      });
    }
    if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
    sameOrigin(req);
    const raw = await req.text();
    if (raw.length > 200000) throw new HttpError(413, "So‘rov juda katta");
    const { action, payload: p = {} } = JSON.parse(raw);
    let u = await authenticate(req);
    let result: any;
    if (action === "course.detail" || action === "module.detail") {
      const r = await content(p.id, u);
      if (r.kind !== (action === "course.detail" ? "courses" : "modules")) throw new HttpError(404, "Kontent topilmadi");
      result = { ...clean(r), ...r.data };
      if (r.kind === "modules") {
        result.tests = (
          await q(
            "SELECT * FROM tm_content WHERE id=ANY($1::text[]) AND published=true",
            [r.data.testIds || []],
          )
        ).map(clean);
      }
      if (r.kind === "courses")
        result.completedLessonIds = u
          ? (
              await q(
                "SELECT lesson_id FROM tm_progress WHERE user_id=$1 AND course_id=$2",
                [u.id, p.id],
              )
            ).map((r) => r.lesson_id)
          : [];
    } else {
      u = u || (await requireUser(req));
      if (action === "course.complete") {
        const c = await content(p.courseId, u);
        if (!c.data.lessons?.some((l: any) => l.id === p.lessonId))
          throw new HttpError(400, "Dars topilmadi");
        await q(
          "INSERT INTO tm_progress(user_id,course_id,lesson_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
          [u.id, p.courseId, p.lessonId],
        );
        result = { ok: true };
      } else if (action === "test.start") {
        const t = await content(p.id, u);
        let deadline: number | undefined;
        if (t.kind !== "tests") throw new HttpError(400, "Test topilmadi");
        if (p.assignmentId) {
          const [a] = await q("SELECT * FROM tm_assignments WHERE id=$1", [
            p.assignmentId,
          ]);
          if (!a || a.test_id !== p.id)
            throw new HttpError(400, "Vazifa topilmadi");
          await member(a.class_id, u);
          if (!a.allow_late && new Date(a.deadline) < new Date())
            throw new HttpError(400, "Vazifa muddati tugagan");
          if (!a.allow_late) deadline = new Date(a.deadline).getTime();
        }
        const id = randomUUID(),
          expires = new Date(
            Math.min(Date.now() + Number(t.data.duration || 300) * 1000, deadline || Infinity),
          );
        await q(
          "INSERT INTO tm_attempts(id,user_id,test_id,assignment_id,snapshot,expires_at) VALUES($1,$2,$3,$4,$5,$6)",
          [
            id,
            u.id,
            p.id,
            p.assignmentId || null,
            JSON.stringify(t.data),
            expires,
          ],
        );
        result = {
          attemptId: id,
          title: t.data.title,
          expiresAt: expires,
          questions: t.data.questions.map(
            ({ answer, explanation, ...v }: any) => v,
          ),
        };
      } else if (action === "test.submit") {
        const client = await database().pool.connect();
        try {
          await client.query("BEGIN");
          const { rows } = await client.query(
            "SELECT * FROM tm_attempts WHERE id=$1 AND user_id=$2 FOR UPDATE",
            [p.attemptId, u.id],
          );
          const a = rows[0];
          if (!a) throw new HttpError(404, "Urinish topilmadi");
          if (a.submitted_at)
            throw new HttpError(409, "Test allaqachon topshirilgan");
          const answers =
            Date.now() > new Date(a.expires_at).getTime() + 10000
              ? {}
              : p.answers || {};
          const questions = a.snapshot.questions;
          const score = questions.filter(
            (v: any) => String(answers[v.id]) === String(v.answer),
          ).length;
          const percent = Math.round((score / questions.length) * 100);
          await client.query(
            "UPDATE tm_attempts SET submitted_at=now(),answers=$1,score=$2,total=$3,percent=$4 WHERE id=$5",
            [JSON.stringify(answers), score, questions.length, percent, a.id],
          );
          if (a.assignment_id) {
            await client.query(
              "INSERT INTO tm_submissions(id,assignment_id,user_id,attempt_id) VALUES($1,$2,$3,$4) ON CONFLICT(assignment_id,user_id) DO NOTHING",
              [randomUUID(), a.assignment_id, u.id, a.id],
            );
            await client.query(
              "INSERT INTO tm_notifications(id,user_id,title,body) SELECT $1,c.teacher_id,$2,$3 FROM tm_assignments a JOIN tm_classes c ON c.id=a.class_id WHERE a.id=$4",
              [
                randomUUID(),
                "Vazifa bajarildi",
                `${u.name}: ${percent}% natija`,
                a.assignment_id,
              ],
            );
          }
          await client.query("COMMIT");
          result = {
            score,
            total: questions.length,
            percent,
            grade:
              percent >= 86 ? 5 : percent >= 71 ? 4 : percent >= 56 ? 3 : 2,
            review: questions.map((v: any) => ({
              ...v,
              selected: answers[v.id],
            })),
          };
        } catch (e) {
          await client.query("ROLLBACK");
          throw e;
        } finally {
          client.release();
        }
      } else if (action === "class.create") {
        if (!["teacher", "admin"].includes(u.role))
          throw new HttpError(403, "Faqat ustoz sinf yaratadi");
        const name = String(p.name || "")
          .trim()
          .slice(0, 100);
        if (!name) throw new HttpError(400, "Sinf nomini kiriting");
        const id = randomUUID();
        let code = "";
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        for (let i = 0; i < 6; i++) code += chars[randomInt(chars.length)];
        result = (
          await q(
            "INSERT INTO tm_classes(id,teacher_id,name,subject,code) VALUES($1,$2,$3,$4,$5) RETURNING *",
            [id, u.id, name, p.subject, code],
          )
        )[0];
      } else if (action === "class.join") {
        const [c] = await q("SELECT * FROM tm_classes WHERE code=$1", [
          String(p.code || "").toUpperCase(),
        ]);
        if (!c) throw new HttpError(404, "Sinf kodi topilmadi");
        await q(
          "INSERT INTO tm_members(class_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
          [c.id, u.id],
        );
        result = { id: c.id };
      } else if (action === "class.detail") {
        const c = await member(p.id, u);
        const owns = c.teacher_id === u.id || u.role === "admin";
        result = {
          class: {
            ...c,
            teacherId: c.teacher_id,
            code: owns ? c.code : undefined,
          },
          members: await q(
            "SELECT u.id,u.name,u.role,m.joined_at FROM tm_members m JOIN tm_users u ON u.id=m.user_id WHERE m.class_id=$1",
            [c.id],
          ),
          assignments: await q(
            "SELECT * FROM tm_assignments WHERE class_id=$1",
            [c.id],
          ),
          messages: await q(
            "SELECT m.*,u.name FROM tm_messages m JOIN tm_users u ON u.id=m.user_id WHERE class_id=$1 ORDER BY created_at LIMIT 200",
            [c.id],
          ),
          submissions: await q(
            "SELECT s.*,u.name,a.title AS assignment_title,t.percent,s.feedback AS comment FROM tm_submissions s JOIN tm_assignments a ON a.id=s.assignment_id JOIN tm_attempts t ON t.id=s.attempt_id JOIN tm_users u ON u.id=s.user_id WHERE a.class_id=$1 AND ($2 OR s.user_id=$3)",
            [c.id, owns, u.id],
          ),
          leaderboard: await q(
            "SELECT u.id,u.name,COUNT(*) AS completed,SUM(t.percent) AS score FROM tm_submissions s JOIN tm_assignments a ON a.id=s.assignment_id JOIN tm_attempts t ON t.id=s.attempt_id JOIN tm_users u ON u.id=s.user_id WHERE a.class_id=$1 GROUP BY u.id ORDER BY score DESC",
            [c.id],
          ),
        };
      } else if (action === "class.message") {
        await member(p.classId, u);
        const text = String(p.text || "").trim();
        if (!text || text.length > 2000)
          throw new HttpError(400, "Xabar 1–2000 belgi bo‘lsin");
        await q(
          "INSERT INTO tm_messages(id,class_id,user_id,body) VALUES($1,$2,$3,$4)",
          [randomUUID(), p.classId, u.id, text],
        );
        result = { ok: true };
      } else if (action === "class.assign") {
        await member(p.classId, u, true);
        await content(p.testId, u);
        if (!p.title || !Number.isFinite(Date.parse(p.deadline)))
          throw new HttpError(400, "Vazifa va muddatni tekshiring");
        await q(
          "INSERT INTO tm_assignments(id,class_id,test_id,title,instructions,deadline) VALUES($1,$2,$3,$4,$5,$6)",
          [
            randomUUID(),
            p.classId,
            p.testId,
            String(p.title).slice(0, 120),
            String(p.instructions || "").slice(0, 2000),
            p.deadline,
          ],
        );
        result = { ok: true };
      } else if (action === "class.grade") {
        const [s] = await q(
          "SELECT s.*,a.class_id FROM tm_submissions s JOIN tm_assignments a ON a.id=s.assignment_id WHERE s.id=$1",
          [p.submissionId],
        );
        if (!s) throw new HttpError(404, "Natija topilmadi");
        await member(s.class_id, u, true);
        if (![2, 3, 4, 5].includes(p.grade))
          throw new HttpError(400, "Baho 2–5 oralig‘ida bo‘lsin");
        await q(
          "UPDATE tm_submissions SET grade=$1,feedback=$2,graded_at=now() WHERE id=$3",
          [p.grade, String(p.comment || "").slice(0, 1000), s.id],
        );
        await q(
          "INSERT INTO tm_notifications(id,user_id,title,body) VALUES($1,$2,$3,$4)",
          [
            randomUUID(),
            s.user_id,
            "Vazifa baholandi",
            `Ustoz qo‘ygan baho: ${p.grade}`,
          ],
        );
        result = { ok: true };
      } else if (action === "notifications.read") {
        await q("UPDATE tm_notifications SET read=true WHERE user_id=$1", [
          u.id,
        ]);
        result = { ok: true };
      } else if (action === "tournament.join") {
        await content(p.id, u);
        await q(
          "INSERT INTO tm_enrollments(tournament_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
          [p.id, u.id],
        );
        result = { ok: true };
      } else if (action.startsWith("admin.")) {
        if (u.role !== "admin")
          throw new HttpError(403, "Faqat administrator uchun");
        const entity = String(p.entity);
        if (action === "admin.list")
          result =
            entity === "users"
              ? await q(
                  "SELECT id,name,email,role,pro_until,blocked FROM tm_users",
                )
              : await q("SELECT * FROM tm_content WHERE kind=$1", [entity]);
        else if (action === "admin.save") {
          if (entity === "users") {
            if (!["student", "teacher", "admin"].includes(p.item.role))
              throw new HttpError(400, "Rol noto‘g‘ri");
            await q(
              "UPDATE tm_users SET role=$1,pro_until=$2,blocked=$3 WHERE id=$4",
              [
                p.item.role,
                p.item.pro_until || null,
                !!p.item.blocked,
                p.item.id,
              ],
            );
          } else {
            if (
              ![
                "courses",
                "modules",
                "tests",
                "tournaments",
                "settings",
              ].includes(entity)
            )
              throw new HttpError(400, "Noto‘g‘ri bo‘lim");
            const item = p.item;
            await q(
              "INSERT INTO tm_content(id,kind,data,published,pro) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data,published=EXCLUDED.published,pro=EXCLUDED.pro",
              [
                item.id || randomUUID(),
                entity,
                JSON.stringify(item.data),
                !!item.published,
                !!item.pro,
              ],
            );
          }
          result = { ok: true };
        } else throw new HttpError(400, "Amal mavjud emas");
      } else throw new HttpError(400, "Amal mavjud emas");
    }
    return authJson({ data: result });
  } catch (e) {
    return authFailure(e);
  }
};
export const config = {
  path: ["/api/bootstrap", "/api/action"],
  rateLimit: {
    action: "rate_limit" as const,
    aggregateBy: ["ip", "domain"] as ("ip" | "domain")[],
    windowLimit: 150,
    windowSize: 60,
  },
};
