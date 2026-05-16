import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushNotification } from "@/lib/push/webpush";
import { RRule } from "rrule";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const windowEnd = new Date(now.getTime() + 5 * 60 * 1000); // 5-min look-ahead

  // Find tasks due soon that haven't had a reminder sent
  const tasks = await prisma.task.findMany({
    where: {
      completed: false,
      OR: [
        {
          dueDate: { lte: windowEnd },
          recurrence: null,
          reminderSentAt: null,
        },
        {
          nextOccurrence: { lte: windowEnd },
          recurrence: { not: null },
          OR: [
            { reminderSentAt: null },
            { reminderSentAt: { lt: prisma.task.fields.nextOccurrence } },
          ],
        },
      ],
    },
  });

  if (tasks.length === 0) return NextResponse.json({ notified: 0 });

  const subscriptions = await prisma.subscription.findMany();
  if (subscriptions.length === 0) return NextResponse.json({ notified: 0 });

  let notified = 0;

  for (const task of tasks) {
    // Send to all subscribers
    await Promise.allSettled(
      subscriptions.map((sub) =>
        sendPushNotification(sub, {
          title: "Task due soon",
          body: task.cleanTitle,
          taskId: task.id,
        })
      )
    );

    // Advance nextOccurrence for recurring tasks
    let nextOccurrence: Date | null = null;
    if (task.recurrence) {
      try {
        const rule = RRule.fromString(task.recurrence);
        nextOccurrence = rule.after(now, false);
      } catch {
        nextOccurrence = null;
      }
    }

    await prisma.task.update({
      where: { id: task.id },
      data: {
        reminderSentAt: now,
        ...(nextOccurrence !== null && { nextOccurrence }),
      },
    });

    notified++;
  }

  return NextResponse.json({ notified });
}
