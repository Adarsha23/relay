import { mutation, query, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { statusValidator, priorityValidator } from "./schema";

// Raw issue docs; the client joins assignee/creator names from users.list. Keeping issues
// un-enriched makes optimistic updates (Phase 3) a simple patch of one document.
export const list = query({
  args: {},
  handler: async (ctx) => {
    const issues = await ctx.db.query("issues").collect();
    return issues.sort((a, b) => a.number - b.number);
  },
});

export const get = query({
  args: { id: v.id("issues") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

async function nextNumber(ctx: MutationCtx) {
  const counter = await ctx.db
    .query("counters")
    .withIndex("by_name", (q) => q.eq("name", "issues"))
    .unique();
  const value = (counter?.value ?? 0) + 1;
  if (counter) await ctx.db.patch(counter._id, { value });
  else await ctx.db.insert("counters", { name: "issues", value });
  return value;
}

export const create = mutation({
  args: {
    title: v.string(),
    creatorId: v.id("users"),
    status: v.optional(statusValidator),
    priority: v.optional(priorityValidator),
    assigneeId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const title = args.title.trim();
    if (!title) throw new Error("Title is required");
    return await ctx.db.insert("issues", {
      number: await nextNumber(ctx),
      title,
      status: args.status ?? "backlog",
      priority: args.priority ?? "none",
      assigneeId: args.assigneeId,
      creatorId: args.creatorId,
      updatedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("issues"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(statusValidator),
    priority: v.optional(priorityValidator),
    assigneeId: v.optional(v.union(v.id("users"), v.null())),
  },
  handler: async (ctx, { id, ...patch }) => {
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Issue not found");
    const next: Record<string, unknown> = { updatedAt: Date.now() };
    if (patch.title !== undefined) next.title = patch.title.trim() || existing.title;
    if (patch.description !== undefined) next.description = patch.description;
    if (patch.status !== undefined) next.status = patch.status;
    if (patch.priority !== undefined) next.priority = patch.priority;
    if (patch.assigneeId !== undefined) next.assigneeId = patch.assigneeId ?? undefined;
    await ctx.db.patch(id, next);
  },
});

export const remove = mutation({
  args: { id: v.id("issues") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

// ponytail: test-only. Always throws, so the client's optimistic update must roll back.
export const debugFail = mutation({
  args: { id: v.id("issues") },
  handler: async () => {
    throw new Error("Forced failure (optimistic rollback test)");
  },
});
