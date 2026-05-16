"use client";

import { useState } from "react";
import { useTasks } from "@/hooks/useTasks";
import { TaskCard } from "./TaskCard";
import { TaskFilters } from "./TaskFilters";

interface Filters {
  tag: string;
  priority: string;
  completed: string;
  search: string;
}

const DEFAULT_FILTERS: Filters = {
  tag: "",
  priority: "",
  completed: "",
  search: "",
};

export function TaskList() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  const queryParams: Record<string, string> = {};
  if (filters.tag) queryParams.tag = filters.tag;
  if (filters.priority) queryParams.priority = filters.priority;
  if (filters.search) queryParams.search = filters.search;
  if (filters.completed === "true") queryParams.completed = "true";
  else if (filters.completed === "") queryParams.completed = "false";

  const { tasks, isLoading, mutate } = useTasks(queryParams);

  function updateFilters(partial: Partial<Filters>) {
    setFilters((prev) => ({ ...prev, ...partial }));
  }

  return (
    <div className="space-y-6">
      <TaskFilters filters={filters} onChange={updateFilters} />

      {isLoading && tasks.length === 0 ? (
        <div className="py-8">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1 h-1 bg-black/20 rounded-full animate-pulse"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        </div>
      ) : tasks.length === 0 ? (
        <div className="py-12 space-y-2">
          <p className="text-sm text-black/30">
            {filters.tag || filters.priority || filters.search
              ? "No tasks match your filters."
              : "Nothing here yet."}
          </p>
          {!filters.tag && !filters.priority && !filters.search && (
            <p className="text-[11px] text-black/20 tracking-wide uppercase">
              Add a task above to get started
            </p>
          )}
        </div>
      ) : (
        <div>
          {/* Count */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] tracking-[0.15em] uppercase text-black/30">
              {tasks.length} task{tasks.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div>
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onUpdate={mutate}
                onDelete={mutate}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
