import { NextRequest } from "next/server";
import { rollover } from "@/lib/cron/rollover";

// Vercel Cron calls this endpoint. Protect with CRON_SECRET.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await rollover();
    return Response.json({ ok: true, ...result });
  } catch (err) {
    console.error("Cron rollover failed:", err);
    return Response.json({ error: "Rollover failed" }, { status: 500 });
  }
}
