# SilverLink AI Coding Instructions

## Project Overview
**SilverLink** is a mobile web app (PWA) connecting Korean seniors (60-75) through hobby-based local groups. The MVP validates a "join group → chat → daily mood check" retention loop. See `prd.md` (product) and `trd.md` (technical) before coding.

## Tech Stack (Locked)
- **Frontend**: Next.js (App Router) + TypeScript + Tailwind CSS
- **Backend/DB**: Supabase (Auth, PostgreSQL, Realtime, Storage)
- **Package Manager**: pnpm
- **Deploy**: Vercel
- **Node**: 20 LTS (`.nvmrc`)

**Run**: `pnpm dev` | Environment: `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

## Architecture Principles
1. **MVP-in-One-Repo**: Keep everything in Next.js unless impossible.
2. **Minimal Route Handlers**: Use API Routes only for sensitive logic:
   - Group capacity validation before join
   - Block-list filtering in message queries
   - Phone/account pattern detection (warnings, not blocking)
3. **Supabase RLS First**: All table policies enforced at database layer, not app logic.

## Critical Data Model & RLS Rules
Core tables: `profiles`, `groups`, `group_members`, `group_messages`, `mood_logs`, `blocks`, `reports`, `events`

**Access Patterns** (see trd.md section 4 for full detail):
- **profiles**: User reads own + authenticated users read public fields only
- **group_messages**: Only group members can read/write
- **mood_logs**: User-specific, enforced `unique(user_id, log_date)` for daily check
- **groups**: Public read, owner/admin create
- **blocks/reports**: User-enforced (owners only)

**Index Requirements**: `groups(region, category)`, `group_members(user_id)`, `group_messages(group_id, created_at desc)`, `mood_logs(user_id, log_date desc)`, `reports(status, created_at desc)`, `events(event_type, event_time desc)`

## Senior-First UX Rules (Non-Negotiable)
- **Touch Targets**: Minimum 60px (height & width) for all buttons, tabs, clickable areas. Use Tailwind `h-16` / `min-h-[60px]`.
- **Typography**: Base 18px+ font. High-contrast black-on-white text.
- **Layout**: "One Screen, One Action" — no hamburger menus. Fixed bottom tab bar for main navigation.
- **Language**: Warm, polite Korean. "안녕하세요", "쌍화차 보내기". **Never** use IT English ("세팅" not "세팅", "내 정보" not "프로필").

## Key Workflows & Data Access
| Screen | Core Query | Special Notes |
|--------|-----------|---------------|
| `/login` | Supabase magic link auth | Passwordless via email |
| `/onboarding` | `profiles` upsert | Nickname, age band, region, hobbies[] |
| `/` (home) | `mood_logs` TODAY, recommended `groups` | Region/hobby-based rules |
| `/groups` | Filtered `groups` list | Region, category filters with indexes |
| `/groups/[id]` | `groups` detail + join validation | Check capacity in Route Handler before insert |
| `/groups/[id]/chat` | `group_messages` with Realtime subscribe | RLS enforces member-only access |
| `/me` | `profiles` + `group_members` + `blocks` | User's own data only |
| `/admin/reports` | `reports` list (admin only) | Status filtering, moderation workflow |

## Code Patterns & Conventions
- **API Routes**: Place validation/sensitive logic in `app/api/` — e.g., capacity check on join.
- **Client Queries**: Use `supabase.from('table').select()` for reads; RLS enforces permissions.
- **Realtime**: Subscribe in `useEffect` for `group_messages` in chat components. Filter by `group_id`.
- **State**: Zustand for global state if needed (user session, UI toggles); Supabase Auth handles auth state.
- **No Monoliths**: Separate UI components, API calls, and business logic into distinct files.

## MVP Scope Guardrails
**In-Scope (Build)**:
- Auth (magic link), Profiles, Group CRUD (user join), Chat (Realtime), Mood check (1–5, once/day), Reporting/Blocking (basic).

**Out-of-Scope (Say "No")**:
- 1:1 dating/swipe, Voice/photo messages, Auto step-counting, AI recommendations (use rule-based), Coin transactions (not in MVP).

## Common Pitfalls to Avoid
1. **Forget RLS**: Never assume app-level checks replace database policies.
2. **Ignore Indexes**: Queries on `group_messages(group_id, created_at)` or `mood_logs(user_id)` MUST have indexes.
3. **Block-List Gaps**: When showing messages, filter by `blocks` table in both directions.
4. **Capacity Check**: Join requests must validate group `max_members` before insert (do this in Route Handler).
5. **One Mood Per Day**: Enforce uniqueness via RLS OR check in Route Handler before upsert.

## Questions?
Refer to `prd.md` (why), `trd.md` (how), and `.cursorrules` (UX) before asking. If in doubt, **optimize for senior UX over clever features**.
