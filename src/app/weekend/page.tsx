"use client";
import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { isWeekday } from "@/lib/utils/weekday";
import { useRouter } from "next/navigation";

interface Todo {
  id: string;
  title: string;
  date: string;
  completed: boolean;
  discarded: boolean;
  carriedFromId: string | null;
}

export default function WeekendPage() {
  const router = useRouter();
  const [todosByDay, setTodosByDay] = useState<Record<string, Todo[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isWeekday(new Date())) {
      router.replace("/");
      return;
    }
    fetchWeekTodos();
  }, []);

  const token = () => localStorage.getItem("accessToken");

  const fetchWeekTodos = async () => {
    const res = await fetch(`/api/todos/week?date=${format(new Date(), "yyyy-MM-dd")}`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    if (res.status === 401) { router.push("/login"); return; }
    const data = await res.json();
    const grouped: Record<string, Todo[]> = {};
    for (const todo of data.todos as Todo[]) {
      const day = format(parseISO(todo.date), "yyyy-MM-dd");
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(todo);
    }
    setTodosByDay(grouped);
    setLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center h-screen">로딩 중...</div>;

  const days = Object.keys(todosByDay).sort();

  return (
    <main className="max-w-lg mx-auto p-4">
      <h1 className="text-xl font-bold mb-1">이번 주 기록</h1>
      <p className="text-sm text-gray-500 mb-6">주말에는 편집이 불가합니다.</p>

      {days.length === 0 && <p className="text-gray-400 text-sm">이번 주 기록이 없습니다.</p>}

      {days.map((day) => {
        const todos = todosByDay[day];
        const completed = todos.filter((t) => t.completed).length;
        return (
          <section key={day} className="mb-6">
            <h2 className="text-sm font-semibold text-gray-600 mb-2">
              {format(parseISO(day), "M월 d일 (EEE)")} — {completed}/{todos.length}
            </h2>
            <ul className="space-y-1">
              {todos.map((todo) => (
                <li key={todo.id} className="flex items-center gap-2 text-sm p-2 bg-white rounded border border-gray-100">
                  <span className={todo.completed ? "line-through text-green-600 flex-1" : "flex-1 text-gray-800"}>
                    {todo.title}
                  </span>
                  {!todo.completed && !todo.discarded && (
                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                      월요일 Todo에 추가됨
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </main>
  );
}
