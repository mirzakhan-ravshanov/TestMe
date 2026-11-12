import { authenticate, authJson, authFailure } from "../../server/auth";
export default async (req: Request) => {
  if (req.method !== "GET")
    return authJson({ error: "Method not allowed" }, 405);
  try {
    return authJson({ user: await authenticate(req) });
  } catch (e) {
    return authFailure(e);
  }
};
