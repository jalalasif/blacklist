import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseTask } from "@/lib/nlp/parseTask";
import { CreateTaskSchema, TaskFilterSchema } from "@/types";
import { Priority } from "@prisma/client";

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams);
  const filters = TaskFilterSchema.safeParse(params);

  if (!filters.success) {
    return NextResponse.json({ error: filters.error.flatten() }, { status: 400 });
  }

  const { tag, priority, completed, dueBefore, dueAfter, search } = filters.data;

  const tasks = await prisma.task.findMany({
    where: {
      ...(completed !== undefined && { completed }),
      ...(priority && { priority: priority as Priority }),
      ...(dueBefore && { dueDate: { lte: new Date(dueBefore) } }),
      ...(dueAfter && { dueDate: { gte: new Date(dueAfter) } }),
      ...(search && {
        OR: [
          { cleanTitle: { contains: search, mode: "insensitive" } },
          { title: { contains: search, mode: "insensitive" } },
        ],
      }),
      ...(tag && {
        tags: { some: { tag: { name: { equals: tag, mode: "insensitive" } } } },
      }),
    },
    include: { tags: { include: { tag: true } } },
    orderBy: [{ completed: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = CreateTaskSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { rawInput, priority: overridePriority, tagIds: overrideTagIds } = parsed.data;
  const nlp = parseTask(rawInput);

  const priority: Priority =
    overridePriority ?? nlp.inlinePriority ?? "MEDIUM";

  // Resolve inline tags to IDs (create if missing)
  const allTagIds = [...(overrideTagIds ?? [])];
  for (const tagName of nlp.inlineTags) {
    const tag = await prisma.tag.upsert({
      where: { name: tagName },
      update: {},
      create: { name: tagName },
    });
    if (!allTagIds.includes(tag.id)) allTagIds.push(tag.id);
  }

  const task = await prisma.task.create({
    data: {
      title: rawInput,
      cleanTitle: nlp.cleanTitle,
      priority,
      dueDate: nlp.dueDate,
      recurrence: nlp.recurrence,
      nextOccurrence: nlp.nextOccurrence,
      tags: {
        create: allTagIds.map((id) => ({ tag: { connect: { id } } })),
      },
    },
    include: { tags: { include: { tag: true } } },
  });

  return NextResponse.json(task, { status: 201 });
}
