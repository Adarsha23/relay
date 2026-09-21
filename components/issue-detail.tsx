"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { useUpdateIssue, useDeleteIssue, useForceFail } from "@/hooks/use-update-issue";
import { StatusPicker, PriorityPicker, AssigneePicker } from "@/components/pickers";
import { Avatar, type Status, type Priority } from "@/lib/issue-meta";
import type { OnlineUser, EditingField } from "@/hooks/use-presence";
import { useCurrentUser } from "@/app/user-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Trash2 } from "lucide-react";

// Leading+trailing throttle so text propagates while typing (~5x/sec) without a write per keystroke.
const THROTTLE_MS = 180;

export function IssueDetail({
  issueId,
  users,
  viewers,
  onEditingField,
  onClose,
}: {
  issueId: Id<"issues">;
  users: Doc<"users">[];
  viewers: OnlineUser[];
  onEditingField: (field: EditingField) => void;
  onClose: () => void;
}) {
  const issue = useQuery(api.issues.get, { id: issueId });
  const update = useUpdateIssue();
  const remove = useDeleteIssue();
  const forceFail = useForceFail();
  const { userId } = useCurrentUser();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const focusedRef = useRef<EditingField>(null);
  const pending = useRef<{ title?: string; description?: string }>({});
  const lastSent = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pull remote values into the inputs — but never clobber the field we're actively typing in.
  useEffect(() => {
    if (!issue) return;
    if (focusedRef.current !== "title") setTitle(issue.title);
    if (focusedRef.current !== "description") setDescription(issue.description ?? "");
  }, [issue?._id, issue?.title, issue?.description]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (issue === null) onClose();
  }, [issue, onClose]);

  function schedule(patch: { title?: string; description?: string }) {
    if (!issue) return;
    pending.current = { ...pending.current, ...patch };
    const flush = () => {
      timer.current = null;
      lastSent.current = Date.now();
      const p = pending.current;
      pending.current = {};
      if (Object.keys(p).length) update({ id: issue._id, ...p });
    };
    const elapsed = Date.now() - lastSent.current;
    if (elapsed >= THROTTLE_MS) flush();
    else if (!timer.current) timer.current = setTimeout(flush, THROTTLE_MS - elapsed);
  }

  function flushNow() {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const p = pending.current;
    pending.current = {};
    if (issue && Object.keys(p).length) update({ id: issue._id, ...p });
  }

  function focusField(field: Exclude<EditingField, null>) {
    focusedRef.current = field;
    onEditingField(field);
  }
  function blurField() {
    focusedRef.current = null;
    onEditingField(null);
    flushNow();
  }

  const panelClass =
    "absolute inset-y-0 right-0 z-30 flex w-full max-w-md flex-col border-l bg-background shadow-2xl xl:static xl:z-auto xl:w-[440px] xl:max-w-none xl:shadow-none motion-safe:animate-in motion-safe:slide-in-from-right-4 motion-safe:duration-200";

  if (!issue)
    return (
      <aside className={panelClass}>
        <div className="space-y-4 p-4">
          <div className="h-6 w-20 animate-pulse rounded bg-secondary/60" />
          <div className="h-7 w-3/4 animate-pulse rounded bg-secondary/60" />
          <div className="h-24 animate-pulse rounded bg-secondary/40" />
        </div>
      </aside>
    );

  const creator = users.find((u) => u._id === issue.creatorId);
  const otherViewers = viewers.filter((v) => v.userId !== userId);
  const titleEditors = otherViewers.filter((v) => v.editingField === "title");
  const descEditors = otherViewers.filter((v) => v.editingField === "description");

  return (
    <aside className={panelClass}>
      <div className="flex items-center gap-2 border-b px-4 py-2.5">
        <span className="font-mono text-xs text-muted-foreground">REL-{issue.number}</span>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Delete issue"
            onClick={() => {
              remove({ id: issue._id });
              onClose();
            }}
          >
            <Trash2 className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
        <div>
          <EditingBadge editors={titleEditors} />
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              schedule({ title: e.target.value });
            }}
            onFocus={() => focusField("title")}
            onBlur={blurField}
            className="w-full bg-transparent text-lg font-medium outline-none placeholder:text-muted-foreground"
            placeholder="Issue title"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-md border px-2 py-1">
            <StatusPicker value={issue.status as Status} onChange={(status) => update({ id: issue._id, status })} showLabel />
          </div>
          <div className="rounded-md border px-2 py-1">
            <PriorityPicker value={issue.priority as Priority} onChange={(priority) => update({ id: issue._id, priority })} showLabel />
          </div>
          <div className="rounded-md border px-2 py-1">
            <AssigneePicker
              value={issue.assigneeId}
              users={users}
              onChange={(assigneeId) => update({ id: issue._id, assigneeId })}
              showLabel
            />
          </div>
        </div>

        {process.env.NODE_ENV !== "production" && (
          <button
            data-testid="debug-fail"
            className="sr-only"
            onClick={() => forceFail({ id: issue._id }).catch(() => {})}
          >
            force fail
          </button>
        )}

        <div>
          <EditingBadge editors={descEditors} />
          <Textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              schedule({ description: e.target.value });
            }}
            onFocus={() => focusField("description")}
            onBlur={blurField}
            placeholder="Add a description…"
            className="min-h-32 resize-none border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 border-t px-4 py-3 text-xs text-muted-foreground">
        {creator && (
          <span className="flex items-center gap-1.5">
            <Avatar name={creator.name} color={creator.color} className="size-4" />
            {creator.name}
          </span>
        )}
        {otherViewers.length > 0 && (
          <span className="ml-auto flex items-center gap-1.5">
            <span className="flex -space-x-1.5">
              {otherViewers.slice(0, 4).map((v) => (
                <Avatar key={v.userId} name={v.name} color={v.color} className="size-4 ring-2 ring-background" />
              ))}
            </span>
            viewing now
          </span>
        )}
      </div>
    </aside>
  );
}

function EditingBadge({ editors }: { editors: OnlineUser[] }) {
  if (editors.length === 0) return null;
  const label =
    editors.length === 1 ? `${editors[0].name} is editing` : `${editors.length} people are editing`;
  return (
    <div className="mb-1 flex items-center gap-1.5 text-xs" style={{ color: editors[0].color }}>
      <span className="relative flex size-1.5">
        <span
          className="absolute inline-flex size-full animate-ping rounded-full opacity-75"
          style={{ backgroundColor: editors[0].color }}
        />
        <span className="relative inline-flex size-1.5 rounded-full" style={{ backgroundColor: editors[0].color }} />
      </span>
      {label}
    </div>
  );
}
