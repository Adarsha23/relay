"use client";

import { ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Avatar,
  PriorityIcon,
  StatusIcon,
  STATUS_META,
  STATUS_ORDER,
  PRIORITY_META,
  PRIORITY_ORDER,
  type Status,
  type Priority,
} from "@/lib/issue-meta";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

function TriggerButton({ children, label }: { children: ReactNode; label: string }) {
  return (
    <DropdownMenuTrigger
      aria-label={label}
      className="inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </DropdownMenuTrigger>
  );
}

export function StatusPicker({
  value,
  onChange,
  showLabel = false,
}: {
  value: Status;
  onChange: (s: Status) => void;
  showLabel?: boolean;
}) {
  return (
    <DropdownMenu>
      <TriggerButton label={`Status: ${STATUS_META[value].label}`}>
        <StatusIcon status={value} />
        {showLabel && <span className="text-foreground">{STATUS_META[value].label}</span>}
      </TriggerButton>
      <DropdownMenuContent align="start" className="w-44">
        {STATUS_ORDER.map((s) => (
          <DropdownMenuItem key={s} onClick={() => onChange(s)} className="gap-2">
            <StatusIcon status={s} />
            <span>{STATUS_META[s].label}</span>
            {s === value && <span className="ml-auto text-xs text-muted-foreground">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PriorityPicker({
  value,
  onChange,
  showLabel = false,
}: {
  value: Priority;
  onChange: (p: Priority) => void;
  showLabel?: boolean;
}) {
  return (
    <DropdownMenu>
      <TriggerButton label={`Priority: ${PRIORITY_META[value].label}`}>
        <PriorityIcon priority={value} />
        {showLabel && <span className="text-foreground">{PRIORITY_META[value].label}</span>}
      </TriggerButton>
      <DropdownMenuContent align="start" className="w-44">
        {PRIORITY_ORDER.map((p) => (
          <DropdownMenuItem key={p} onClick={() => onChange(p)} className="gap-2">
            <PriorityIcon priority={p} />
            <span>{PRIORITY_META[p].label}</span>
            {p === value && <span className="ml-auto text-xs text-muted-foreground">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AssigneePicker({
  value,
  users,
  onChange,
  showLabel = false,
}: {
  value: Id<"users"> | undefined;
  users: Doc<"users">[];
  onChange: (id: Id<"users"> | null) => void;
  showLabel?: boolean;
}) {
  const assignee = users.find((u) => u._id === value);
  return (
    <DropdownMenu>
      <TriggerButton label={assignee ? `Assignee: ${assignee.name}` : "Unassigned"}>
        {assignee ? (
          <Avatar name={assignee.name} color={assignee.color} />
        ) : (
          <span className="inline-flex size-5 items-center justify-center rounded-full border border-dashed border-border text-[10px] text-muted-foreground">
            ?
          </span>
        )}
        {showLabel && (
          <span className={cn(assignee ? "text-foreground" : "text-muted-foreground")}>
            {assignee ? assignee.name : "Unassigned"}
          </span>
        )}
      </TriggerButton>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuItem onClick={() => onChange(null)} className="gap-2 text-muted-foreground">
          <span className="inline-flex size-5 items-center justify-center rounded-full border border-dashed border-border text-[10px]">
            ?
          </span>
          Unassigned
        </DropdownMenuItem>
        {users.map((u) => (
          <DropdownMenuItem key={u._id} onClick={() => onChange(u._id)} className="gap-2">
            <Avatar name={u.name} color={u.color} />
            <span>{u.name}</span>
            {u._id === value && <span className="ml-auto text-xs text-muted-foreground">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
