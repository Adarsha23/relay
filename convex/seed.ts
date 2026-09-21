import { mutation } from "./_generated/server";

// One-click demo data. Clears everything, then inserts a realistic set. Safe to re-run.
export const run = mutation({
  args: {},
  handler: async (ctx) => {
    for (const table of ["issues", "presence", "users", "counters"] as const) {
      for (const doc of await ctx.db.query(table).collect()) {
        await ctx.db.delete(doc._id);
      }
    }

    const alex = await ctx.db.insert("users", { name: "Alex Rivera", color: "#f5b544" });
    const sam = await ctx.db.insert("users", { name: "Sam Okafor", color: "#4cc8a3" });
    const jo = await ctx.db.insert("users", { name: "Jo Park", color: "#6aa0ff" });

    const data = [
      { title: "Reconnect drops presence after 30s idle", status: "in_progress", priority: "high", assignee: alex },
      { title: "Two-window sync test flakes in CI", status: "in_progress", priority: "urgent", assignee: sam },
      { title: "Optimistic status change flickers on slow networks", status: "todo", priority: "medium", assignee: jo },
      { title: "Empty-state copy for a fresh workspace", status: "todo", priority: "none", assignee: alex },
      { title: "Command palette: fuzzy match on issue keys", status: "backlog", priority: "low", assignee: undefined },
      { title: "Keyboard: j/k should wrap at list ends", status: "backlog", priority: "medium", assignee: jo },
      { title: "Reduce websocket reconnect backoff", status: "done", priority: "medium", assignee: sam },
      { title: "Avatar colors clash on the dark canvas", status: "canceled", priority: "low", assignee: alex },
    ] as const;

    let n = 0;
    for (const d of data) {
      n++;
      await ctx.db.insert("issues", {
        number: n,
        title: d.title,
        status: d.status,
        priority: d.priority,
        assigneeId: d.assignee,
        creatorId: alex,
        updatedAt: Date.now(),
      });
    }
    await ctx.db.insert("counters", { name: "issues", value: n });
    return { users: 3, issues: n };
  },
});
