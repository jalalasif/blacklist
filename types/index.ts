import { z } from "zod";

export const PrioritySchema = z.enum(["HIGH", "MEDIUM", "LOW"]);
export type Priority = z.infer<typeof PrioritySchema>;

export const CreateTaskSchema = z.object({
  rawInput: z.string().min(1).max(500),
  priority: PrioritySchema.optional(),
  tagIds: z.array(z.string()).optional(),
});

export const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  cleanTitle: z.string().optional(),
  priority: PrioritySchema.optional(),
  dueDate: z.string().datetime().nullable().optional(),
  completed: z.boolean().optional(),
  recurrence: z.string().nullable().optional(),
  tagIds: z.array(z.string()).optional(),
});

export const CreateTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export const UpdateTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export const TaskFilterSchema = z.object({
  tag: z.string().optional(),
  priority: PrioritySchema.optional(),
  completed: z
    .string()
    .transform((v) => (v === "true" ? true : v === "false" ? false : undefined))
    .optional(),
  dueBefore: z.string().datetime().optional(),
  dueAfter: z.string().datetime().optional(),
  search: z.string().optional(),
});

export interface ParsedTask {
  cleanTitle: string;
  dueDate: Date | null;
  recurrence: string | null;
  nextOccurrence: Date | null;
  inlineTags: string[];
  inlinePriority: Priority | null;
}

export interface TaskWithTags {
  id: string;
  title: string;
  cleanTitle: string;
  priority: Priority;
  dueDate: string | null;
  completed: boolean;
  completedAt: string | null;
  recurrence: string | null;
  nextOccurrence: string | null;
  createdAt: string;
  updatedAt: string;
  tags: Array<{ tag: { id: string; name: string; color: string } }>;
}
