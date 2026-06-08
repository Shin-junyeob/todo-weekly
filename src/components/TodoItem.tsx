"use client";

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  discarded: boolean;
  carriedFromId: string | null;
}

interface Props {
  todo: Todo;
  onToggleComplete: (id: string, completed: boolean) => void;
  onDiscard: (id: string) => void;
}

export default function TodoItem({ todo, onToggleComplete, onDiscard }: Props) {
  return (
    <li className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm border border-gray-100">
      {todo.carriedFromId && (
        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full whitespace-nowrap">
          이월
        </span>
      )}
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={(e) => onToggleComplete(todo.id, e.target.checked)}
        className="w-4 h-4 accent-green-600 cursor-pointer"
      />
      <span
        className={`flex-1 text-sm ${
          todo.completed ? "line-through text-green-600" : "text-gray-800"
        } ${todo.discarded ? "opacity-40" : ""}`}
      >
        {todo.title}
      </span>
      {!todo.completed && !todo.discarded && (
        <button
          onClick={() => onDiscard(todo.id)}
          className="text-xs text-red-400 hover:text-red-600 transition-colors"
        >
          버리기
        </button>
      )}
    </li>
  );
}
