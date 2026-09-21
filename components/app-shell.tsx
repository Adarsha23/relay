"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/lib/issue-meta";
import type { OnlineUser } from "@/hooks/use-presence";
import { Doc } from "@/convex/_generated/dataModel";
import { Inbox } from "lucide-react";

function BrandMark() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
      <circle cx="8" cy="8" r="3" fill="#f5b544" />
      <circle cx="8" cy="8" r="6.2" fill="none" stroke="#f5b544" strokeWidth="1.3" strokeOpacity="0.5" strokeDasharray="3 3" />
    </svg>
  );
}

function PresenceAvatars({ online, currentUserId }: { online: OnlineUser[]; currentUserId?: string }) {
  const sorted = [...online].sort((a) => (a.userId === currentUserId ? -1 : 1));
  return (
    <div
      className="flex items-center gap-2"
      title={`${online.length} online`}
      data-online-count={online.length}
    >
      <span className="flex -space-x-1.5">
        {sorted.slice(0, 5).map((u) => (
          <Avatar
            key={u.userId}
            name={u.userId === currentUserId ? `${u.name} (you)` : u.name}
            color={u.color}
            className="size-6 ring-2 ring-background"
          />
        ))}
      </span>
      {online.length > 5 && <span className="text-xs text-muted-foreground">+{online.length - 5}</span>}
    </div>
  );
}

export function AppShell({
  children,
  online,
  currentUser,
  currentUserId,
  connected,
  onNewIssue,
}: {
  children: ReactNode;
  online: OnlineUser[];
  currentUser: Doc<"users"> | null;
  currentUserId?: string;
  connected: boolean;
  onNewIssue: () => void;
}) {
  return (
    <div className="flex h-full w-full">
      <nav className="hidden w-60 shrink-0 flex-col border-r bg-sidebar md:flex">
        <div className="flex h-12 items-center gap-2 border-b px-4">
          <BrandMark />
          <span className="font-semibold tracking-tight">Relay</span>
        </div>
        <div className="flex-1 p-2">
          <div className="flex items-center gap-2 rounded-md bg-accent px-2 py-1.5 text-sm text-foreground">
            <Inbox className="size-4 text-muted-foreground" />
            All issues
          </div>
        </div>
        {currentUser && (
          <div className="flex items-center gap-2 border-t px-3 py-3 text-sm">
            <Avatar name={currentUser.name} color={currentUser.color} />
            <span className="truncate">{currentUser.name}</span>
          </div>
        )}
      </nav>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-12 shrink-0 items-center gap-3 border-b px-4">
          <span className="md:hidden" aria-hidden>
            <BrandMark />
          </span>
          <h1 className="text-sm font-medium">All issues</h1>
          <div className="ml-auto flex items-center gap-4">
            {!connected && (
              <span
                data-testid="offline-indicator"
                className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs text-primary"
              >
                <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                Reconnecting…
              </span>
            )}
            <div className={connected ? undefined : "opacity-40 grayscale"}>
              <PresenceAvatars online={online} currentUserId={currentUserId} />
            </div>
            <Button size="sm" onClick={onNewIssue}>
              New issue
            </Button>
          </div>
        </header>
        <div className="relative flex flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
