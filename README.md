# KlearNote — Frontend

Front-end for **KlearNote MVP v1**: a web SaaS where users upload AI-generated
audio and get back cleanly separated stems plus an enhanced master file.

This repo is the UI/UX and front-end implementation (per the project SOW). The
backend/API is provided separately; the app currently runs against a typed
**mock API layer** so the UI can be built and reviewed independently.

## Tech stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui** (new-york) on **Radix UI** primitives
- **TanStack Query** for server state, **react-hook-form** + **zod** for forms
- **sonner** for toasts, **next-themes** (dark/light), **Geist** font
- **wavesurfer.js** for waveform/audio playback (Phase 2)

## Getting started

**Prerequisites:** Node.js **20+** and npm.

```bash
npm install
npm run dev      # http://localhost:3000
```

No environment variables are required — the app boots against the in-repo mock
API and mock auth. See [Backend integration](#backend-integration) for wiring a
real API.

Scripts:

| Script | Description |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

> **Note:** `dev` and `build` use the **webpack** bundler (`--webpack`).
> Turbopack's native binary crashes on some CPUs (`illegal instruction`);
> webpack avoids that. Drop the flag in `package.json` once Turbopack is stable
> on your hardware.

## Status & roadmap

Fully built screens are wired to the mock layer and ready for review. Remaining
screens ship as phased placeholders (`PlaceholderPage`) so navigation, layouts
and access rules are already in place.

| Screen | Route | Status |
| --- | --- | --- |
| Landing | `/` | ✅ Built |
| Pricing | `/pricing` | ✅ Built |
| Login / Signup / Forgot / Reset | `/login` `/signup` `/forgot-password` `/reset-password` | ✅ Built (mock auth) |
| Dashboard | `/dashboard` | ✅ Built (mock data) |
| Styleguide | `/styleguide` | ✅ Built |
| Upload | `/upload` | 🔜 Phase 2 |
| Projects / Project detail | `/projects` `/projects/[id]` | 🔜 Phase 2 |
| Settings | `/settings` | 🔜 Phase 3 |
| Billing | `/billing` | 🔜 Phase 3 |
| Admin (overview / projects / users) | `/admin` `/admin/projects` `/admin/users` | 🔜 Phase 4 |

### Mock auth

Auth runs against `lib/auth/mock-auth.ts` (no backend). Any credentials succeed,
with two triggers for exercising error states:

- Log in with **`fail@klearnote.ai`** → "Invalid email or password."
- Sign up with **`taken@klearnote.ai`** → "That email is already registered."

## Visual direction

All design tokens live in [`app/globals.css`](app/globals.css) as CSS variables
(brand red `#b4030e`, brightened to `#ff4655` in dark, hero gradient, light/dark
surfaces, and the 7 processing-state colors exposed as Tailwind utilities like
`text-analyzing` / `bg-completed`).

Visit **`/styleguide`** for a live reference of colors, type and component states.

## Project structure

```
app/
  (marketing)/   landing, pricing            — public, SEO
  (auth)/        login, signup, forgot, reset
  (app)/         dashboard, upload, projects, settings, billing
                 admin/ overview, projects, users   (admins only)
  styleguide/    design-system reference
  layout.tsx  providers.tsx                  — root shell + client providers
components/
  ui/            shadcn primitives
  marketing/ auth/ shared/ projects/         feature components
lib/
  api/           typed KlearNoteApi interface + mock client (swap point)
  auth/          mock auth helpers
  mock/          fixtures
  hooks/         TanStack Query hooks + use-mobile
  validations/   zod schemas
  types.ts  format.ts  nav.ts  utils.ts (cn)
```

## Backend integration

Every screen talks to the `KlearNoteApi` interface in
[`lib/api/client.ts`](lib/api/client.ts), implemented by `MockApi` and exported
from [`lib/api/index.ts`](lib/api/index.ts). When the real API is ready, add an
`HttpApi` implementing the same interface and swap it in `index.ts`, gated on an
env flag — no component changes:

```ts
// lib/api/index.ts
export const api: KlearNoteApi =
  process.env.NEXT_PUBLIC_USE_MOCK === "false"
    ? new HttpApi(process.env.NEXT_PUBLIC_API_URL!)
    : new MockApi();
```

Auth swaps the same way: replace the helpers in
[`lib/auth/mock-auth.ts`](lib/auth/mock-auth.ts) with real endpoint calls.
