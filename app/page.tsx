"use client";

import { useTasks } from "@/hooks/useTasks";
import { TaskInput } from "@/components/task/TaskInput";
import { TaskList } from "@/components/task/TaskList";

export default function HomePage() {
  const { mutate } = useTasks();

  return (
    <div className="space-y-12">
      {/* Hero heading */}
      <div className="space-y-1 pt-2">
        <p className="text-[11px] tracking-[0.25em] uppercase text-black/40 font-medium">
          Today&apos;s focus
        </p>
        <h1 className="font-display text-4xl leading-tight">
          What needs<br />
          <em>doing?</em>
        </h1>
      </div>

      {/* Input */}
      <div className="border-t border-b border-black py-6">
        <TaskInput onCreated={mutate} />
      </div>

      {/* Task list */}
      <TaskList />
    </div>
  );
}
