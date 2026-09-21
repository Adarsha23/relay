# Relay — PLAN.md

> Single source of truth. Read this at the start of every phase. Tick boxes as you finish.
> If the plan changes, edit it here and add a one-line note under Changelog. Never drift silently.

---

## 1. Product definition

**Name:** Relay *(recommended — see name options at the bottom)*

**One-sentence pitch:** A fast, keyboard-driven issue tracker where a team's edits and presence
sync live across everyone's screen — no refresh, no lag.

**The one job it does better than a generic tracker:** it feels *alive*. Open Relay in two
tabs and a status change, a new issue, or a teammate arriving shows up on the other screen
instantly, with optimistic UI so your own actions never wait on the network. A generic tracker
makes you refresh; Relay is the demo where the reviewer opens two windows and watches them move
together.

**Who it's for:** a small product/engineering team tracking tasks and bugs. In the live demo,
it's for a recruiter who opens two browser windows to watch real-time sync happen.

---

## 2. Scope

### Core features (what makes it feel real)
1. **Issues with substance** — title, description, status, priority, assignee, an issue key
   (`REL-12`), created/updated timestamps.
2. **Linear-quality UI** — dense issue list + focused detail view, create/edit inline,
   full keyboard navigation, and a `⌘K` command palette.
3. **Real-time sync** — any create/edit/delete propagates live to every connected client over
   a websocket, with no manual refresh.
4. **Presence** — see who else is online (live avatars) and who is currently viewing an issue.
5. **Optimistic UI + reconnect/reconciliation** — local actions apply instantly and roll back
   on failure; dropped connections recover and stale state reconciles to the server truth.

### NOT building (cut hard — ponytail)
- **Full auth / orgs / RBAC / teams admin** — one shared workspace + lightweight sign-in
  (incl. one-click demo login). *Auth plumbing isn't the story; the sync engine is.*
- **Billing / subscriptions** — irrelevant to the pitch.
- **Comments/activity threads** — great realtime surface, but issue edits already prove sync.
  *Candidate to add in polish only if time allows.*
- **File attachments** — storage cost + complexity, zero payoff for the pitch.
- **Multiple projects/workspaces, cycles, sprints, roadmaps, sub-issues, custom fields** —
  scope creep. One workspace demos everything.
- **Native mobile app** — responsive web only.
- **Full CRDT / Yjs offline editing** — explicitly locked out by the brief. Our sync depth is
  real-time + presence + optimistic + reconnect. No more.
- **Email / push notifications** — no payoff for a demo.

---

## 3. Quality benchmark

**Emulate from Linear:**
- Command palette (`⌘K`) as the primary way to do everything.
- Keyboard-first navigation (`j/k` to move, `c` to create, `/` to search, `Esc` to close).
- Perceived speed — optimistic updates make every action feel instant.
- Visual restraint — dark, layered surfaces, hairline borders, one disciplined accent.
- Micro-motion — fast, purposeful, no bounce.

**Deliberately ignore from Linear:**
- Its enormous feature surface (roadmaps, cycles, triage, SLAs, integrations, insights).
- Multi-workspace / org administration.
- Analytics dashboards.

---

## 4. Stack decision

### Realtime backend trade-off

| Criterion | **Convex** (chosen) | Supabase | Firebase |
|---|---|---|---|
| Realtime story | Reactive queries: any write auto-pushes to all subscribers. Sync is the core. | Postgres changes + Broadcast + first-class Presence, but wired manually. | Realtime DB/Firestore listeners; works but dated DX. |
| Free tier | Generous for a portfolio app. | Generous (project sleeps when idle). | Generous. |
| Auth | Convex Auth built in (Anonymous / Password / OAuth). | Best-in-class auth + RLS. | Firebase Auth, solid. |
| DX | End-to-end TypeScript; types flow schema → client; optimistic updates first-class. | Great, but realtime + RLS + optimistic is more hand-wiring. | Not TS-first; weakest types. |
| Beginner-friendly | Very — minimal config, one mental model. | Medium — SQL + RLS + realtime channels to learn. | Medium. |

**Decision: Convex.** One-line justifications:
- **Realtime:** reactive queries update every subscribed client automatically — the framework's
  core competency *is* the sync engine, so effort goes into presence, optimism, and reconnect.
- **Free tier:** comfortably covers a solo portfolio demo at $0.
- **Auth:** Convex Auth gives Anonymous + Password with almost no code — enough for a shared demo.
- **DX:** one TypeScript codebase; schema types reach the client; optimistic updates + rollback
  are a first-class API, not something we hand-roll.
- **Beginner-friendly:** one mental model (queries + mutations), great docs, self-deploying.

> Alternative if the user wants to showcase raw SQL/RLS backend depth: **Supabase**. It's more
> impressive-on-paper backend cred but a rougher path to a *polished, shipped* real-time demo
> solo. Say the word in Phase 0 and we switch before any code.

### Full stack (locked)
- **Language:** TypeScript everywhere.
- **Frontend:** Next.js (App Router) + React.
- **Backend/realtime/DB:** Convex (queries, mutations, schema, auth).
- **Auth:** Convex Auth — Password + a one-click demo login; anonymous fallback.
- **Styling:** Tailwind CSS.
- **Components:** shadcn/ui (Radix primitives) for accessible dialog/dropdown/etc. — *use
  existing accessible components instead of hand-building modals.*
- **Command palette:** `cmdk`.
- **Motion:** CSS transitions first; a small amount of Framer Motion only where CSS can't.
- **Fonts:** Geist Sans (UI) + Geist Mono (identifiers) via `next/font`.
- **Hosting:** Vercel (frontend) + Convex (backend deploys itself). $0.
- **Testing:** Playwright (webapp-testing skill), including the two-context real-time test.

---

## 5. Architecture sketch

### Data model (Convex tables)
- **users** — provided by Convex Auth; extended with `name`, `image`, and an avatar `color`.
- **issues**
  - `title: string`, `description?: string`
  - `status: "backlog" | "todo" | "in_progress" | "done" | "canceled"`
  - `priority: "none" | "low" | "medium" | "high" | "urgent"`
  - `assigneeId?: Id<"users">`, `creatorId: Id<"users">`
  - `number: number` → shown as the issue key `REL-{number}`
  - `createdAt: number`, `updatedAt: number`
  - indexes: `by_status`, `by_assignee`, `by_creation`
- **presence** *(hand-rolled, minimal — ponytail: ~20 lines, fully ours, easy to teach)*
  - `userId: Id<"users">`, `lastSeen: number`, `focusIssueId?: Id<"issues">`
  - index: `by_user`, `by_lastSeen`
  - "online" = a row with `lastSeen` within the last ~15s (TTL filter, so a closed tab can't
    leave a ghost). *Upgrade path: the official `@convex-dev/presence` component.*

Relations: `issue.creatorId`/`issue.assigneeId` → `users`; `presence.userId` → `users`;
`presence.focusIssueId` → `issues`.

### How sync works, end to end
1. **Click → optimistic update.** User changes a status. The mutation is called *with an
   optimistic update* that patches the local Convex query store immediately — the UI changes
   before the network round-trips.
2. **Server write.** The Convex mutation runs on the server and writes to the DB — the single
   source of truth. `updatedAt` is stamped server-side.
3. **Reactive fan-out.** Convex detects the write and pushes fresh results down the websocket to
   **every client subscribed** to the affected query — including the initiator, whose optimistic
   value is replaced by the confirmed server value.
4. **Presence.** Each client sends a heartbeat mutation (~every 5s) updating `lastSeen` (and
   `focusIssueId` when viewing an issue). A live query returns everyone seen in the last 15s →
   avatars render and disappear on their own.
5. **Reconnect / reconciliation.** The Convex client keeps a websocket and auto-reconnects; it
   re-subscribes and flushes any queued mutations, then authoritative query results overwrite
   any stale/optimistic local state. The UI surfaces an offline indicator and dims presence
   while disconnected. A failed mutation auto-rolls back its optimistic patch.

### Where each piece of state lives
- **Source of truth:** Convex DB (server).
- **Live cache:** Convex React client, in-memory, auto-updated over the websocket.
- **Optimistic/local overlay:** temporary, via the mutation's optimistic-update API.
- **Presence:** ephemeral rows in Convex, queried live with a TTL filter.
- **UI-only state** (selected issue, palette open, filters): React state + the URL.

---

## 6. Design direction — "Graphite & Signal"

Distinctive but restrained. Benchmark is Linear, but we are **not** cloning Linear's
Inter + indigo. Boldness is spent in exactly one place: a warm **signal amber** that means
"live / now / attention" — which ties the palette to the product's real-time identity. Everything
else stays quiet.

- **Color — layered graphite (cool undertone), a disciplined amber accent, functional status hues.**
  - Canvas `#0C0D10` · Panel `#131418` · Raised/hover `#1A1C22` · Overlay `#1C1E24` (with blur)
  - Hairline border `#24262E`
  - Text: primary `#E7E9EE` · secondary `#9CA1AD` · muted `#676C78`
  - **Accent (focus ring, primary action, active nav, "in progress", remote-change pulse):**
    signal amber `#F5B544`
  - Status colors: backlog gray · todo light-gray ring · in-progress amber · done calm green
    `#4 CC8F`-ish · canceled dim. Priority rendered as neutral signal-bar glyphs (urgent = red box),
    Linear-style, to avoid hue clashes.
- **Typography.** Geist Sans for all UI; Geist Mono **only** for machine identifiers (issue keys
  `REL-12`, keyboard shortcuts, timestamps) — grounded in the developer vernacular, not decoration.
  Scale: 11 (kbd) · 12 (meta) · 13 (dense rows) · 14 · 16 · 20 · 24. Weights 400/500/600.
- **Layout.** 4px base grid. 240px left sidebar (views, filters). Dense list rows ~36–40px.
  Issue detail = a calm ~720px reading column. Left-aligned throughout; no center-aligned body.
- **Motion.** Fast (120–180ms), ease-out, no bounce. Command palette scales 0.98→1 + fades.
  Presence avatars fade/scale in on join. **Signature moment:** when a *remote* change lands, the
  affected row does a brief amber left-border pulse — this makes the invisible sync engine
  *visible*, which is the whole point of the project. Respect `prefers-reduced-motion`. No
  scattered scroll-triggered fade-ups.

**Anti-slop guardrails (checked against frontend-design's tells):** no cream/serif/terracotta;
not a single-neon-accent-on-black (we have a full functional status system); layered elevation is
a real system, not lazy `#111`; no ALL-CAPS eyebrows, no `A · B · C` meta strings, no `→` glued
to buttons; mono is reserved for real identifiers only.

---

## 7. Risks & how we de-risk

1. **Two-context real-time Playwright test** (hardest to make reliable). *De-risk:* stand up the
   Playwright harness early; keep `convex dev` running during tests; write a smoke version in
   Phase 3, the full two-context assertion in Phase 4.
2. **Reconnect / reconciliation** is hard to test deterministically. *De-risk:* lean on Convex's
   built-in websocket recovery; simulate drop with Playwright `context.setOffline(true)`; assert
   queued mutations flush and stale state reconciles on reconnect.
3. **Presence ghosts** (tab closed but avatar lingers). *De-risk:* heartbeat + TTL filter in the
   query — never rely on disconnect events.
4. **Optimistic rollback** on mutation failure. *De-risk:* use Convex's optimistic-update API,
   which rolls back automatically on error; add one test that forces a failure.
5. **Public demo hitting a signup wall.** *De-risk:* a one-click demo login so a reviewer is in
   the app in one click.

---

## 8. Phase plan (acceptance criteria + checkboxes)

> Pause after every phase. Verify with Playwright. Update these boxes, append to TEACHING.md.

### Phase 0 — Brainstorm & plan ✅ (this document)
- [x] PLAN.md, CLAUDE.md, TEACHING.md skeleton written
- [x] Name options + recommendation, stack decided, architecture + design direction locked
- **Acceptance:** the three rails files exist and are coherent. **STOP for "continue".**

### Phase 1 — Setup + tooling + deploy a hello-world
- [x] `git init`; Next.js 16 (App Router, TS) + Tailwind v4 scaffold
- [x] Convex wired (ConvexProvider + `hello.status` query); Geist fonts + Graphite & Signal theme
- [x] shadcn/ui installed (Base UI + Lucide); Playwright installed with one passing smoke test
- [ ] Deployed to Vercel + Convex on a real URL — **needs the user's one-time login** (see report)
- **Acceptance:** themed hello-world renders + smoke test passes locally ✅; the live URL is pending
  the one-time `npx convex dev` + Vercel login (only the account owner can do that).

### Phase 2 — Data model + auth + basic issue CRUD ✅
- [x] Convex schema (`issues`, `presence`, `users`, `counters`) + indexes
- [x] Auth: **lightweight guest identity** (ponytail — see note); Convex Auth = upgrade path
- [x] Mutations/queries: create, list, get, update (status/priority/assignee/title), delete
- [x] UI proving CRUD works end to end (verified via `convex run` + Playwright)
- **Acceptance:** a guest user can create/edit/delete an issue and it persists ✅. Playwright
  `crud.spec.ts` covers the happy path.
- **Note:** auth was scoped to guest identities (localStorage + server `users` record). The brief
  says cut hard on auth; this nails "one-click demo login" and makes two-window collab trivial.

### Phase 3 — Core UI at Linear quality ✅
- [x] Issue list (dense rows grouped by status, `REL-` keys, priority/status glyphs) + detail panel
- [x] Create dialog; `⌘K` command palette (`cmdk`); keyboard nav (`j/k/c/ /Esc`)
- [x] Optimistic updates on status/priority/assignee changes (+ rollback via Convex API)
- **Acceptance:** Linear-grade dark UI (screenshots reviewed) ✅; keyboard flow works; status change
  is instant. `crud.spec.ts` covers palette + keyboard create + optimistic edit.

### Phase 4 — Real-time sync + presence ✅
- [x] Live list/detail updates across clients (reactive Convex queries, no refresh)
- [x] Presence: online avatars + "viewing this issue" indicator via heartbeat + TTL query
- [x] Remote-change amber pulse (skips this client's own edits)
- **Acceptance:** **two-context Playwright test** ✅ (`realtime.spec.ts`) — a create in context A
  appears in context B with no reload; each client sees ≥2 online.
- **Live text sync (added per feedback):** title/description now propagate *as you type* (throttled
  ~180ms), not on blur; a per-field "X is editing" indicator shows who's in a field; your own cursor
  is never clobbered by remote updates. Verified by `live-edit.spec.ts`. **Ceiling (ponytail):** this
  is live propagation + editing presence, NOT true CRDT co-typing of the same field (locked out by
  the brief). Two people typing the same field at once is last-write-wins.
- **Known layout nit (→ Phase 6):** with the 440px detail open on a narrow (<~1100px) viewport, the
  list column crushes and titles truncate hard. Fix: responsive/overlay detail on narrow screens.

### Phase 5 — Reconnect & reconciliation ✅
- [x] Offline indicator ("Reconnecting…") + dimmed presence while disconnected (Convex ws state +
  `navigator.onLine`)
- [x] Queued mutations flush and stale state reconciles on reconnect (Convex built-in)
- [x] Optimistic rollback on forced mutation failure (Convex `withOptimisticUpdate` auto-revert)
- **Acceptance:** `reconnect.spec.ts` — a real socket drop via `routeWebSocket` (setOffline can't
  sever loopback ws): indicator shows, an offline status edit stays local, then flushes to the
  server and reaches the other client on reconnect ✅; a forced-fail mutation rolls back cleanly ✅.
  Ghost presence is already prevented by the heartbeat TTL (Phase 4).

### Phase 6 — Polish ✅
- [x] Responsive layout: detail panel overlays the list (with a scrim) below `xl`, side-by-side at
  `xl`; sidebar collapses below `md` (fixes the narrow-viewport title truncation)
- [x] States: empty (names the action), list + detail loading skeletons, route-level `error.tsx`
- [x] Accessibility: contrast verified (all text ≥6.5:1; icons ≥3:1), aria-labels on icon buttons,
  full keyboard flow, global `prefers-reduced-motion` baseline; amber left-edge is a state signal
  (selected/pulse), not decoration
- **Acceptance:** considered empty/loading/error states ✅; antislop-ui + antislop-human pass ✅;
  `responsive.spec.ts` verifies the overlay/side-by-side switch; all 7 specs green.

### Phase 7 — Ship ✅ (build) · deploy pending user login
- [x] One-click demo data ("Load demo data" on empty state + "Reset demo data" in ⌘K → `seed.run`)
- [x] README with an architecture/sync-engine section + a real two-window demo GIF (`docs/demo.gif`,
  recorded via Playwright, composited with ffmpeg) + hero screenshot
- [x] Deploy prepped: `vercel.json` (build = `npx convex deploy --cmd 'pnpm build'`), `.env.example`,
  README deploy steps
- [ ] Final deploy to a live URL — **needs the account owner**: `npx convex deploy` (cloud, login) +
  Vercel import + `CONVEX_DEPLOY_KEY`
- **Acceptance:** one-click demo data ✅, README explains the sync engine ✅, two-window realtime ✅
  (GIF + tests); the public URL is the one remaining owner-only step.

---

## Name options
1. **Relay** *(recommended)* — real-time handoff of state between teammates; names the sync engine.
2. **Cadence** — team rhythm/velocity; evokes a well-run team.
3. **Beacon** — presence and a live signal going out to everyone.

> Repo folder is currently `relay`. If you pick another name, say so on "continue" and it gets
> renamed before Phase 1.

---

## Changelog
- 2026-09-18 — Phase 0 authored. Stack: Convex + Next.js. Name recommended: Relay.
- 2026-09-18 — Phase 1 built & verified locally. Next 16 + Tailwind v4 + Convex 1.46 + shadcn
  (Base UI/Lucide) + Playwright. Themed hello-world backed by `hello.status`; smoke test green.
  Deploy handoff pending user login. Note: shadcn `-d` used Base UI (not Radix) — accessible, fine.
- 2026-09-18 — Fixed a fatal crash (placeholder Convex URL) → graceful setup screen; hardened the
  smoke test to fail on runtime errors + run a fresh server on a dedicated port.
- 2026-09-18 — Live text sync + per-field editing indicators added after feedback (throttled writes,
  cursor-safe remote sync, "X is editing" badge). `live-edit.spec.ts` green.
- 2026-09-18 — Phase 5 done: offline indicator (ws + navigator), reconnect reconciliation, optimistic
  rollback. `reconnect.spec.ts` uses `routeWebSocket` for a real socket drop. All 6 specs green,
  idempotent across runs (tests made self-contained — each creates its own issues).
- 2026-09-18 — Phase 6 done: responsive detail overlay + sidebar collapse, loading/empty/error states,
  a11y (verified contrast, aria, reduced-motion). `responsive.spec.ts` added.
- 2026-09-18 — Phase 7 (build): one-click demo data, README + architecture + recorded two-window demo
  GIF (Playwright + ffmpeg), Vercel/Convex deploy config. All 7 specs green ×2 (fixed a crud focus
  flake — wait for the create dialog to unmount before keyboard nav). Public deploy pending owner login.
- 2026-09-18 — Phases 2–4 built & verified against a local anonymous Convex backend
  (`CONVEX_AGENT_MODE=anonymous`, no account needed). Guest-identity auth. Full Linear-grade UI:
  grouped list, detail panel, ⌘K palette, keyboard nav, optimistic updates, live sync, presence,
  remote-change pulse. All 3 Playwright specs green (smoke, crud, realtime two-context). Auth
  scoped to guest identities (flagged for user review). Convex Auth remains the upgrade path.
