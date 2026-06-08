"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (localStorage.getItem("accessToken")) { router.replace("/"); return; }
      const res = await fetch("/api/auth/refresh", { method: "POST" });
      if (res.ok) {
        const { accessToken } = await res.json();
        localStorage.setItem("accessToken", accessToken);
        router.replace("/");
      } else {
        setLoading(false);
      }
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "로그인 실패");
      setLoading(false);
      return;
    }

    localStorage.setItem("accessToken", data.accessToken);
    router.push("/");
  };

  if (loading) return <div className="flex items-center justify-center h-screen">로딩 중...</div>;

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-8 text-green-700">Todo Weekly</h1>
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">로그인</h2>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일"
            required
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            required
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
          <p className="text-center text-sm text-gray-500">
            계정이 없으신가요?{" "}
            <Link href="/register" className="text-green-600 hover:underline">회원가입</Link>
          </p>
        </form>
      </div>
    </main>
  );
}
