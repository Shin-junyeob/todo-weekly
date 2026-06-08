import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/middleware";
import { getMondayOfWeek } from "@/lib/utils/weekday";
import { addDays, startOfDay, endOfDay, parseISO } from "date-fns";

// Returns Mon–Fri todos for the week containing the given date
export async function GET(req: NextRequest) {
  return requireAuth(req, async (userId) => {
    const dateParam = req.nextUrl.searchParams.get("date");
    const refDate = dateParam ? parseISO(dateParam) : new Date();
    const monday = getMondayOfWeek(refDate);
    const friday = addDays(monday, 4);

    const todos = await prisma.todo.findMany({
      where: {
        userId,
        date: { gte: startOfDay(monday), lte: endOfDay(friday) },
      },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    });

    return Response.json({ todos, weekStart: monday, weekEnd: friday });
  });
}
