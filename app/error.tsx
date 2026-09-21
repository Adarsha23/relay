"use client";

import { Button } from "@/components/ui/button";

// Route-level error boundary: catches render/query errors so the app never white-screens.
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex flex-1 items-center justify-center px-6">
      <div className="max-w-sm text-center">
        <h1 className="text-lg font-medium">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Relay hit an unexpected error. Your data is safe on the server.
        </p>
        <Button className="mt-5" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  );
}
