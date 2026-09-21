import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const ADJECTIVES = ["Amber", "Cobalt", "Rapid", "Quiet", "Bright", "Lunar", "Solar", "Nimble", "Bold", "Calm"];
const ANIMALS = ["Fox", "Falcon", "Otter", "Heron", "Lynx", "Marten", "Wren", "Ibex", "Crane", "Vole"];
// Distinct, legible-on-dark avatar hues.
const COLORS = ["#f5b544", "#4cc8a3", "#6aa0ff", "#c98be0", "#f08a6b", "#7ed0e0", "#e57ba8", "#a8d16a"];

function pick<T>(arr: readonly T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// One-click "demo login": mint a guest identity. The client stores the returned id.
export const createGuest = mutation({
  args: {},
  handler: async (ctx) => {
    const name = `${pick(ADJECTIVES)} ${pick(ANIMALS)}`;
    const color = pick(COLORS);
    return await ctx.db.insert("users", { name, color });
  },
});

export const get = query({
  args: { id: v.id("users") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

export const list = query({
  args: {},
  handler: async (ctx) => ctx.db.query("users").collect(),
});

export const rename = mutation({
  args: { id: v.id("users"), name: v.string() },
  handler: async (ctx, { id, name }) => {
    const trimmed = name.trim().slice(0, 40);
    if (trimmed) await ctx.db.patch(id, { name: trimmed });
  },
});
