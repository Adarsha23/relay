"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

// The app needs a Convex deployment. `npx convex dev` writes NEXT_PUBLIC_CONVEX_URL to
// .env.local; until then, render a setup screen instead of constructing a client with a
// bogus URL (ConvexReactClient rejects non-deployment URLs and throws in the browser).
const url = process.env.NEXT_PUBLIC_CONVEX_URL;
const convex = url ? new ConvexReactClient(url) : null;

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!convex) return <BackendSetupNotice />;
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}

function BackendSetupNotice() {
  return (
    <main className="flex flex-1 items-center px-6">
      <div className="mx-auto w-full max-w-xl">
        <h1 className="text-5xl font-semibold tracking-tight">Relay</h1>
        <p className="mt-3 max-w-md text-base leading-relaxed text-muted-foreground">
          The backend isn&apos;t connected yet. Run{" "}
          <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-sm text-foreground">
            npx convex dev
          </code>{" "}
          to create a deployment, then restart the dev server.
        </p>
        <p className="mt-10 font-mono text-xs text-muted-foreground">
          REL-001&nbsp;&nbsp;connect the backend
        </p>
      </div>
    </main>
  );
}
