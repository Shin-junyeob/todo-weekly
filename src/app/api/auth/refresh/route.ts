import { NextRequest } from "next/server";
import { verifyRefreshToken, signAccessToken } from "@/lib/auth/jwt";

export async function POST(req: NextRequest) {
  const cookie = req.cookies.get("refreshToken");
  if (!cookie) {
    return Response.json({ error: "No refresh token" }, { status: 401 });
  }

  try {
    const { userId } = verifyRefreshToken(cookie.value);
    const accessToken = signAccessToken(userId);
    return Response.json({ accessToken });
  } catch {
    return Response.json({ error: "Invalid refresh token" }, { status: 401 });
  }
}
