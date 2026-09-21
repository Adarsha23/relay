"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id, Doc } from "@/convex/_generated/dataModel";

const ONLINE_TTL = 15_000;

export type EditingField = "title" | "description" | null;

// Sends a heartbeat every 5s, and immediately whenever focus or the edited field changes.
export function usePresenceHeartbeat(
  userId: Id<"users"> | null,
  focusIssueId: Id<"issues"> | null,
  editingField: EditingField,
) {
  const heartbeat = useMutation(api.presence.heartbeat);
  useEffect(() => {
    if (!userId) return;
    const beat = () =>
      heartbeat({
        userId,
        focusIssueId: focusIssueId ?? undefined,
        editingField: editingField ?? undefined,
      });
    beat();
    const timer = setInterval(beat, 5000);
    return () => clearInterval(timer);
  }, [userId, focusIssueId, editingField, heartbeat]);
}

export type OnlineUser = {
  userId: Id<"users">;
  name: string;
  color: string;
  focusIssueId?: Id<"issues">;
  editingField?: "title" | "description";
};

// Joins presence rows with user docs and filters to "online" against the client clock.
export function useOnlineUsers() {
  const presence = useQuery(api.presence.list);
  const users = useQuery(api.users.list);
  const [now, setNow] = useState(() => Date.now());

  // Re-evaluate the TTL even when no heartbeat arrives, so idle tabs drop off on their own.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 3000);
    return () => clearInterval(timer);
  }, []);

  return useMemo(() => {
    const byId = new Map<string, Doc<"users">>((users ?? []).map((u) => [u._id, u]));
    const online: OnlineUser[] = [];
    for (const row of presence ?? []) {
      if (now - row.lastSeen > ONLINE_TTL) continue;
      const u = byId.get(row.userId);
      if (!u) continue;
      online.push({
        userId: row.userId,
        name: u.name,
        color: u.color,
        focusIssueId: row.focusIssueId,
        editingField: row.editingField,
      });
    }
    const viewersByIssue = new Map<string, OnlineUser[]>();
    for (const u of online) {
      if (!u.focusIssueId) continue;
      const list = viewersByIssue.get(u.focusIssueId) ?? [];
      list.push(u);
      viewersByIssue.set(u.focusIssueId, list);
    }
    return { online, viewersByIssue };
  }, [presence, users, now]);
}
