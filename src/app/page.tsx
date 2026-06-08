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

async function refreshAccessToken(): Promise<string | null> {
  const res = await fetch("/api/auth/refresh", { method: "POST" });
  if (!res.ok) return null;
  const { accessToken } = await res.json();
  localStorage.setItem("accessToken", accessToken);
  return accessToken;
}

export default function TodayPage() {
  const router = useRouter();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [calMonth, setCalMonth] = useState(new Date());
  const [summaries, setSummaries] = useState<Record<string, DaySummary>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTodos, setSelectedTodos] = useState<Todo[]>([]);
  const today = new Date();
  const dateStr = format(today, "yyyy-MM-dd");

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

  useEffect(() => {
    if (isWeekend(today)) { router.replace("/weekend"); return; }
    (async () => {
      if (!localStorage.getItem("accessToken")) {
        const refreshed = await refreshAccessToken();
        if (!refreshed) { router.push("/login"); return; }
      }
      const res = await authFetch(`/api/todos?date=${dateStr}`);
      if (!res.ok) return;
      const data = await res.json();
      const sorted = [...data.todos].sort((a: Todo, b: Todo) =>
        a.carriedFromId ? -1 : b.carriedFromId ? 1 : 0
      );
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

  const handleAdd = async (title: string) => {
    const res = await authFetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, date: dateStr }),
    });
    if (res.ok) { const { todo } = await res.json(); setTodos((p) => [...p, todo]); }
  };

  const handleToggle = async (id: string, completed: boolean) => {
    setTodos((p) => p.map((t) => (t.id === id ? { ...t, completed } : t)));
    authFetch(`/api/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed }),
    });
  };

  const handleDiscard = async (id: string) => {
    setTodos((p) => p.map((t) => (t.id === id ? { ...t, discarded: true } : t)));
    authFetch(`/api/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discarded: true }),
    });
  };

  const handleDayClick = async (ds: string) => {
    setSelectedDate(ds);
    const res = await authFetch(`/api/todos?date=${ds}`);
    if (res.ok) { const { todos } = await res.json(); setSelectedTodos(todos); }
  };

  const handleLogout = async () => {
    localStorage.removeItem("accessToken");
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/login");
  };

  if (loading) return <div className="flex items-center justify-center h-screen">로딩 중...</div>;

  const completedCount = todos.filter((t) => t.completed).length;
  const calDays = eachDayOfInterval({ start: startOfMonth(calMonth), end: endOfMonth(calMonth) });
  const firstDay = getDay(startOfMonth(calMonth));

  return (
    <main className="max-w-lg mx-auto p-4 pb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">오늘의 할 일</h1>
          <p className="text-sm text-gray-500">{format(today, "yyyy년 M월 d일 (EEEE)")}</p>
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
            const isToday = ds === dateStr;
            return (
              <button
                key={ds}
                onClick={() => handleDayClick(ds)}
                className={`aspect-square flex flex-col items-center justify-center rounded-lg text-xs transition-colors
                  ${isToday ? "bg-green-600 text-white" : "hover:bg-green-50 text-gray-700"}`}
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

      {selectedDate && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50" onClick={() => setSelectedDate(null)}>
          <div className="bg-white rounded-t-2xl w-full max-w-lg p-6 max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">{format(parseISO(selectedDate), "M월 d일")}</h3>
              <button onClick={() => setSelectedDate(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            {selectedTodos.length === 0
              ? <p className="text-sm text-gray-400">할 일이 없습니다.</p>
              : <ul className="space-y-2">
                  {selectedTodos.map((t) => (
                    <li key={t.id} className="text-sm flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${t.completed ? "bg-green-500" : t.discarded ? "bg-gray-300" : "bg-amber-400"}`} />
                      <span className={t.completed ? "line-through text-green-600" : t.discarded ? "text-gray-400 line-through" : "text-gray-800"}>{t.title}</span>
                    </li>
                  ))}
                </ul>
            }
          </div>
        </div>
      )}
    </main>
  );
}
