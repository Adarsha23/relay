import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Issue lifecycle + priority. Kept as literal unions (not tables) — they never change.
export const STATUSES = ["backlog", "todo", "in_progress", "done", "canceled"] as const;
export const PRIORITIES = ["none", "low", "medium", "high", "urgent"] as const;

export const statusValidator = v.union(
  v.literal("backlog"),
  v.literal("todo"),
  v.literal("in_progress"),
  v.literal("done"),
  v.literal("canceled"),
);

export const priorityValidator = v.union(
  v.literal("none"),
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
  v.literal("urgent"),
);

export default defineSchema({
  // ponytail: lightweight guest identity (no passwords). Convex Auth is the upgrade path.
  users: defineTable({
    name: v.string(),
    color: v.string(), // avatar hex
  }),

  issues: defineTable({
    number: v.number(), // shown as REL-{number}
    title: v.string(),
    description: v.optional(v.string()),
    status: statusValidator,
    priority: priorityValidator,
    assigneeId: v.optional(v.id("users")),
    creatorId: v.id("users"),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_number", ["number"]),

  // Ephemeral. "online" = lastSeen within a TTL, computed on the client (queries can't read time).
  presence: defineTable({
    userId: v.id("users"),
    lastSeen: v.number(),
    focusIssueId: v.optional(v.id("issues")),
    // Which field of the focused issue this user is actively editing (for live indicators).
    editingField: v.optional(v.union(v.literal("title"), v.literal("description"))),
  })
    .index("by_user", ["userId"])
    .index("by_lastSeen", ["lastSeen"]),

  // Monotonic issue numbers. Mutations are transactional, so read+increment is race-free.
  counters: defineTable({
    name: v.string(),
    value: v.number(),
  }).index("by_name", ["name"]),
});
