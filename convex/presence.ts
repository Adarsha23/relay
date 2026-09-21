import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Called on a ~5s interval by each open tab. Upserts one row per user.
export const heartbeat = mutation({
  args: {
    userId: v.id("users"),
    focusIssueId: v.optional(v.union(v.id("issues"), v.null())),
    editingField: v.optional(v.union(v.literal("title"), v.literal("description"), v.null())),
  },
  handler: async (ctx, { userId, focusIssueId, editingField }) => {
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    const row = {
      userId,
      lastSeen: Date.now(),
      focusIssueId: focusIssueId ?? undefined,
      editingField: editingField ?? undefined,
    };
    if (existing) await ctx.db.patch(existing._id, row);
    else await ctx.db.insert("presence", row);
  },
});

// Returns all presence rows; the client filters "online" by lastSeen against its own clock
// (queries can't read the current time) and joins names from users.list.
// ponytail: rows are never pruned here — a scheduled cleanup is the upgrade path.
export const list = query({
  args: {},
  handler: async (ctx) => ctx.db.query("presence").collect(),
});
