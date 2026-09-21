"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { markLocalEdit } from "@/lib/local-edits";

type UpdateArgs = {
  id: Id<"issues">;
  title?: string;
  description?: string;
  status?: Doc<"issues">["status"];
  priority?: Doc<"issues">["priority"];
  assigneeId?: Id<"users"> | null;
};

function applyPatch(issue: Doc<"issues">, args: UpdateArgs): Doc<"issues"> {
  return {
    ...issue,
    ...(args.title !== undefined ? { title: args.title } : {}),
    ...(args.description !== undefined ? { description: args.description } : {}),
    ...(args.status !== undefined ? { status: args.status } : {}),
    ...(args.priority !== undefined ? { priority: args.priority } : {}),
    ...(args.assigneeId !== undefined ? { assigneeId: args.assigneeId ?? undefined } : {}),
    updatedAt: Date.now(),
  };
}

// Update with an optimistic patch to both the list and the single-issue query, so edits
// feel instant and roll back automatically if the mutation fails.
export function useUpdateIssue() {
  return useMutation(api.issues.update).withOptimisticUpdate((store, args) => {
    markLocalEdit(args.id);
    const list = store.getQuery(api.issues.list, {});
    if (list) {
      store.setQuery(
        api.issues.list,
        {},
        list.map((i) => (i._id === args.id ? applyPatch(i, args as UpdateArgs) : i)),
      );
    }
    const one = store.getQuery(api.issues.get, { id: args.id });
    if (one) store.setQuery(api.issues.get, { id: args.id }, applyPatch(one, args as UpdateArgs));
  });
}

// Test-only: optimistically renames the issue, then hits a mutation that always throws.
// Convex must revert the optimistic title — proving rollback on server failure.
export function useForceFail() {
  return useMutation(api.issues.debugFail).withOptimisticUpdate((store, args) => {
    const sentinel = "__ROLLBACK__";
    const one = store.getQuery(api.issues.get, { id: args.id });
    if (one) store.setQuery(api.issues.get, { id: args.id }, { ...one, title: sentinel });
    const list = store.getQuery(api.issues.list, {});
    if (list) {
      store.setQuery(
        api.issues.list,
        {},
        list.map((i) => (i._id === args.id ? { ...i, title: sentinel } : i)),
      );
    }
  });
}

export function useDeleteIssue() {
  return useMutation(api.issues.remove).withOptimisticUpdate((store, args) => {
    const list = store.getQuery(api.issues.list, {});
    if (list) {
      store.setQuery(
        api.issues.list,
        {},
        list.filter((i) => i._id !== args.id),
      );
    }
  });
}
