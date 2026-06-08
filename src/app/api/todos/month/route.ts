import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/middleware";
import { startOfMonth, endOfMonth, parseISO, format } from "date-fns";

export async function GET(req: NextRequest) {
  return requireAuth(req, async (userId) => {
    const monthParam = req.nextUrl.searchParams.get("month");
    if (!monthParam) {
      return Response.json({ error: "month query param required (yyyy-MM)" }, { status: 400 });
    }

    const base = parseISO(`${monthParam}-01`);
    const todos = await prisma.todo.findMany({
      where: {
        userId,
        date: { gte: startOfMonth(base), lte: endOfMonth(base) },
      },
      select: { id: true, date: true, completed: true, discarded: true },
    });

    const byDate: Record<string, { total: number; completed: number }> = {};
    for (const t of todos) {
      const ds = format(t.date, "yyyy-MM-dd");
      if (!byDate[ds]) byDate[ds] = { total: 0, completed: 0 };
      byDate[ds].total++;
      if (t.completed) byDate[ds].completed++;
    }

    return Response.json({ summaries: byDate });
  });
}
