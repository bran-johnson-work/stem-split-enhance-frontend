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
| Login / Signup / Verify email | `/login` `/signup` `/verify-email` | ✅ Built (real auth, env-gated) |
| Forgot / Reset password | `/forgot-password` `/reset-password` | ✅ Built (mock — no backend endpoint yet) |
| Dashboard | `/dashboard` | ✅ Built (mock data) |
| Styleguide | `/styleguide` | ✅ Built |
| Upload | `/upload` | 🔜 Phase 2 |
| Projects / Project detail | `/projects` `/projects/[id]` | 🔜 Phase 2 |
| Settings | `/settings` | 🔜 Phase 3 |
| Billing | `/billing` | 🔜 Phase 3 |
| Admin (overview / projects / users) | `/admin` `/admin/projects` `/admin/users` | 🔜 Phase 4 |

### Auth

Auth (login, signup, logout, email verification) runs through
[`lib/api/auth.ts`](lib/api/auth.ts), gated on `NEXT_PUBLIC_API_URL`:

- **Set** → real calls to Dakota's API (`/api/v1/auth/*`, `/users/me`). Signup
  starts unverified; login returns `403` until the email is confirmed, which
  routes the user to `/verify-email`.
- **Unset** → a mock fallback so the app is usable with no backend. Any
  credentials succeed, with two error-state triggers:
  - Log in with **`fail@klearnote.ai`** → "Invalid email or password."
  - Sign up with **`taken@klearnote.ai`** → "That email is already registered."

The access token is stored in a JS-readable cookie
([`lib/auth/token.ts`](lib/auth/token.ts)) so [`lib/api/fetch.ts`](lib/api/fetch.ts)
can attach `Authorization: Bearer …` and [`proxy.ts`](proxy.ts) can guard the
`(app)` routes server-side. Password reset has no backend endpoint yet, so it
stays mock ([`lib/auth/mock-auth.ts`](lib/auth/mock-auth.ts)). Google sign-in is
disabled ("Soon") pending an OAuth endpoint.

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
  api/           typed KlearNoteApi interface + mock client (swap point) + auth.ts
  auth/          token cookie, AuthProvider, password-reset mocks
  mock/          fixtures
  hooks/         TanStack Query hooks + use-mobile
  validations/   zod schemas
  types.ts  format.ts  nav.ts  utils.ts (cn)
```

## Backend integration

Every screen talks to the `KlearNoteApi` interface in
[`lib/api/client.ts`](lib/api/client.ts). The active implementation is chosen in
[`lib/api/index.ts`](lib/api/index.ts), gated on `NEXT_PUBLIC_API_URL`:

```ts
// lib/api/index.ts
export const api: KlearNoteApi = USE_REAL_BACKEND ? new HttpApi() : new MockApi();
```

- **Set** → [`HttpApi`](lib/api/http.ts) hits Dakota's API for the current user
  and projects (list/get/create), and **delegates billing + admin to `MockApi`**
  (no endpoints yet). Auth runs through [`lib/api/auth.ts`](lib/api/auth.ts);
  uploads through the presigned flow ([docs/upload-signing.md](docs/upload-signing.md)).
- **Unset** → fully mock/simulated, so the UI runs with no backend.

**Live status** ([`lib/hooks/use-processing-status.ts`](lib/hooks/use-processing-status.ts)):
real mode polls `GET /projects/{id}` (via `useProject`'s `refetchInterval`) for the
authoritative status and overlays a simulated sub-stage animation on top (the API
reports no intra-processing stage or progress); mock mode runs the pure simulator.

Still mock (no backend endpoint): billing, admin, stems/downloads, password reset,
Google OAuth.
