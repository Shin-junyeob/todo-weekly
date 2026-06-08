import { prisma } from "@/lib/db/prisma";
import { getNextWeekday, isWeekend } from "@/lib/utils/weekday";
import { startOfDay, subDays, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const KST = "Asia/Seoul";

export async function rollover(): Promise<{ itemsRolled: number }> {
  const nowKST = toZonedTime(new Date(), KST);
  const today = startOfDay(nowKST);
  // Roll items from yesterday (or last Friday if today is Monday)
  const yesterday = subDays(today, isWeekend(subDays(today, 1)) ? 3 : 1);

  const pendingTodos = await prisma.todo.findMany({
    where: {
      date: startOfDay(yesterday),
      completed: false,
      discarded: false,
    },
  });

  const nextDay = getNextWeekday(yesterday);

  let itemsRolled = 0;
  for (const todo of pendingTodos) {
    // Idempotent: skip if already carried over (unique constraint on userId+date+carriedFromId)
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
        // P2002 = unique constraint violation → already rolled over
        if (e?.code !== "P2002") throw e;
      });
    itemsRolled++;
  }

  await prisma.cronLog.create({
    data: { itemsRolled, status: "success" },
  });

  return { itemsRolled };
}
