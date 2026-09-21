# CLAUDE.md — Relay (standing rules, read every session)

## What this is
Relay is a **local-first-feeling, real-time collaborative issue tracker** — a fast,
keyboard-driven "Linear-lite" where a team creates and tracks issues and everyone's screen
updates live. It's a resume project, built solo, deployed, and usable. Three pillars, in
priority order:
1. **Design taste** — Linear-grade, distinctive, restrained. If a screen looks templated, redo it.
2. **A genuinely hard backend** — the **sync engine** is the star: live multi-user updates,
   presence, optimistic UI, reconnect/reconciliation.
3. **Product feel** — deployed on a real URL, one-click demo data, a README that explains the
   architecture.

One-line pitch that keeps us honest: *"A Linear-quality issue tracker with a real-time sync
engine, built solo, deployed, and usable."* Every decision serves that sentence.

## Locked stack & constraints
- **$0 forever** — free tiers only.
- TypeScript everywhere · Next.js (App Router) + React · **Convex** (queries/mutations/schema/
  auth/realtime) · Tailwind + shadcn/ui · `cmdk` · Geist Sans/Mono · Vercel + Convex hosting ·
  Playwright for tests.
- **Sync depth is LOCKED:** real-time multi-user sync + presence + optimistic UI +
  reconnect/reconciliation. **Do NOT** build full CRDT/Yjs offline editing.

## Skills — use deliberately, don't name-drop
- **ponytail (full)** — active EVERY phase. Laziest solution that actually works: stdlib/native/
  already-installed before new code or deps; fewest files, shortest working diff; no speculative
  abstractions. Mark deliberate shortcuts with a `ponytail:` comment naming the ceiling.
- **antislop (+ -ui, -copywriting, -code)** — applies **DURING** the work, not as a cleanup pass.
  This is the standing answer to antislop's "when?" question: DURING.
- **frontend-design + ui-ux-pro-max** — for any UI decision: direction, then concrete choices.
- **webapp-testing (Playwright)** — verify EVERY phase against its acceptance criteria. The
  critical test is real-time: two browser contexts, edit in one, assert it appears in the other,
  then drop/restore the connection and assert reconciliation.

## Rules of engagement
- **Build the whole app end-to-end FIRST. Do NOT teach, explain, or tutor until the user types
  "teach me".** Then deliver the full course at once (see TEACHING PROTOCOL in the brief).
- **Pause after every phase.** Give a short progress report + exactly how to run/see it, then WAIT
  for "continue". Do not tutor in these reports.
- **PLAN.md is the single source of truth.** Read it at the start of every phase; tick boxes as you
  finish; if the plan changes, edit PLAN.md and note why in one line under its Changelog.
- **Keep TEACHING.md updated** as you build — accumulate notes silently, deliver only on "teach me".
- Every implementation phase: build the minimum that works (ponytail), styled to the design bar,
  verified with Playwright, then update PLAN.md + TEACHING.md, then STOP.

## Design bar
Benchmark: Linear. Dark, layered, restrained, fast. Direction is **"Graphite & Signal"** (see
PLAN.md §6): cool graphite surfaces, one disciplined **signal-amber** accent meaning "live/now",
Geist Sans + Geist Mono (mono only for identifiers), fast purposeful micro-motion, considered
empty/loading/error states. Never generic Bootstrap/AI-default.

## Resume ritual (start of every session)
1. Read this file (CLAUDE.md) and PLAN.md.
2. Find the current phase and the next unchecked tasks.
3. Continue from there. Verify with Playwright, update the docs, then pause for "continue".
