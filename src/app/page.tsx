"use client";
import { useEffect, useState } from "react";
import { format, isWeekend } from "date-fns";
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

export default function TodayPage() {
  const router = useRouter();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date();
  const dateStr = format(today, "yyyy-MM-dd");

  useEffect(() => {
    if (isWeekend(today)) {
      router.replace("/weekend");
      return;
    }
    fetchTodos();
  }, []);

  const token = () =>
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  const fetchTodos = async () => {
    const res = await fetch(`/api/todos?date=${dateStr}`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    if (res.status === 401) { router.push("/login"); return; }
    const data = await res.json();
    // Carried-over items first
    const sorted = [...data.todos].sort((a: Todo, b: Todo) =>
      a.carriedFromId ? -1 : b.carriedFromId ? 1 : 0
    );
    setTodos(sorted);
    setLoading(false);
  };

  const handleAdd = async (title: string) => {
    const res = await fetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ title, date: dateStr }),
    });
    if (res.ok) { const { todo } = await res.json(); setTodos((p) => [...p, todo]); }
  };

  const handleToggle = async (id: string, completed: boolean) => {
    await fetch(`/api/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ completed }),
    });
    setTodos((p) => p.map((t) => (t.id === id ? { ...t, completed } : t)));
  };

  const handleDiscard = async (id: string) => {
    await fetch(`/api/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ discarded: true }),
    });
    setTodos((p) => p.map((t) => (t.id === id ? { ...t, discarded: true } : t)));
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    router.push("/login");
  };

  if (loading) return <div className="flex items-center justify-center h-screen">로딩 중...</div>;

  const completedCount = todos.filter((t) => t.completed).length;

  return (
    <main className="max-w-lg mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">오늘의 할 일</h1>
          <p className="text-sm text-gray-500">{format(today, "yyyy년 M월 d일 (EEEE)", { locale: undefined })}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.push("/calendar")} className="text-sm text-gray-500 hover:text-gray-700">캘린더</button>
          <button onClick={handleLogout} className="text-sm text-red-400 hover:text-red-600">로그아웃</button>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-3">{completedCount}/{todos.length} 완료</p>

      <ul className="space-y-2">
        {todos.map((todo) => (
          <TodoItem
            key={todo.id}
            todo={todo}
            onToggleComplete={handleToggle}
            onDiscard={handleDiscard}
          />
        ))}
      </ul>

      <TodoInput onAdd={handleAdd} />
    </main>
  );
}
