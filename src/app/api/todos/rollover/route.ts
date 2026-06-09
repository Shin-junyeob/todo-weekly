import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/middleware";
import { getNextWeekday, isWeekend } from "@/lib/utils/weekday";
import { startOfDay, subDays, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const KST = "Asia/Seoul";

export async function POST(req: NextRequest) {
  return requireAuth(req, async (userId) => {
    const nowKST = toZonedTime(new Date(), KST);
    const today = startOfDay(nowKST);
    const todayStr = format(today, "yyyy-MM-dd");

    // Already rolled over today?
    const alreadyDone = await prisma.cronLog.findFirst({
      where: {
        status: "success",
        runAt: { gte: today },
      },
    });
    if (alreadyDone) return Response.json({ ok: true, skipped: true });

    const yesterday = subDays(today, isWeekend(subDays(today, 1)) ? 3 : 1);

    const pendingTodos = await prisma.todo.findMany({
      where: {
        userId,
        date: startOfDay(yesterday),
        completed: false,
        discarded: false,
      },
    });

    const nextDay = getNextWeekday(yesterday);

    // Only roll over to today
    if (format(nextDay, "yyyy-MM-dd") !== todayStr) {
      return Response.json({ ok: true, skipped: true });
    }

    let itemsRolled = 0;
    for (const todo of pendingTodos) {
      await prisma.todo
        .create({
          data: {
            userId: todo.userId,
            title: todo.title,
            date: startOfDay(nextDay),
            carriedFromId: todo.id,
          },
        })
        .catch((e: { code?: string }) => {
          if (e?.code !== "P2002") throw e;
        });
      itemsRolled++;
    }

    await prisma.cronLog.create({
      data: { itemsRolled, status: "success" },
    });

    return Response.json({ ok: true, itemsRolled });
  });
}
