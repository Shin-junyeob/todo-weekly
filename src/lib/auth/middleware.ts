import { NextRequest } from "next/server";
import { verifyAccessToken } from "./jwt";

export function getUserIdFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.slice(7);
    const { userId } = verifyAccessToken(token);
    return userId;
  } catch {
    return null;
  }
}

export function requireAuth(
  req: NextRequest,
  handler: (userId: string) => Promise<Response>
): Promise<Response> {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return Promise.resolve(
      Response.json({ error: "Unauthorized" }, { status: 401 })
    );
  }
  return handler(userId);
}
