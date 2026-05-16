"use client";

import { useState } from "react";
import { useTags } from "@/hooks/useTasks";

export function TagManager() {
  const { tags, mutate } = useTags();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function createTag() {
    if (!name.trim()) return;
    setSaving(true);
    await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), color: "#000000" }),
    });
    setName("");
    await mutate();
    setSaving(false);
  }

  async function deleteTag(id: string) {
    await fetch(`/api/tags/${id}`, { method: "DELETE" });
    await mutate();
  }

  return (
    <div className="space-y-8">
      {/* Create */}
      <div className="space-y-3">
        <label className="text-[11px] tracking-[0.2em] uppercase text-black/40 font-medium">
          New Tag
        </label>
        <div className="flex gap-0">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="tag name"
            onKeyDown={(e) => e.key === "Enter" && createTag()}
            className="flex-1 border border-black border-r-0 px-4 py-2.5 text-sm font-medium bg-white focus:outline-none placeholder:text-black/30"
          />
          <button
            onClick={createTag}
            disabled={saving || !name.trim()}
            className="border border-black px-6 py-2.5 text-xs font-medium tracking-[0.15em] uppercase bg-black text-white hover:bg-white hover:text-black transition-colors disabled:opacity-30"
          >
            Add
          </button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-px">
        {tags.length === 0 && (
          <p className="text-sm text-black/40 py-4">No tags yet.</p>
        )}
        {tags.map((tag) => (
          <div
            key={tag.id}
            className="flex items-center justify-between py-3 border-b border-black/10 group"
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">#{tag.name}</span>
              <span className="text-[11px] text-black/30 tabular-nums">
                {tag._count.tasks} task{tag._count.tasks !== 1 ? "s" : ""}
              </span>
            </div>
            <button
              onClick={() => deleteTag(tag.id)}
              className="text-[11px] tracking-wide uppercase text-black/30 hover:text-black opacity-0 group-hover:opacity-100 transition-all"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
