import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/middleware";
import { isWeekend } from "@/lib/utils/weekday";
import { parseISO, startOfDay, endOfDay } from "date-fns";

export async function GET(req: NextRequest) {
  return requireAuth(req, async (userId) => {
    const dateParam = req.nextUrl.searchParams.get("date");
    if (!dateParam) {
      return Response.json({ error: "date query param required" }, { status: 400 });
    }

    const date = parseISO(dateParam);
    const todos = await prisma.todo.findMany({
      where: {
        userId,
        date: { gte: startOfDay(date), lte: endOfDay(date) },
      },
      orderBy: [{ carriedFromId: "asc" }, { createdAt: "asc" }],
    });

    return Response.json({ todos });
  });
}

export async function POST(req: NextRequest) {
  return requireAuth(req, async (userId) => {
    const { title, date: dateStr } = await req.json();
    if (!title || !dateStr) {
      return Response.json({ error: "title and date required" }, { status: 400 });
    }

    const date = parseISO(dateStr);
    if (isWeekend(date)) {
      return Response.json({ error: "Cannot create todos on weekends" }, { status: 403 });
    }

    const todo = await prisma.todo.create({
      data: { userId, title, date: startOfDay(date) },
    });

    return Response.json({ todo }, { status: 201 });
  });
}
