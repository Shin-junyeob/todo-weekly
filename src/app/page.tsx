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

function SelectedDayModal({ date, todos, onClose, onToggle, onDiscard, onAdd }: {
  date: string;
  todos: Todo[];
  onClose: () => void;
  onToggle: (id: string, completed: boolean) => void;
  onDiscard: (id: string) => void;
  onAdd: (title: string, date: string) => void;
}) {
  const [input, setInput] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onAdd(input.trim(), date);
    setInput("");
  };
  return (
    <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-t-2xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">{format(parseISO(date), "M월 d일 (EEEE)")}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <ul className="space-y-2 mb-4">
          {todos.length === 0 && <li className="text-sm text-gray-400">할 일이 없습니다.</li>}
          {todos.map((t) => (
            <li key={t.id} className="flex items-center gap-2 group">
              <button
                onClick={() => !t.discarded && onToggle(t.id, !t.completed)}
                className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition-colors
                  ${t.discarded ? "border-gray-200 bg-gray-100 cursor-default" : t.completed ? "bg-green-500 border-green-500" : "border-gray-300 hover:border-green-400"}`}
              >
                {t.completed && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
              </button>
              <span className={`text-sm flex-1 ${t.completed ? "line-through text-green-600" : t.discarded ? "line-through text-gray-400" : "text-gray-800"}`}>{t.title}</span>
              {!t.discarded && !t.completed && (
                <button onClick={() => onDiscard(t.id)} className="text-xs text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">버리기</button>
              )}
            </li>
          ))}
        </ul>
        <form onSubmit={submit} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="새 할 일 입력..."
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          <button type="submit" className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors">추가</button>
        </form>
      </div>
    </div>
  );
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
    const CACHE_KEY = `todos-${dateStr}`;
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
      // 하루 1회만 이월 실행 (sessionStorage로 중복 방지)
      if (!sessionStorage.getItem(`rolled-${dateStr}`)) {
        await authFetch("/api/todos/rollover", { method: "POST" });
        sessionStorage.setItem(`rolled-${dateStr}`, "1");
      }

      const res = await authFetch(`/api/todos?date=${dateStr}`);
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

  const handleSelectedToggle = (id: string, completed: boolean) => {
    setSelectedTodos((p) => p.map((t) => (t.id === id ? { ...t, completed } : t)));
    authFetch(`/api/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed }),
    }).then(() => { if (selectedDate) fetchMonth(calMonth); });
  };

  const handleSelectedDiscard = (id: string) => {
    setSelectedTodos((p) => p.map((t) => (t.id === id ? { ...t, discarded: true } : t)));
    authFetch(`/api/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discarded: true }),
    }).then(() => { if (selectedDate) fetchMonth(calMonth); });
  };

  const handleSelectedAdd = async (title: string, date: string) => {
    const res = await authFetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, date }),
    });
    if (res.ok) {
      const { todo } = await res.json();
      setSelectedTodos((p) => [...p, todo]);
      fetchMonth(calMonth);
    }
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
        <SelectedDayModal
          date={selectedDate}
          todos={selectedTodos}
          onClose={() => setSelectedDate(null)}
          onToggle={handleSelectedToggle}
          onDiscard={handleSelectedDiscard}
          onAdd={handleSelectedAdd}
        />
      )}
    </main>
  );
}
