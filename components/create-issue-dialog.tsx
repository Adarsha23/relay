"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusPicker, PriorityPicker } from "@/components/pickers";
import { useCurrentUser } from "@/app/user-provider";
import type { Status, Priority } from "@/lib/issue-meta";

export function CreateIssueDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { userId } = useCurrentUser();
  const create = useMutation(api.issues.create);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<Status>("backlog");
  const [priority, setPriority] = useState<Priority>("none");
  const [saving, setSaving] = useState(false);

  function reset() {
    setTitle("");
    setStatus("backlog");
    setPriority("none");
  }

  async function submit() {
    const trimmed = title.trim();
    if (!trimmed || !userId || saving) return;
    setSaving(true);
    try {
      await create({ title: trimmed, creatorId: userId, status, priority });
      reset();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New issue</DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          value={title}
          placeholder="Issue title"
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          className="border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
        />
        <div className="flex items-center gap-1 border-t pt-3">
          <div className="rounded-md border px-1.5 py-1">
            <StatusPicker value={status} onChange={setStatus} showLabel />
          </div>
          <div className="rounded-md border px-1.5 py-1">
            <PriorityPicker value={priority} onChange={setPriority} showLabel />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!title.trim() || saving}>
            {saving ? "Creating…" : "Create issue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
