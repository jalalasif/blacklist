"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTags } from "@/hooks/useTasks";
import { parseTask } from "@/lib/nlp/parseTask";
import { TagBadge } from "@/components/tag/TagBadge";
import type { TaskWithTags, Priority } from "@/types";

interface TaskDetailProps {
  task: TaskWithTags;
}

const PRIORITIES: Priority[] = ["HIGH", "MEDIUM", "LOW"];

export function TaskDetail({ task }: TaskDetailProps) {
  const router = useRouter();
  const { tags } = useTags();

  const [title, setTitle] = useState(task.title);
  const [priority, setPriority] = useState<Priority>(task.priority as Priority);
  const [tagIds, setTagIds] = useState<string[]>(
    task.tags.map(({ tag }) => tag.id)
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const preview = title.trim().length > 2 ? parseTask(title) : null;

  async function save() {
    setSaving(true);
    const nlp = parseTask(title);
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        cleanTitle: nlp.cleanTitle,
        priority,
        dueDate: nlp.dueDate?.toISOString() ?? null,
        recurrence: nlp.recurrence ?? null,
        tagIds,
      }),
    });
    setSaving(false);
    router.push("/");
    router.refresh();
  }

  async function handleDelete() {
    setDeleting(true);
    await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    router.push("/");
    router.refresh();
  }

  function toggleTag(id: string) {
    setTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  return (
    <div className="space-y-10 max-w-lg">
      {/* Title */}
      <div className="space-y-3">
        <label className="text-[11px] tracking-[0.2em] uppercase text-black/40 font-medium">
          Task
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border-0 border-b-2 border-black px-0 py-2 text-base font-medium bg-transparent focus:outline-none"
        />
        {preview && (
          <div className="border-l-2 border-black/20 pl-3 space-y-0.5 text-[11px] text-black/40">
            <div>{preview.cleanTitle}</div>
            {preview.dueDate && (
              <div>{preview.dueDate.toLocaleString()}</div>
            )}
            {preview.recurrence && <div>{preview.recurrence}</div>}
          </div>
        )}
      </div>

      {/* Priority */}
      <div className="space-y-3">
        <label className="text-[11px] tracking-[0.2em] uppercase text-black/40 font-medium">
          Priority
        </label>
        <div className="flex gap-0">
          {PRIORITIES.map((p) => (
            <button
              key={p}
              onClick={() => setPriority(p)}
              className={`text-xs font-medium tracking-[0.12em] uppercase px-5 py-2 border transition-colors ${
                priority === p
                  ? "border-black bg-black text-white"
                  : "border-black/20 text-black/40 hover:border-black hover:text-black"
              }`}
            >
              {p.toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="space-y-3">
          <label className="text-[11px] tracking-[0.2em] uppercase text-black/40 font-medium">
            Tags
          </label>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button key={tag.id} onClick={() => toggleTag(tag.id)}>
                <TagBadge
                  name={tag.name}
                  color={tag.color}
                  muted={!tagIds.includes(tag.id)}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-black/10">
        <button
          onClick={save}
          disabled={saving}
          className="flex-1 py-2.5 text-xs font-medium tracking-[0.15em] uppercase bg-black text-white hover:bg-white hover:text-black border border-black transition-colors disabled:opacity-30"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
        <button
          onClick={() => router.back()}
          className="px-6 py-2.5 text-xs font-medium tracking-[0.15em] uppercase border border-black/20 text-black/40 hover:border-black hover:text-black transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="px-6 py-2.5 text-xs font-medium tracking-[0.15em] uppercase border border-black/20 text-black/40 hover:border-black hover:text-black transition-colors disabled:opacity-30"
        >
          {deleting ? "…" : "Delete"}
        </button>
      </div>
    </div>
  );
}
