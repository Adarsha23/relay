# TEACHING.md — Relay

> Notes accumulate here as the app is built. **Do not deliver any of this until the user types
> "teach me".** When they do, expand these notes into a full, beginner-from-zero course covering
> the whole app in order (see TEACHING PROTOCOL in the project brief).
>
> Per-phase note shape: what we built, why, new concepts named plainly, and a small map of the
> key files/functions with what each does. Raw notes are fine — polish comes at "teach me".

---

## Phase 0 — Brainstorm & plan
*(Planning phase — no code yet. The reasoning behind every locked decision lives in PLAN.md:
product definition, scope + cuts, stack trade-off, architecture/sync model, design direction,
risks, and the phased checklist. At "teach me" this becomes the "why this project, why this stack"
foundation.)*

## Phase 1 — Setup + tooling + deploy hello-world

**What we built:** an empty-but-real app skeleton — a Next.js site that boots, is styled in our
dark theme, talks to a Convex backend, and has an automated browser test that proves it renders.

**Why:** before any features, prove the whole pipeline end to end (browser → Next → Convex → back)
on a tiny "hello-world". If the plumbing works for one query, it works for all of them.

**New concepts, named plainly:**
- **Next.js (App Router):** the React framework. Files under `app/` become pages. `layout.tsx`
  wraps every page (fonts, `<html>`, providers); `page.tsx` is the page itself.
- **Server vs client components:** files are server-rendered by default; `"use client"` at the top
  marks a file that also runs in the browser (needed for interactivity + Convex hooks).
- **Convex:** our backend + database + realtime, all in TypeScript. Functions live in `convex/`.
  A **query** reads data and *auto-updates* every subscribed browser when the data changes; a
  **mutation** (Phase 2) writes data.
- **Reactive query / subscription:** `useQuery(api.hello.status)` opens a live websocket
  subscription — the component re-renders whenever the server value changes. This is the seed of
  the whole sync engine.
- **Tailwind CSS v4:** utility classes for styling. The theme (colors, fonts) is defined as CSS
  variables in `app/globals.css` under `@theme`.
- **shadcn/ui:** copies accessible component source (built on Base UI primitives) into
  `components/ui/` so we own and can restyle them. `cn()` merges Tailwind class names.
- **Playwright:** drives a real browser to test the app. Our smoke test loads the page and asserts
  the heading + that the dark theme actually applied.
- **Codegen / `_generated`:** Convex generates typed helpers in `convex/_generated/` from our
  schema + functions, so the frontend gets autocomplete and type-checking for backend calls.

**Key files (map):**
- `app/layout.tsx` — root layout. Loads Geist Sans/Mono, sets `<html class="dark">`, wraps the app
  in `ConvexClientProvider`.
- `app/ConvexClientProvider.tsx` — creates the `ConvexReactClient` and provides it to the tree so
  `useQuery`/`useMutation` work. Falls back to a placeholder URL before `convex dev` is run.
- `app/page.tsx` — the themed hello-world; `useQuery(api.hello.status)` drives the connection pill.
- `app/globals.css` — the "Graphite & Signal" theme: canvas/panel/border/text/amber tokens.
- `convex/hello.ts` — the `status` query (`() => "ok"`), our first backend function.
- `convex/_generated/*` — typed backend bindings (hand-stubbed now; `convex dev` regenerates).
- `playwright.config.ts` + `tests/smoke.spec.ts` — the test runner config + the smoke test.

**Deploy note (for the walkthrough):** the live URL step needs the account owner to run
`npx convex dev` once (login → creates a deployment → writes `NEXT_PUBLIC_CONVEX_URL` →
regenerates `_generated`), then deploy Next to Vercel with Convex prod. Everything else is done.

## Phase 2 — Data model + auth + basic issue CRUD

**What we built:** the database shape and the server functions that read/write it, plus a
lightweight "guest" identity so every visitor is a real user with a name and color.

**New concepts:**
- **Schema** (`convex/schema.ts`): declares tables + their fields + indexes. `v.union(v.literal…)`
  makes `status`/`priority` a fixed set of allowed strings. Indexes (`by_status`, `by_number`,
  `by_user`) let queries look things up fast without scanning every row.
- **Query vs mutation:** a `query` only reads (and is reactive); a `mutation` writes (and is a
  transaction — either all its writes happen or none). Only mutations may use `Date.now()`/random;
  queries must be deterministic so Convex can cache/replay them.
- **Auto-increment issue numbers:** a `counters` row read-and-incremented inside the create
  mutation. Because mutations are transactional, two creates can't grab the same number.
- **Guest identity:** `users.createGuest` mints a user; the browser stores its id in
  `localStorage` (see `app/user-provider.tsx`). No passwords — the brief said cut hard on auth.

**Key files:** `convex/schema.ts` (tables), `convex/users.ts` (guest create/get/list/rename),
`convex/issues.ts` (list/get/create/update/remove), `convex/presence.ts`, `convex/seed.ts` (demo
data), `app/user-provider.tsx` (React context holding the current guest).

## Phase 3 — Core UI at Linear quality

**What we built:** the actual app — a dense issue list grouped by status, a detail panel, a create
dialog, a ⌘K command palette, keyboard navigation, and optimistic edits.

**New concepts:**
- **Optimistic update:** `useMutation(...).withOptimisticUpdate(...)` (see
  `hooks/use-update-issue.ts`) patches the local query cache *before* the server replies, so a
  status change looks instant. Convex swaps in the real value when it lands, and rolls back on
  error automatically.
- **Client-side join:** `issues.list` returns raw issue docs; the UI looks up assignee/creator
  names from `users.list`. Keeping issues un-joined makes the optimistic patch a one-document edit.
- **Command palette:** `cmdk` inside a dialog. Note the gotcha (below): the shadcn `CommandDialog`
  didn't wrap children in the `Command` provider, so we add `<Command>` ourselves.
- **Keyboard handling:** one `keydown` listener in `app/page.tsx` (j/k move, c create, / and ⌘K
  palette, Esc close). It ignores keys while you're typing in an input.

**Key files:** `lib/issue-meta.tsx` (status/priority SVG glyphs + Avatar), `lib/order.ts`
(grouping/sort), `components/issue-list.tsx`, `components/issue-detail.tsx`,
`components/pickers.tsx`, `components/create-issue-dialog.tsx`, `components/command-palette.tsx`,
`components/app-shell.tsx`, `app/page.tsx`.

## Phase 4 — Real-time sync + presence

**What we built:** live multi-user sync (already "free" from Convex reactive queries), presence
(who's online, who's viewing what), and the amber pulse when a change arrives from someone else.

**New concepts:**
- **Reactive fan-out = the sync engine:** every browser that called `useQuery(api.issues.list)` is
  subscribed over a websocket. When any mutation writes, Convex recomputes the query and pushes the
  new result to all of them. No polling, no manual sockets.
- **Presence via heartbeat + TTL:** each tab writes `lastSeen` every 5s (`presence.heartbeat`).
  "Online" = seen in the last 15s, filtered on the client (queries can't read the clock). A closed
  tab stops heartbeating and quietly drops off — no "ghost" users.
- **Distinguishing remote vs local changes:** `lib/local-edits.ts` remembers ids we just edited so
  the pulse only fires for changes from *other* clients (`components/issue-list.tsx`).

**Key files:** `hooks/use-presence.ts` (heartbeat + online list), `convex/presence.ts`, the pulse
logic in `components/issue-list.tsx`, the `relay-pulse` keyframe in `app/globals.css`.

**Testing note (important):** verified against a local anonymous Convex backend started with
`CONVEX_AGENT_MODE=anonymous npx convex dev` — a real backend, no cloud account. `realtime.spec.ts`
opens two browser contexts and proves a create in one shows up in the other with no reload.

**Live text editing (added after feedback):** originally title/description saved on blur, so the
other window only updated when you clicked away. Now:
- Every keystroke throttles a write (~180ms), so text propagates live via the reactive `get` query.
- Presence carries `editingField` ("title"/"description"); the detail shows "X is editing" with a
  pulsing colored dot (`EditingBadge` in `issue-detail.tsx`).
- The field you're typing in ignores remote overwrites (a `focusedRef` guard) so your cursor never
  jumps; when you blur, it re-syncs and flushes the last value.
This is live propagation + editing presence — deliberately NOT full CRDT co-typing (locked out by
the brief). Verified by `live-edit.spec.ts`.

## Phase 5 — Reconnect & reconciliation

**What we built:** graceful handling of a dropped connection — an offline indicator, dimmed
presence, and confidence that edits made while disconnected land once you're back.

**New concepts:**
- **Connection state:** `hooks/use-connection.ts` watches Convex's websocket state
  (`subscribeToConnectionState`) *and* the browser's `navigator.onLine`. If either says offline,
  the header shows "Reconnecting…" and presence dims.
- **Queue + flush:** Convex queues mutations made while the socket is down and replays them on
  reconnect; the server's authoritative result then overwrites any local/optimistic state. We
  didn't write this — it's why the backend choice matters.
- **Optimistic rollback:** if a mutation fails on the server, `withOptimisticUpdate`'s local patch
  is reverted automatically (`useForceFail` + `issues.debugFail` exist purely to prove this in a
  test).

**Testing note:** `setOffline()` doesn't sever a websocket to a loopback backend, so
`reconnect.spec.ts` intercepts the Convex socket with Playwright's `routeWebSocket` to genuinely
drop and restore it — then asserts: indicator appears, an offline edit stays local (the other
client still shows the old value), and after reconnect the edit flushes to the server and reaches
the other client. A second test proves rollback. All specs are self-contained (each creates its
own issues) so the suite is idempotent.

**Key files:** `hooks/use-connection.ts`, offline UI in `components/app-shell.tsx`,
`useForceFail` in `hooks/use-update-issue.ts`, `convex/issues.ts` (`debugFail`).

## Phase 6 — Polish

**What we built:** the details that separate "works" from "feels finished" — responsive layout,
every loading/empty/error state, and an accessibility pass.

**New concepts:**
- **Responsive overlay:** below the `xl` breakpoint the detail panel is `absolute` and floats over
  the list with a dimming scrim (tap to close); at `xl` it's a static side-by-side column. The
  sidebar hides below `md`. This fixes the earlier bug where the list title column got crushed on
  side-by-side windows. (`components/issue-detail.tsx` `panelClass`, scrim in `app/page.tsx`.)
- **The three states (R-27):** empty ("No issues yet — press C…"), loading (skeleton rows + a
  detail skeleton), and error (`app/error.tsx`, a route-level boundary so a thrown query never
  white-screens).
- **Accessibility:** contrast checked with a real formula (all body text ≥6.5:1, icons ≥3:1),
  icon-only buttons carry `aria-label`, and a global `prefers-reduced-motion` rule neutralizes
  animations/transitions for users who ask for it.

**Key files:** `components/app-shell.tsx` (responsive sidebar/header), `components/issue-detail.tsx`
(overlay + skeleton), `app/page.tsx` (scrim), `app/error.tsx`, reduced-motion in `app/globals.css`.

## Phase 7 — Ship

**What we built:** the things that make it a shippable product, not just a running app — one-click
demo data, a README that explains the architecture, a real demo GIF, and deploy config.

**New concepts:**
- **Seed / demo data:** `convex/seed.ts` clears and repopulates the workspace; triggered from the
  empty state ("Load demo data") and the command palette ("Reset demo data"). A visitor gets a
  populated app in one click.
- **README as the front door:** the architecture section walks a single edit through optimistic
  update → server write → reactive fan-out → other clients, because that path *is* the project.
- **Recorded demo GIF:** two Playwright browser contexts drive a scripted sync interaction while
  recording video; ffmpeg composites them side by side (`hstack`) and converts to a palette-based
  GIF (`docs/demo.gif`). This is how you show real-time behavior in a static README.
- **Deploy model:** Vercel builds with `npx convex deploy --cmd 'pnpm build'` (`vercel.json`), which
  deploys the Convex backend and injects `NEXT_PUBLIC_CONVEX_URL` into the Next build. The only
  secret is `CONVEX_DEPLOY_KEY`. The public URL needs the account owner's login — everything up to
  that was built and verified against a local anonymous Convex backend.

**Key files:** `convex/seed.ts`, demo-data actions in `components/issue-list.tsx` +
`components/command-palette.tsx`, `README.md`, `docs/demo.gif`, `docs/screenshot.png`,
`vercel.json`, `.env.example`.

---

## Foundations to add when teaching (fill in at "teach me")
When the full course is delivered, prepend a foundations chapter: what a variable/function is,
sync vs async, what a client and server are, how a web app is served, what a websocket is, what
TypeScript adds over JavaScript — then the phase-by-phase code walkthrough above, opening the real
files in order.
