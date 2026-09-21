"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { groupIssues } from "@/lib/order";
import { StatusIcon, STATUS_META, Avatar, type Status, type Priority } from "@/lib/issue-meta";
import { StatusPicker, PriorityPicker, AssigneePicker } from "@/components/pickers";
import { useUpdateIssue } from "@/hooks/use-update-issue";
import { wasLocalEdit } from "@/lib/local-edits";
import { useCurrentUser } from "@/app/user-provider";
import type { OnlineUser } from "@/hooks/use-presence";
import { cn } from "@/lib/utils";

export function IssueList({
  issues,
  users,
  selectedId,
  onSelect,
  viewersByIssue,
}: {
  issues: Doc<"issues">[] | undefined;
  users: Doc<"users">[];
  selectedId: Id<"issues"> | null;
  onSelect: (id: Id<"issues">) => void;
  viewersByIssue: Map<string, OnlineUser[]>;
}) {
  if (issues === undefined) return <ListSkeleton />;
  if (issues.length === 0) return <EmptyState />;

  const { groups } = groupIssues(issues);

  return (
    <div className="flex-1 overflow-y-auto">
      {groups.map((group) => (
        <section key={group.status}>
          <div className="sticky top-0 z-10 flex items-center gap-2 bg-background/95 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
            <StatusIcon status={group.status} />
            <span className="text-foreground">{STATUS_META[group.status].label}</span>
            <span>{group.issues.length}</span>
          </div>
          {group.issues.map((issue) => (
            <IssueRow
              key={issue._id}
              issue={issue}
              users={users}
              selected={issue._id === selectedId}
              onSelect={() => onSelect(issue._id)}
              viewers={viewersByIssue.get(issue._id) ?? []}
            />
          ))}
        </section>
      ))}
    </div>
  );
}

function IssueRow({
  issue,
  users,
  selected,
  onSelect,
  viewers,
}: {
  issue: Doc<"issues">;
  users: Doc<"users">[];
  selected: boolean;
  onSelect: () => void;
  viewers: OnlineUser[];
}) {
  const update = useUpdateIssue();
  const { userId } = useCurrentUser();
  const [pulsing, setPulsing] = useState(false);
  // Pulse on meaningful state changes (status/priority/assignee), not on every keystroke of
  // live-synced text — otherwise the row would strobe while someone types.
  const stateKey = `${issue.status}|${issue.priority}|${issue.assigneeId ?? ""}`;
  const prevState = useRef(stateKey);

  useEffect(() => {
    if (stateKey !== prevState.current) {
      prevState.current = stateKey;
      if (!wasLocalEdit(issue._id)) setPulsing(true);
    }
  }, [stateKey, issue._id]);

  const otherViewers = viewers.filter((v) => v.userId !== userId);

  return (
    <div
      role="button"
      tabIndex={-1}
      data-selected={selected || undefined}
      onClick={onSelect}
      className={cn(
        "group flex h-10 cursor-pointer items-center gap-2.5 border-l-2 border-transparent px-4 text-sm hover:bg-accent",
        selected && "border-l-primary bg-accent",
        pulsing && "relay-pulse",
      )}
      onAnimationEnd={() => setPulsing(false)}
    >
      <div onClick={(e) => e.stopPropagation()}>
        <PriorityPicker value={issue.priority as Priority} onChange={(priority) => update({ id: issue._id, priority })} />
      </div>
      <div onClick={(e) => e.stopPropagation()}>
        <StatusPicker value={issue.status as Status} onChange={(status) => update({ id: issue._id, status })} />
      </div>
      <span className="w-14 shrink-0 font-mono text-xs text-muted-foreground">REL-{issue.number}</span>
      <span className="truncate text-foreground">{issue.title}</span>
      <div className="ml-auto flex items-center gap-2 pl-2">
        {otherViewers.slice(0, 3).map((v) => (
          <span key={v.userId} className="ring-2 ring-background rounded-full" title={`${v.name} is viewing`}>
            <Avatar name={v.name} color={v.color} className="size-4 opacity-90" />
          </span>
        ))}
        <div onClick={(e) => e.stopPropagation()}>
          <AssigneePicker
            value={issue.assigneeId}
            users={users}
            onChange={(assigneeId) => update({ id: issue._id, assigneeId })}
          />
        </div>
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="flex-1 space-y-2 p-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-9 animate-pulse rounded-md bg-secondary/50" />
      ))}
    </div>
  );
}

function EmptyState() {
  const seed = useMutation(api.seed.run);
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-base text-foreground">No issues yet</p>
      <p className="max-w-xs text-sm text-muted-foreground">
        Press <kbd className="rounded border bg-secondary px-1 font-mono text-xs">C</kbd> to
        create your first one, or load a demo workspace to explore.
      </p>
      <Button variant="secondary" size="sm" className="mt-1" onClick={() => seed()}>
        Load demo data
      </Button>
    </div>
  );
}
