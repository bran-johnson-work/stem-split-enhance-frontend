# KlearNote — Frontend

Front-end for **KlearNote MVP v1**: a web SaaS where users upload AI-generated
audio and get back cleanly separated stems plus an enhanced master file.

This repo is the UI/UX and front-end implementation (per the project SOW). The
backend/API is provided separately; the app currently runs against a typed
**mock API layer** so the UI can be built and reviewed independently.

## Tech stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui** (new-york)
- **TanStack Query** for server state, **react-hook-form** + **zod** for forms
- **next-themes** (dark/light), **Geist** font, **wavesurfer.js** (audio, upcoming)

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

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
[`lib/api/client.ts`](lib/api/client.ts), implemented by `MockApi`. When
the real API is ready, add an `HttpApi` implementing the same interface and
switch it in [`lib/api/index.ts`](lib/api/index.ts) (gate on an env flag like
`NEXT_PUBLIC_USE_MOCK`) — no component changes.
