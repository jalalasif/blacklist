"use client";

import { useState, useCallback, useRef } from "react";
import { parseTask } from "@/lib/nlp/parseTask";
import { useTags } from "@/hooks/useTasks";
import { TagBadge } from "@/components/tag/TagBadge";
import type { ParsedTask, Priority } from "@/types";

const PRIORITY_LABELS: Record<Priority, string> = {
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

interface TaskInputProps {
  onCreated: () => void;
}

export function TaskInput({ onCreated }: TaskInputProps) {
  const [value, setValue] = useState("");
  const [preview, setPreview] = useState<ParsedTask | null>(null);
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { tags } = useTags();

  const updatePreview = useCallback((text: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (text.trim().length > 2) setPreview(parseTask(text));
      else setPreview(null);
    }, 280);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue(e.target.value);
    updatePreview(e.target.value);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawInput: value, priority, tagIds: selectedTagIds }),
      });
      if (res.ok) {
        setValue("");
        setPreview(null);
        setSelectedTagIds([]);
        setPriority("MEDIUM");
        onCreated();
      }
    } finally {
      setSubmitting(false);
    }
  }

  function toggleTag(id: string) {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Main input */}
      <div className="flex gap-0">
        <input
          value={value}
          onChange={handleChange}
          placeholder='e.g. "Submit report by next Friday at 3pm #work priority:high"'
          className="flex-1 border-0 border-b-2 border-black px-0 py-2 text-base font-medium bg-transparent focus:outline-none placeholder:text-black/25 placeholder:font-normal placeholder:text-sm"
          autoFocus
        />
        <button
          type="submit"
          disabled={submitting || !value.trim()}
          className="ml-6 text-xs font-medium tracking-[0.15em] uppercase border border-black px-6 py-2 bg-black text-white hover:bg-white hover:text-black transition-colors disabled:opacity-30 flex-shrink-0"
        >
          {submitting ? "Adding" : "Add"}
        </button>
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-6 flex-wrap">
        {/* Priority */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] tracking-[0.15em] uppercase text-black/40">Priority</span>
          {(["HIGH", "MEDIUM", "LOW"] as Priority[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              className={`text-[11px] font-medium tracking-wide uppercase px-2 py-0.5 transition-all ${
                priority === p
                  ? "bg-black text-white"
                  : "text-black/40 hover:text-black"
              }`}
            >
              {PRIORITY_LABELS[p]}
            </button>
          ))}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] tracking-[0.15em] uppercase text-black/40">Tags</span>
            {tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
              >
                <TagBadge
                  name={tag.name}
                  color={tag.color}
                  muted={!selectedTagIds.includes(tag.id)}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* NLP parse preview */}
      {preview && (
        <div className="border-l-2 border-black pl-4 space-y-1">
          <div className="text-sm font-medium">{preview.cleanTitle}</div>
          <div className="flex flex-wrap gap-4 text-[11px] text-black/50 tracking-wide">
            {preview.dueDate && (
              <span>
                {preview.dueDate.toLocaleString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            )}
            {preview.recurrence && <span>Recurring</span>}
            {preview.inlinePriority && (
              <span className="uppercase">{preview.inlinePriority}</span>
            )}
            {preview.inlineTags.map((t) => (
              <span key={t}>#{t}</span>
            ))}
          </div>
        </div>
      )}
    </form>
  );
}
