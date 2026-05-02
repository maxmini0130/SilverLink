# Copilot Instructions for WithDay/web

This repository is a small [Next.js 13](https://nextjs.org/) project that uses the **app directory** and Supabase for authentication and data.  The goal of this document is to give an AI agent enough context to be productive on day one.  Treat it as the "memory" of how this code is organised and what conventions are in use.

---
## 🧱 Big picture architecture

- **Framework:** Next.js 13 with the `app/` directory.  Every file under `src/app` is either a **server component** (default) or a **client component** (declared with `'use client'` at the top).  Server components can be async and call the Supabase server client; client components use hooks and the browser Supabase client.
- **Entry points:**
  - `src/app/page.tsx` is the home page.  It fetches the logged‑in user and their profile using the server Supabase client (`src/lib/supabase/server.ts`) and redirects to `/login` or `/onboarding` if necessary.
  - `src/app/login/page.tsx` renders a client form that signs in with Supabase OTP.
  - `src/app/auth/callback/route.ts` handles the OAuth callback by exchanging the code for a session then redirecting.
  - `src/app/onboarding/page.tsx` is a client component that collects profile data and upserts it into the `profiles` table.
- **Supabase helpers:**
  - `src/lib/supabase/client.ts` exports `createClient()` for use in browser components.
  - `src/lib/supabase/server.ts` exports an async `createClient()` for server components.  It uses `next/headers` cookies to persist the session.
- **Frontend structure:**
  - No React router; navigation uses `next/navigation` APIs (`redirect`, `useRouter().replace`).
  - Styling is inline for now; global CSS lives in `src/app/globals.css` and Tailwind is configured (see `tailwind.config.mjs` and `postcss.config.mjs`).
- **Data flow:**
  - Authentication via Supabase OTP email link redirecting to `/auth/callback`.
  - After login, the home page checks the `profiles` table.  Missing profile triggers onboarding.
  - Onboarding posts to the `profiles` table via `upsert`.

The repository is intentionally simple; new features should follow the same pattern of separating server calls into server components or route handlers and using `@/` imports.

---
## 🛠 Developer workflows

- **Install / run** – this project is part of a pnpm workspace.  From `web/`:
  ```bash
  pnpm install        # or pnpm i
  pnpm dev            # starts `next dev` on localhost:3000
  pnpm build && pnpm start
  pnpm lint           # runs eslint
  ```
  Some developers also just use `npm run` inside this folder; both work because `package.json` defines the scripts.

- **Environment variables** – required for Supabase:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - on the backend these same values are referenced in server code; they must be defined in `.env.local` for development.

- **Debugging** – since it’s standard Next.js, use `console.log` in components or in route handlers.  Server‑side logs appear in the terminal.  Client logs show in the browser console.

- **Database** – the only table currently is `profiles` with columns `user_id`, `nickname`, `age_band`, `region`, `hobbies` etc.  Migrations aren’t included; the schema is managed directly in the Supabase project.

- **Conventions**
  - Use absolute imports (`@/path/to/file`) as configured in `tsconfig.json`.
  - Prefix client components with `'use client'` and avoid using hooks in server components.
  - For any new page that interacts with Supabase, mimic the pattern in `/page.tsx` or `/onboarding/page.tsx`.
  - When you need to perform server‑side work outside React (e.g. an API route), create a file under `src/app/<path>/route.ts` using the Next.js Route Handlers API.

---
## 📁 Key files & directories

- `src/app/` – all of the UI and page logic.
- `src/lib/supabase/` – supabase client helpers (browser + server).
- `tsconfig.json` – alias `@/*` → `./src/*`.
- `package.json` – scripts and dependencies (`next`, `@supabase/ssr`, `react`, etc.).
- `.github/` – this file will live here; there are presently no CI workflows.

---
## 🔄 Patterns and examples

- **Auth redirect**
  ```ts
  // server component
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login');
  ```

- **Upserting profile**
  ```ts
  const { error } = await supabase.from('profiles').upsert({
    user_id: user.id,
    nickname: nickname.trim(),
    age_band: ageBand,
    region: region.trim(),
    hobbies,
  });
  ```

- **Client form state** – use `useState` hooks inside `'use client'` components and `event.preventDefault()` on submit handlers.

- **Route handler example** (`src/app/auth/callback/route.ts`):
  ```ts
  export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    if (!code) return NextResponse.redirect(`${origin}/login`);
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(`${origin}/login`);
    return NextResponse.redirect(`${origin}/`);
  }
  ```

- **Routing**
  - Use `redirect()` inside server components to perform immediate server redirect.
  - Use `useRouter().replace()` in client components for navigation after actions.

---
## 🌐 External integrations

- **Supabase** – core backend service for auth and database.  There's no other external API.
- **Tailwind CSS** – used only via a small global stylesheet; typical utility classes are applied directly in JSX.

---
## 📌 Notes for AI agents

- Don’t invent new architecture; keep additions within `src/app` and follow the server/client boundary rules.
- When you need to fetch data on the server, always use the `createClient` helper from `src/lib/supabase/server.ts`.
- If you add new environment variables, document them here and ensure they are accessed via `process.env`.
- The codebase contains no tests; you may add them, but the repository has no framework for them currently.
- Avoid using relative imports that climb directories; always prefer `@/…` to make path resolution predictable.

---

> **Feedback?**
> If anything here is unclear or missing, please point it out and we’ll iterate.
