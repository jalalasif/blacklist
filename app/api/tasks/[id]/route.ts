import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UpdateTaskSchema } from "@/types";
import { Priority } from "@prisma/client";
import { RRule } from "rrule";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const task = await prisma.task.findUnique({
    where: { id },
    include: { tags: { include: { tag: true } } },
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(task);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = UpdateTaskSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { tagIds, completed, dueDate, recurrence, ...rest } = parsed.data;

  let nextOccurrence: Date | null | undefined = undefined;
  if (recurrence !== undefined) {
    if (recurrence) {
      try {
        const rule = RRule.fromString(recurrence);
        nextOccurrence = rule.after(new Date(), true);
      } catch {
        nextOccurrence = null;
      }
    } else {
      nextOccurrence = null;
    }
  }

  const task = await prisma.task.update({
    where: { id },
    data: {
      ...rest,
      ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      ...(recurrence !== undefined && { recurrence }),
      ...(nextOccurrence !== undefined && { nextOccurrence }),
      ...(completed !== undefined && {
        completed,
        completedAt: completed ? new Date() : null,
      }),
      ...(rest.priority && { priority: rest.priority as Priority }),
      ...(tagIds !== undefined && {
        tags: {
          deleteMany: {},
          create: tagIds.map((tid) => ({ tag: { connect: { id: tid } } })),
        },
      }),
    },
    include: { tags: { include: { tag: true } } },
  });

  return NextResponse.json(task);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.task.delete({ where: { id } }).catch(() => null);
  return new NextResponse(null, { status: 204 });
}
