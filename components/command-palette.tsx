"use client";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { useUpdateIssue } from "@/hooks/use-update-issue";
import {
  StatusIcon,
  PriorityIcon,
  STATUS_META,
  STATUS_ORDER,
  PRIORITY_META,
  PRIORITY_ORDER,
  type Status,
  type Priority,
} from "@/lib/issue-meta";
import { Plus, RefreshCw } from "lucide-react";

export function CommandPalette({
  open,
  onOpenChange,
  issues,
  selectedId,
  onNewIssue,
  onSelectIssue,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issues: Doc<"issues">[];
  selectedId: Id<"issues"> | null;
  onNewIssue: () => void;
  onSelectIssue: (id: Id<"issues">) => void;
}) {
  const update = useUpdateIssue();
  const seed = useMutation(api.seed.run);
  const selected = issues.find((i) => i._id === selectedId);

  const run = (fn: () => void) => {
    onOpenChange(false);
    fn();
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      {open && (
      <Command>
        <CommandInput placeholder="Type a command or search issues…" />
        <CommandList>
        <CommandEmpty>No results.</CommandEmpty>

        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => run(onNewIssue)}>
            <Plus className="size-4" />
            New issue
          </CommandItem>
          <CommandItem value="reset demo data" onSelect={() => run(() => seed())}>
            <RefreshCw className="size-4" />
            Reset demo data
          </CommandItem>
        </CommandGroup>

        {selected && (
          <>
            <CommandGroup heading={`Status · REL-${selected.number}`}>
              {STATUS_ORDER.map((s) => (
                <CommandItem
                  key={s}
                  value={`status ${STATUS_META[s].label}`}
                  onSelect={() => run(() => update({ id: selected._id, status: s }))}
                >
                  <StatusIcon status={s} />
                  {STATUS_META[s].label}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading={`Priority · REL-${selected.number}`}>
              {PRIORITY_ORDER.map((p) => (
                <CommandItem
                  key={p}
                  value={`priority ${PRIORITY_META[p].label}`}
                  onSelect={() => run(() => update({ id: selected._id, priority: p }))}
                >
                  <PriorityIcon priority={p} />
                  {PRIORITY_META[p].label}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandGroup heading="Issues">
          {issues.map((issue) => (
            <CommandItem
              key={issue._id}
              value={`REL-${issue.number} ${issue.title}`}
              onSelect={() => run(() => onSelectIssue(issue._id))}
            >
              <StatusIcon status={issue.status as Status} />
              <span className="font-mono text-xs text-muted-foreground">REL-{issue.number}</span>
              <span className="truncate">{issue.title}</span>
              <PriorityIcon priority={issue.priority as Priority} className="ml-auto" />
            </CommandItem>
          ))}
        </CommandGroup>
        </CommandList>
      </Command>
      )}
    </CommandDialog>
  );
}
