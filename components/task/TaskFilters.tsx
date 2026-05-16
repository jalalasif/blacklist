"use client";

import { useTags } from "@/hooks/useTasks";
import type { Priority } from "@/types";

interface Filters {
  tag: string;
  priority: string;
  completed: string;
  search: string;
}

interface TaskFiltersProps {
  filters: Filters;
  onChange: (f: Partial<Filters>) => void;
}

const PRIORITIES: Array<{ value: Priority | ""; label: string }> = [
  { value: "", label: "All" },
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
];

const STATUS = [
  { value: "", label: "Active" },
  { value: "true", label: "Done" },
  { value: "all", label: "All" },
];

export function TaskFilters({ filters, onChange }: TaskFiltersProps) {
  const { tags } = useTags();
  const hasActiveFilters = filters.tag || filters.priority || filters.search;

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex gap-0">
        <input
          type="text"
          placeholder="Search tasks…"
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
          className="flex-1 border-b border-black/20 px-0 py-1.5 text-sm bg-white focus:outline-none focus:border-black transition-colors placeholder:text-black/30"
        />
        {hasActiveFilters && (
          <button
            onClick={() => onChange({ tag: "", priority: "", search: "", completed: "" })}
            className="ml-4 text-[11px] uppercase tracking-wide text-black/40 hover:text-black transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-x-8 gap-y-2">
        {/* Status */}
        <div className="flex items-center gap-0">
          {STATUS.map((s) => (
            <button
              key={s.value}
              onClick={() => onChange({ completed: s.value })}
              className={`text-[11px] font-medium tracking-[0.12em] uppercase px-3 py-1 border transition-colors ${
                filters.completed === s.value
                  ? "border-black bg-black text-white"
                  : "border-black/20 text-black/40 hover:border-black hover:text-black"
              } first:rounded-none last:rounded-none`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Priority */}
        <div className="flex items-center gap-0">
          {PRIORITIES.map((p) => (
            <button
              key={p.value}
              onClick={() => onChange({ priority: p.value })}
              className={`text-[11px] font-medium tracking-[0.12em] uppercase px-3 py-1 border transition-colors ${
                filters.priority === p.value
                  ? "border-black bg-black text-white"
                  : "border-black/20 text-black/40 hover:border-black hover:text-black"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {tags.map((t) => (
              <button
                key={t.id}
                onClick={() => onChange({ tag: filters.tag === t.name ? "" : t.name })}
                className={`text-[11px] font-medium tracking-wide uppercase px-2 py-0.5 border transition-colors ${
                  filters.tag === t.name
                    ? "border-black bg-black text-white"
                    : "border-black/20 text-black/40 hover:border-black hover:text-black"
                }`}
              >
                #{t.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
