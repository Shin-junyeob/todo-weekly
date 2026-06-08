export async function POST() {
  const res = new Response(JSON.stringify({ ok: true }), { status: 200 });
  res.headers.set("Set-Cookie", "refreshToken=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict");
  return res;
}
