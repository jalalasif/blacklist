import { prisma } from "@/lib/prisma";
import { TaskDetail } from "@/components/task/TaskDetail";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function TaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const task = await prisma.task.findUnique({
    where: { id },
    include: { tags: { include: { tag: true } } },
  });

  if (!task) notFound();

  const serialized = {
    ...task,
    priority: task.priority as string,
    dueDate: task.dueDate?.toISOString() ?? null,
    completedAt: task.completedAt?.toISOString() ?? null,
    nextOccurrence: task.nextOccurrence?.toISOString() ?? null,
    reminderSentAt: task.reminderSentAt?.toISOString() ?? null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    tags: task.tags.map(({ tag }) => ({
      tag: { id: tag.id, name: tag.name, color: tag.color },
    })),
  };

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <Link
          href="/"
          className="text-[11px] tracking-[0.2em] uppercase text-black/40 hover:text-black transition-colors"
        >
          ← Back
        </Link>
        <h1 className="font-display text-3xl">Edit Task</h1>
      </div>
      {/* @ts-expect-error serialized type matches at runtime */}
      <TaskDetail task={serialized} />
    </div>
  );
}
