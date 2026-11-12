import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";
export default function AdminPage({
  onRefresh,
}: {
  data: any;
  onRefresh: () => Promise<void>;
}) {
  const { user } = useAuth();
  const [entity, setEntity] = useState("courses"),
    [items, setItems] = useState<any[]>([]),
    [selected, setSelected] = useState<any>(null),
    [text, setText] = useState(""),
    [error, setError] = useState("");
  async function load() {
    try {
      setItems(await api("admin.list", { entity }));
    } catch (e: any) {
      setError(e.message);
    }
  }
  useEffect(() => {
    if (user?.role === "admin") void load();
  }, [entity, user?.id]);
  if (user?.role !== "admin")
    return (
      <div className="empty-state">
        <h2>Administrator uchun</h2>
        <p>Bu bo‘limga kirish huquqi faqat administratorga beriladi.</p>
      </div>
    );
  return (
    <>
      <h1>Admin panel</h1>
      <p className="muted">
        Kontent, foydalanuvchilar va Pro obunani boshqaring.
      </p>
      <div className="tabs">
        {[
          ["courses", "Kurslar"],
          ["modules", "Modullar"],
          ["tests", "Testlar"],
          ["tournaments", "Turnirlar"],
          ["users", "Foydalanuvchilar"],
          ["settings", "Sozlamalar"],
        ].map(([k, v]) => (
          <button
            key={k}
            className={entity === k ? "active" : ""}
            onClick={() => {
              setEntity(k);
              setSelected(null);
            }}
          >
            {v}
          </button>
        ))}
      </div>
      {error && <p className="notice">{error}</p>}
      <button
        className="btn primary"
        onClick={() => {
          const i = {
            id: crypto.randomUUID(),
            published: false,
            pro: false,
            data: {
              title: "Yangi " + entity,
              subject: "math",
              description: "",
              lessons: [],
              testIds: [],
              questions: [],
            },
          };
          setSelected(i);
          setText(JSON.stringify(i, null, 2));
        }}
      >
        + Yangi qo‘shish
      </button>
      <div className="grid">
        {items.map((i) => (
          <button
            className="panel align-left"
            key={i.id}
            onClick={() => {
              setSelected(i);
              setText(JSON.stringify(i, null, 2));
            }}
          >
            <h3>{i.data?.title || i.name || i.id}</h3>
            <p>
              {i.published ? "Nashr etilgan" : "Qoralama"}{" "}
              {i.pro ? "· Pro" : ""}
            </p>
          </button>
        ))}
      </div>
      {selected && (
        <form
          className="panel form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api("admin.save", { entity, item: JSON.parse(text) });
              setSelected(null);
              await load();
              await onRefresh();
            } catch (e: any) {
              setError(e.message);
            }
          }}
        >
          <h2>Tahrirlash</h2>
          <p className="muted">
            Kontent muharriri: darslar, savollar, to‘g‘ri javoblar va nashr
            sozlamalari.
          </p>
          <textarea
            aria-label="Kontent JSON"
            rows={18}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button className="btn primary">Saqlash</button>
        </form>
      )}
    </>
  );
}
