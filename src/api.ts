export async function api<T = any>(
  action: string,
  payload: Record<string, any> = {},
): Promise<T> {
  const response = await fetch("/api/action", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
  });
  const json = await response
    .json()
    .catch(() => ({ error: "Server bilan bog‘lanib bo‘lmadi." }));
  if (!response.ok || json.error)
    throw new Error(
      typeof json.error === "string"
        ? json.error
        : json.error?.message || "So‘rovni bajarib bo‘lmadi.",
    );
  return json.data as T;
}
export async function loadBootstrap() {
  const response = await fetch("/api/bootstrap", {
    credentials: "same-origin",
  });
  const json = await response
    .json()
    .catch(() => ({ error: "Server bilan bog‘lanib bo‘lmadi." }));
  if (!response.ok || json.error)
    throw new Error(
      typeof json.error === "string"
        ? json.error
        : "Ma’lumotlarni yuklab bo‘lmadi.",
    );
  return json.data;
}
