"use client";

import useSWR from "swr";
import type { TaskWithTags } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useTasks(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== ""))
  ).toString();

  const { data, error, isLoading, mutate } = useSWR<TaskWithTags[]>(
    `/api/tasks${qs ? `?${qs}` : ""}`,
    fetcher,
    { refreshInterval: 30_000 }
  );

  return { tasks: data ?? [], error, isLoading, mutate };
}

export function useTags() {
  const { data, error, isLoading, mutate } = useSWR<
    Array<{ id: string; name: string; color: string; _count: { tasks: number } }>
  >("/api/tags", fetcher);

  return { tags: data ?? [], error, isLoading, mutate };
}
