import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/middleware";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return requireAuth(req, async (userId) => {
    const todo = await prisma.todo.findUnique({ where: { id: params.id } });
    if (!todo || todo.userId !== userId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const updated = await prisma.todo.update({
      where: { id: params.id },
      data: {
        ...(typeof body.completed === "boolean" && { completed: body.completed }),
        ...(typeof body.discarded === "boolean" && { discarded: body.discarded }),
      },
    });

    return Response.json({ todo: updated });
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return requireAuth(req, async (userId) => {
    const todo = await prisma.todo.findUnique({ where: { id: params.id } });
    if (!todo || todo.userId !== userId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.todo.delete({ where: { id: params.id } });
    return Response.json({ success: true });
  });
}
