"use client";
import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { useRouter } from "next/navigation";

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  discarded: boolean;
  carriedFromId: string | null;
}

export default function CalendarDayPage({ params }: { params: { date: string } }) {
  const router = useRouter();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const token = () => localStorage.getItem("accessToken");

  useEffect(() => {
    fetch(`/api/todos?date=${params.date}`, {
      headers: { Authorization: `Bearer ${token()}` },
    })
      .then((r) => r.json())
      .then((d) => { setTodos(d.todos); setLoading(false); });
  }, [params.date]);

  const completed = todos.filter((t) => t.completed).length;

  if (loading) return <div className="flex items-center justify-center h-screen">로딩 중...</div>;

  return (
    <main className="max-w-lg mx-auto p-4">
      <button onClick={() => router.back()} className="text-sm text-gray-500 mb-4 hover:text-gray-700">← 캘린더</button>
      <h1 className="text-xl font-bold mb-1">{format(parseISO(params.date), "yyyy년 M월 d일 (EEE)")}</h1>
      <p className="text-sm text-gray-500 mb-4">{completed}/{todos.length} 완료</p>

      {todos.length === 0 && <p className="text-gray-400 text-sm">기록이 없습니다.</p>}

      <ul className="space-y-2">
        {todos.map((todo) => (
          <li key={todo.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100">
            {todo.carriedFromId && (
              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">이월</span>
            )}
            <span className={`flex-1 text-sm ${todo.completed ? "line-through text-green-600" : "text-gray-800"}`}>
              {todo.title}
            </span>
            {!todo.completed && !todo.discarded && (
              <span className="text-xs text-gray-400">미완료</span>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
