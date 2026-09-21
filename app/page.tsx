"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { AppShell } from "@/components/app-shell";
import { IssueList } from "@/components/issue-list";
import { IssueDetail } from "@/components/issue-detail";
import { CreateIssueDialog } from "@/components/create-issue-dialog";
import { CommandPalette } from "@/components/command-palette";
import { useCurrentUser } from "@/app/user-provider";
import { usePresenceHeartbeat, useOnlineUsers, type EditingField } from "@/hooks/use-presence";
import { useConnection } from "@/hooks/use-connection";
import { groupIssues } from "@/lib/order";

export default function Home() {
  const issues = useQuery(api.issues.list);
  const users = useQuery(api.users.list) ?? [];
  const { userId, user } = useCurrentUser();

  const [selectedId, setSelectedId] = useState<Id<"issues"> | null>(null);
  const [editingField, setEditingField] = useState<EditingField>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  usePresenceHeartbeat(userId, selectedId, editingField);
  const { online, viewersByIssue } = useOnlineUsers();
  const connected = useConnection();

  function selectIssue(id: Id<"issues"> | null) {
    setEditingField(null); // leaving a field/issue clears our editing flag
    setSelectedId(id);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable=true]")) return;
      if (createOpen || paletteOpen) return;

      const flat = issues ? groupIssues(issues).flat : [];
      const key = e.key;
      if (key === "c" || key === "C") {
        e.preventDefault();
        setCreateOpen(true);
      } else if (key === "/") {
        e.preventDefault();
        setPaletteOpen(true);
      } else if (key === "Escape") {
        setEditingField(null);
        setSelectedId(null);
      } else if (key === "j" || key === "k" || key === "ArrowDown" || key === "ArrowUp") {
        if (flat.length === 0) return;
        e.preventDefault();
        const idx = flat.findIndex((i) => i._id === selectedId);
        const down = key === "j" || key === "ArrowDown";
        const next = idx === -1 ? 0 : down ? Math.min(idx + 1, flat.length - 1) : Math.max(idx - 1, 0);
        setEditingField(null);
        setSelectedId(flat[next]._id);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [issues, selectedId, createOpen, paletteOpen]);

  // Drop selection if the issue vanished (deleted here or elsewhere).
  useEffect(() => {
    if (selectedId && issues && !issues.some((i) => i._id === selectedId)) {
      setEditingField(null);
      setSelectedId(null);
    }
  }, [issues, selectedId]);

  return (
    <AppShell
      online={online}
      currentUser={user}
      currentUserId={userId ?? undefined}
      connected={connected}
      onNewIssue={() => setCreateOpen(true)}
    >
      <IssueList
        issues={issues}
        users={users}
        selectedId={selectedId}
        onSelect={selectIssue}
        viewersByIssue={viewersByIssue}
      />
      {selectedId && (
        <div
          data-testid="detail-scrim"
          onClick={() => selectIssue(null)}
          className="absolute inset-0 z-20 bg-black/50 motion-safe:animate-in motion-safe:fade-in xl:hidden"
        />
      )}
      {selectedId && (
        <IssueDetail
          issueId={selectedId}
          users={users}
          viewers={viewersByIssue.get(selectedId) ?? []}
          onEditingField={setEditingField}
          onClose={() => selectIssue(null)}
        />
      )}
      <CreateIssueDialog open={createOpen} onOpenChange={setCreateOpen} />
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        issues={issues ?? []}
        selectedId={selectedId}
        onNewIssue={() => setCreateOpen(true)}
        onSelectIssue={selectIssue}
      />
    </AppShell>
  );
}
