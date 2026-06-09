"use client";
import { useEffect, useState, useCallback } from "react";
import { format, isWeekend, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, parseISO } from "date-fns";
import { useRouter } from "next/navigation";
import TodoItem from "@/components/TodoItem";
import TodoInput from "@/components/TodoInput";

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  discarded: boolean;
  carriedFromId: string | null;
}

interface DaySummary { total: number; completed: number; }

function isTokenValid(token: string | null): boolean {
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 > Date.now() + 10_000;
  } catch { return false; }
}

async function refreshAccessToken(): Promise<string | null> {
  const res = await fetch("/api/auth/refresh", { method: "POST" });
  if (!res.ok) return null;
  const { accessToken } = await res.json();
  localStorage.setItem("accessToken", accessToken);
  return accessToken;
}

export default function TodayPage() {
  const router = useRouter();
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");

  const [activeDate, setActiveDate] = useState(todayStr);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [calMonth, setCalMonth] = useState(new Date());
  const [summaries, setSummaries] = useState<Record<string, DaySummary>>({});
  const [selectedCalDay, setSelectedCalDay] = useState<string | null>(null);

  const authFetch = useCallback(async (url: string, opts: RequestInit = {}): Promise<Response> => {
    let token = localStorage.getItem("accessToken");
    let res = await fetch(url, { ...opts, headers: { ...(opts.headers as Record<string, string>), Authorization: `Bearer ${token}` } });
    if (res.status === 401) {
      token = await refreshAccessToken();
      if (!token) { router.push("/login"); return res; }
      res = await fetch(url, { ...opts, headers: { ...(opts.headers as Record<string, string>), Authorization: `Bearer ${token}` } });
    }
    return res;
  }, [router]);

  const loadTodos = useCallback(async (date: string) => {
    const res = await authFetch(`/api/todos?date=${date}`);
    if (!res.ok) return;
    const data = await res.json();
    const sorted = [...data.todos].sort((a: Todo, b: Todo) =>
      a.carriedFromId ? -1 : b.carriedFromId ? 1 : 0
    );
    setTodos(sorted);
  }, [authFetch]);

  useEffect(() => {
    if (isWeekend(today)) { router.replace("/weekend"); return; }
    const CACHE_KEY = `todos-${todayStr}`;
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      setTodos(JSON.parse(cached));
      setLoading(false);
    }
    (async () => {
      const token = localStorage.getItem("accessToken");
      if (!isTokenValid(token)) {
        const refreshed = await refreshAccessToken();
        if (!refreshed) { router.push("/login"); return; }
      }
      if (!sessionStorage.getItem(`rolled-${todayStr}`)) {
        await authFetch("/api/todos/rollover", { method: "POST" });
        sessionStorage.setItem(`rolled-${todayStr}`, "1");
      }
      const res = await authFetch(`/api/todos?date=${todayStr}`);
      if (!res.ok) return;
      const data = await res.json();
      const sorted = [...data.todos].sort((a: Todo, b: Todo) =>
        a.carriedFromId ? -1 : b.carriedFromId ? 1 : 0
      );
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(sorted));
      setTodos(sorted);
      setLoading(false);
    })();
  }, []);

  const fetchMonth = useCallback(async (month: Date) => {
    const monthStr = format(month, "yyyy-MM");
    const res = await authFetch(`/api/todos/month?month=${monthStr}`);
    if (res.ok) {
      const { summaries } = await res.json();
      setSummaries(summaries);
    }
  }, [authFetch]);

  useEffect(() => { if (!loading) fetchMonth(calMonth); }, [calMonth, loading]);

  const handleDayClick = async (ds: string) => {
    setSelectedCalDay(ds);
    setActiveDate(ds);
    await loadTodos(ds);
    fetchMonth(calMonth);
  };

  const handleAdd = async (title: string) => {
    const res = await authFetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, date: activeDate }),
    });
    if (res.ok) {
      const { todo } = await res.json();
      setTodos((p) => [...p, todo]);
      fetchMonth(calMonth);
    }
  };

  const handleToggle = (id: string, completed: boolean) => {
    setTodos((p) => p.map((t) => (t.id === id ? { ...t, completed } : t)));
    authFetch(`/api/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed }),
    }).then(() => fetchMonth(calMonth));
  };

  const handleDiscard = (id: string) => {
    setTodos((p) => p.map((t) => (t.id === id ? { ...t, discarded: true } : t)));
    authFetch(`/api/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discarded: true }),
    }).then(() => fetchMonth(calMonth));
  };

  const handleLogout = async () => {
    localStorage.removeItem("accessToken");
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/login");
  };

  if (loading) return <div className="flex items-center justify-center h-screen">로딩 중...</div>;

  const isViewingToday = activeDate === todayStr;
  const completedCount = todos.filter((t) => t.completed).length;
  const calDays = eachDayOfInterval({ start: startOfMonth(calMonth), end: endOfMonth(calMonth) });
  const firstDay = getDay(startOfMonth(calMonth));

  return (
    <main className="max-w-lg mx-auto p-4 pb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">
              {isViewingToday ? "오늘의 할 일" : format(parseISO(activeDate), "M월 d일 할 일")}
            </h1>
            {!isViewingToday && (
              <button
                onClick={() => { setActiveDate(todayStr); setSelectedCalDay(null); loadTodos(todayStr); }}
                className="text-xs text-green-600 border border-green-300 rounded-full px-2 py-0.5 hover:bg-green-50"
              >
                오늘로
              </button>
            )}
          </div>
          <p className="text-sm text-gray-500">
            {format(parseISO(activeDate), "yyyy년 M월 d일 (EEEE)")}
          </p>
        </div>
        <button onClick={handleLogout} className="text-sm text-red-400 hover:text-red-600">로그아웃</button>
      </div>

      <p className="text-sm text-gray-500 mb-3">{completedCount}/{todos.length} 완료</p>

      <ul className="space-y-2">
        {todos.map((todo) => (
          <TodoItem key={todo.id} todo={todo} onToggleComplete={handleToggle} onDiscard={handleDiscard} />
        ))}
      </ul>

      <TodoInput onAdd={handleAdd} />

      <div className="mt-8 border-t border-gray-100 pt-6">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setCalMonth((m) => subMonths(m, 1))} className="text-gray-400 hover:text-gray-600 px-2 text-lg">‹</button>
          <h2 className="text-sm font-semibold text-gray-700">{format(calMonth, "yyyy년 M월")}</h2>
          <button onClick={() => setCalMonth((m) => addMonths(m, 1))} className="text-gray-400 hover:text-gray-600 px-2 text-lg">›</button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-400 mb-1">
          {["일","월","화","수","목","금","토"].map((d) => <span key={d}>{d}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
          {calDays.map((day) => {
            const ds = format(day, "yyyy-MM-dd");
            const s = summaries[ds];
            const isToday = ds === todayStr;
            const isSelected = ds === selectedCalDay;
            return (
              <button
                key={ds}
                onClick={() => handleDayClick(ds)}
                className={`aspect-square flex flex-col items-center justify-center rounded-lg text-xs transition-colors
                  ${isToday ? "bg-green-600 text-white" : isSelected ? "bg-green-100 text-green-800 ring-1 ring-green-400" : "hover:bg-green-50 text-gray-700"}`}
              >
                <span className="font-medium">{format(day, "d")}</span>
                {s && s.total > 0 && (
                  <span className={`text-[9px] mt-0.5 ${isToday ? "text-green-100" : s.completed === s.total ? "text-green-600" : "text-gray-400"}`}>
                    {s.completed}/{s.total}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}
