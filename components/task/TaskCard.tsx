"use client";

import { useState } from "react";
import Link from "next/link";
import { TagBadge } from "@/components/tag/TagBadge";
import type { TaskWithTags, Priority } from "@/types";

const PRIORITY_DOT: Record<Priority, string> = {
  HIGH: "bg-black",
  MEDIUM: "bg-black/40",
  LOW: "bg-black/15",
};

const PRIORITY_LABEL: Record<Priority, string> = {
  HIGH: "High",
  MEDIUM: "Med",
  LOW: "Low",
};

interface TaskCardProps {
  task: TaskWithTags;
  onUpdate: () => void;
  onDelete: () => void;
}

export function TaskCard({ task, onUpdate, onDelete }: TaskCardProps) {
  const [toggling, setToggling] = useState(false);

  async function toggleComplete() {
    setToggling(true);
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !task.completed }),
    });
    onUpdate();
    setToggling(false);
  }

  async function handleDelete() {
    await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    onDelete();
  }

  const isOverdue =
    !task.completed && task.dueDate && new Date(task.dueDate) < new Date();

  return (
    <div
      className={`group flex items-start gap-4 py-4 border-b border-black/10 transition-opacity ${
        task.completed ? "opacity-40" : ""
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={toggleComplete}
        disabled={toggling}
        className={`mt-0.5 w-4 h-4 flex-shrink-0 border transition-colors flex items-center justify-center ${
          task.completed
            ? "bg-black border-black"
            : "border-black/40 hover:border-black"
        }`}
        aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
      >
        {task.completed && (
          <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 text-white">
            <path
              d="M1.5 5l2.5 2.5 4.5-4"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-start gap-2">
          <span
            className={`text-sm font-medium leading-snug ${
              task.completed ? "line-through" : ""
            }`}
          >
            {task.cleanTitle}
          </span>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Priority */}
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[task.priority as Priority]}`} />
            <span className="text-[11px] text-black/40 uppercase tracking-wide">
              {PRIORITY_LABEL[task.priority as Priority]}
            </span>
          </div>

          {/* Due date */}
          {task.dueDate && (
            <span
              className={`text-[11px] tracking-wide ${
                isOverdue ? "text-black font-medium" : "text-black/40"
              }`}
            >
              {isOverdue && "Overdue · "}
              {new Date(task.dueDate).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          )}

          {/* Recurrence */}
          {task.recurrence && (
            <span className="text-[11px] text-black/40 tracking-wide">Recurring</span>
          )}

          {/* Tags */}
          {task.tags.map(({ tag }) => (
            <TagBadge key={tag.id} name={tag.name} color={tag.color} muted />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <Link
          href={`/tasks/${task.id}`}
          className="text-[11px] tracking-[0.1em] uppercase text-black/40 hover:text-black transition-colors"
        >
          Edit
        </Link>
        <button
          onClick={handleDelete}
          className="text-[11px] tracking-[0.1em] uppercase text-black/40 hover:text-black transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
