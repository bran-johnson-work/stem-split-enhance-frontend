# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

## Project

KlearNote frontend — Next.js 16 (App Router, React 19, Tailwind v4, shadcn/radix)
for the AI audio stem-separation product. It talks to the FastAPI backend in the
sibling `backend/` repo.

**Read `.agents/skills/nextjs-architecture/SKILL.md` before adding a feature,
wiring an endpoint, or touching `lib/api/`, `lib/query/`, or any component that
fetches.** It is the authoritative architecture, performance and clean-code
guide. The rules below are the summary; the skill has the reasoning and examples.

## Commands

```bash
npm run dev        # next dev --webpack
npm run build
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
```

Env comes from `.env` (see `.env.example`). The one that changes behaviour is
`NEXT_PUBLIC_API_URL`: **unset → the app runs fully mock** (simulated auth,
upload and projects, no backend needed); set → real endpoints. That switch is
made in exactly one place, `lib/config.ts`, and consumed via `USE_REAL_BACKEND`.

## Architecture

One-directional layering — a layer imports from the layer below, never above:

```
app/**/page.tsx     Server Components: routing, metadata, prefetch
components/**       Presentation: props in, JSX out
lib/query/*         React Query option factories + hooks — the only fetch entry point for components
lib/api/index.ts    The `api` singleton seam: MockApi or HttpApi, chosen by env
lib/api/*.ts        Transport: URL building + wire→domain mapping
lib/api/fetch.ts    One fetch: bearer token + FastAPI error normalisation
lib/types.ts        App domain types (never backend wire shapes)
```

Non-negotiables:

- A component never imports `apiFetch` or a `lib/api/*` module and never writes a
  URL. It imports a hook from `lib/query/*`. Missing hook → add one.
- **Every API call is a React Query hook.** Reads are `useQuery`, writes are
  `useMutation`, both declared in `lib/query/<feature>.ts`. No `fetch` in a
  component, no `useEffect` + `useState` loading flag, no bare `.then()` chain.
  Loading/error state comes from the hook (`isPending`, `isError`, `error`) —
  never a local `useState` mirroring it. `apiFetch` is the transport React Query
  calls, not an alternative to it; it stays inside `lib/api/`. The single
  sanctioned exception is `lib/upload/*` (an XHR progress stream driven by queue
  drain) — see the skill for why converting it would introduce a retry loop.
- Backend `snake_case` never escapes `lib/api/`. Map it there (`mapProject`,
  `mapUser`, `mapJob`). A `snake_case` key in `components/` is a bug.
- Query keys come only from `lib/query/keys.ts`. Never a literal `["projects"]`.
- Keep the `MockApi` branch working. It is how the UI runs with no backend —
  when wiring a real endpoint, move it into `HttpApi`, don't delete the mock.
- Default to Server Components. Push `"use client"` down to the interactive leaf;
  never onto a page or layout.

## Performance

- State lives as low as the tree allows; don't hoist a search field above a table.
- No inline object/array literals as props to memoized children or inside query
  keys — new identity every render, infinite refetch.
- `React.memo` on list rows (`project-row-card`, `stem-lane`, `upload-queue-item`),
  not on one-shot page sections. Memo only helps if props are stable.
- Narrow with the query `select` option so a component re-renders only on the
  fields it reads.
- Non-visual mutable values (in-flight flags, counters) use `useRef`, not state.
- Effects: exhaustive deps, cleanup on every subscription/timer/listener.
- List `key` is a stable id, never the array index.

## Clean code

No unused imports, variables, props or exports. No dead abstractions — delete
code that a backend change orphaned rather than leaving it. No `any`; use
`unknown` at boundaries and narrow. Comments explain *why*, not *what* — match
the standard set by `lib/api/users.ts::changePassword`. Validation schemas in
`lib/validations/*` are the single source of truth; derive types with `z.infer`
rather than hand-writing them.

## Backend contract gotchas

Verify against `backend/app/api/v1/endpoints/` rather than assuming:

- **Uploads are S3 presigned POSTs, not PUTs.** `/projects/{id}/files/upload-url`
  returns `{url, fields}`; send `multipart/form-data` with every `fields` entry
  appended before the `file` part. S3 enforces size/content-type itself.
- **`UserResponse.role`** is a real DB column (`user` | `admin`) — don't derive
  admin from an email allowlist.
- **Billing is Stripe Checkout + Portal** (redirect-based). No card-on-file API,
  no invoices endpoint. Those parts of the billing UI remain on `MockApi`.
- **Progress and stems come from the jobs API**, not the project: the project
  carries a coarse status only.
- **The project list has no search/filter/total** — `skip`/`limit` over a bare
  array, so `HttpApi.listProjects` windows and filters client-side.
