import { z } from "zod";

export const createTaskSchema = z.object({
  workspaceSlug: z.string().trim().min(2).max(64),
  projectId: z.string().uuid(),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const updateTaskStatusSchema = z.object({
  workspaceSlug: z.string().trim().min(2).max(64),
  projectId: z.string().uuid(),
  taskId: z.string().uuid(),
  status: z.enum(["todo", "in_progress", "done"]),
});

export const assignTaskSchema = z.object({
  workspaceSlug: z.string().trim().min(2).max(64),
  taskId: z.string().uuid(),
  assigneeUserId: z.string().uuid().nullable(),
});

export const renameTaskSchema = z.object({
  workspaceSlug: z.string().trim().min(2).max(64),
  taskId: z.string().uuid(),
  title: z.string().trim().min(2).max(160),
});

export const removeTaskSchema = z.object({
  workspaceSlug: z.string().trim().min(2).max(64),
  projectId: z.string().uuid(),
  taskId: z.string().uuid(),
});
