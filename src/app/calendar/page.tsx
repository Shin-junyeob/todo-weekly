"use client";
import { useEffect, useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, parseISO, startOfDay } from "date-fns";
import { useRouter } from "next/navigation";

interface DaySummary {
  total: number;
  completed: number;
}

export default function CalendarPage() {
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [summaries, setSummaries] = useState<Record<string, DaySummary>>({});

  const token = () => localStorage.getItem("accessToken");

  const fetchMonth = async (month: Date) => {
    const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
    const results: Record<string, DaySummary> = {};
    await Promise.all(
      days.map(async (day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        const res = await fetch(`/api/todos?date=${dateStr}`, {
          headers: { Authorization: `Bearer ${token()}` },
        });
        if (res.ok) {
          const { todos } = await res.json();
          results[dateStr] = { total: todos.length, completed: todos.filter((t: { completed: boolean }) => t.completed).length };
        }
      })
    );
    setSummaries(results);
  };

  useEffect(() => { fetchMonth(currentMonth); }, [currentMonth]);

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const firstDay = getDay(startOfMonth(currentMonth)); // 0=Sun

  return (
    <main className="max-w-lg mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCurrentMonth((m) => subMonths(m, 1))} className="text-gray-500 hover:text-gray-700 text-lg">‹</button>
        <h1 className="text-lg font-bold">{format(currentMonth, "yyyy년 M월")}</h1>
        <button onClick={() => setCurrentMonth((m) => addMonths(m, 1))} className="text-gray-500 hover:text-gray-700 text-lg">›</button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-400 mb-1">
        {["일", "월", "화", "수", "목", "금", "토"].map((d) => <span key={d}>{d}</span>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const s = summaries[dateStr];
          return (
            <button
              key={dateStr}
              onClick={() => router.push(`/calendar/${dateStr}`)}
              className="aspect-square flex flex-col items-center justify-center rounded-lg hover:bg-green-50 transition-colors text-xs"
            >
              <span className="font-medium">{format(day, "d")}</span>
              {s && s.total > 0 && (
                <span className={`text-[10px] mt-0.5 ${s.completed === s.total ? "text-green-600" : "text-gray-400"}`}>
                  {s.completed}/{s.total}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <button onClick={() => router.push("/")} className="mt-6 text-sm text-gray-500 hover:text-gray-700">← 오늘로</button>
    </main>
  );
}
