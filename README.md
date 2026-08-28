# Meal Planner

A small shared household web application for planning meals, maintaining a
recipe library, and generating shopping lists. Built for one couple, with a
single shared password rather than individual accounts. See `SPEC.md` for
the full product and implementation specification.

**Build status:** Stages 1–3 complete (Foundation, Recipe core, Calendar
core). The recipe library and the meal calendar — including month
navigation, the mobile agenda and desktop grid, recipe/manual meal
assignment, and slot replace/remove — are implemented. `npx tsc --noEmit`,
`npm run lint` and `npm run build` all pass. Manual browser verification of
Stage 3 (assign/replace/remove a meal, month navigation, and in particular
that deleting a recipe assigned to a meal is blocked with the exact
SPEC.md section 14.3 message) was left for the user to run themselves and
had not been confirmed as of this note. Retention rules (Stage 4) and the
shopping list (Stage 5) are not yet implemented; all months, past and
future, are currently navigable without restriction.

## Next: starting Stage 4 (Retention)

Read this section before starting Stage 4, then delete it once Stage 4 is
under way — it is a one-time transition note, not ongoing documentation
(the rest of this README should stay current instead).

**Scope** (SPEC.md section 32, detailed in sections 19, 24.4 and 30.5):

- Implement the retention-boundary calculation: first day of the current
  calendar month minus three calendar months, using the Europe/London
  calendar date. `getCurrentMonthInLondon()` and `shiftMonth()` in
  `lib/dates/calendar.ts` already exist and should be reused/composed for
  this rather than duplicating month arithmetic.
- Implement idempotent cleanup that deletes meal-plan entries earlier than
  the boundary (SPEC.md section 19.3–19.4). Recipes, ingredients and
  recipe images must never be touched by this process. `cleanupExpiredMealPlans()`
  is listed in SPEC.md section 24.4 but does not exist yet — this is the
  stage to add it, in `lib/meal-plans/actions.ts` alongside the other
  meal-plan operations.
- Decide and implement a housekeeping trigger point (SPEC.md section
  19.4 gives three acceptable options: during authenticated calendar
  access, during meal-plan mutations, or a deployment-supported scheduled
  task — avoid a standalone long-running worker). This wasn't decided
  during Stage 3 planning; use plan mode to pick one with the user before
  implementing.
- Prevent modifications to expired dates and disable/explain backward
  navigation past the boundary (SPEC.md section 19.5). Note:
  `components/calendar/month-navigation.tsx` currently allows unlimited
  backward navigation (`YEAR_RANGE = 10` with no floor) — this will need a
  lower bound wired to the retention boundary.
- Verify future plans are unaffected or expiring only as their dates pass
  the boundary (SPEC.md section 19.6).
- Add boundary and year-transition automated tests (SPEC.md section 30.5),
  using a controllable clock. **No test runner is installed yet** — set up
  Vitest as part of this stage, since these are the first tests in the
  project. `lib/dates/calendar.ts`'s `getTodayIsoDateLondon()` currently
  calls `new Date()` directly with no injection point; it will need a way
  to accept or be overridden with a fixed "now" for tests to control the
  clock (SPEC.md section 30.5 explicitly requires this, including
  year-boundary cases such as the current month being January).

**Established conventions (Stages 1–3) — keep following these:**

- Server actions: `"use server"` at the top of `lib/<domain>/actions.ts`,
  exporting only async functions; state/filter types and `initial*State`
  constants live in a sibling `lib/<domain>/types.ts` (a `"use server"`
  file may not export consts). See `lib/meal-plans/actions.ts` /
  `lib/meal-plans/types.ts`.
- Every read and mutation calls `requireSession()` from
  `lib/auth/require-session.ts` first.
- Zod schemas live in `lib/validation/`, with shared helpers
  (`trimmedText`, `optionalTrimmedText`) factored into
  `lib/validation/shared.ts`.
- Supabase client: `getSupabaseClient()` in `lib/database/client.ts`
  (service-role, RLS bypassed — authorization is enforced entirely at the
  application layer via `requireSession()`).
- UI is shadcn **`base-nova`** style on `@base-ui/react` — **not Radix**.
  Components use a `render` prop for composition, not `asChild`.
- Client components: named exports, `useActionState` destructured
  `[state, formAction, pending]`, `aria-invalid`/`aria-describedby`/
  `role="alert"` wiring on every field error, ternary `: null` never
  `&&`, ellipsis `…` in pending labels.
- Server/Client boundary: never pass event handlers to a plain DOM element
  from a Server Component — this throws at runtime, not at
  typecheck/build time. Interactive lists/grids (e.g.
  `components/calendar/calendar-view.tsx`) are Client Components for this
  reason.
- Complex forms and short action menus alike currently reuse one shared
  full-screen-on-mobile / centred-on-desktop dialogue class,
  `FORM_DIALOG_CONTENT_CLASS` in `components/shared/dialog-classes.ts`.

## Tech stack

- [Next.js](https://nextjs.org) (App Router), TypeScript in strict mode
- Tailwind CSS v4 and [shadcn/ui](https://ui.shadcn.com)
- [Supabase](https://supabase.com) Postgres for persistence, Supabase
  Storage for recipe images (added in a later stage)
- [Zod](https://zod.dev) for server-side validation
- [jose](https://github.com/panva/jose) for signed session cookies

## Prerequisites

- Node.js 20 or later and npm
- A Supabase project (free tier is sufficient)
- A GitHub account and a Vercel account, if you intend to deploy

## 1. Install dependencies

```bash
npm install
```

## 2. Configure environment variables

Copy the example file and fill in real values:

```bash
cp .env.local.example .env.local
```

| Variable | Description |
| --- | --- |
| `APP_SHARED_PASSWORD` | The single password both household members use to sign in. Change this value (and redeploy) to change the password — there is no in-app password screen. |
| `SESSION_SECRET` | Random secret used to sign the session cookie. Generate one with `openssl rand -base64 48`. Use a different value per environment. |
| `SUPABASE_URL` | Your Supabase project URL, from Project Settings → API. |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key, from Project Settings → API. This is a privileged secret: it is read only in server-side code and must never be exposed to the browser. |
| `SUPABASE_STORAGE_BUCKET` | Name of the Storage bucket used for recipe images. The bucket itself is created in a later build stage. |

`.env.local` is gitignored and must never be committed.

## 3. Set up the database

Database schema is defined as SQL migrations committed to
`supabase/migrations/`. Apply them to your Supabase project's Postgres
database using the Supabase CLI:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

Alternatively, you can run the SQL in `supabase/migrations/` directly via
the Supabase dashboard's SQL editor, in filename order.

> **Corporate proxy note:** if your network runs TLS-inspecting middleware
> (for example Netskope), the Supabase CLI's Go binary may not trust the
> re-signed certificate for `api.supabase.com`, causing `supabase link` /
> `supabase db push` to fail with a generic transport error even though
> `curl` and Node (which use the system keychain) work fine. If you hit
> this, use the SQL editor fallback above instead of the CLI.

The current migrations create the `recipes`, `ingredients`, and
`meal_plan_entries` tables along with their constraints and indexes, and
the `create_recipe_with_ingredients` / `update_recipe_with_ingredients`
transactional functions used by the recipe form. They do not insert any
demonstration data — a fresh deployment starts with an empty recipe
library, as required by the specification.

## 4. Set up storage

Recipe image upload is implemented in a later build stage. When it is
added, create a private Storage bucket in Supabase named to match
`SUPABASE_STORAGE_BUCKET` (default `recipe-images`) and this README will be
updated with the exact configuration required.

## 5. Run the app locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected
to `/login`. Sign in with the password configured in `APP_SHARED_PASSWORD`.

## Testing and checks

```bash
npm run lint       # ESLint
npx tsc --noEmit   # Type-check (strict mode)
npm run build      # Production build
```

No automated test suite exists yet. This was deferred by deliberate choice
through Stage 3 and will be set up (Vitest) at the start of Stage 4, where
the retention rules' controllable-clock test requirements make it
unavoidable. Until then, each stage is verified manually against a live
Supabase project and the running app in a browser.

## Deployment (Vercel)

1. Push this repository to GitHub.
2. In Vercel, import the repository as a new project.
3. Add the environment variables listed above (`APP_SHARED_PASSWORD`,
   `SESSION_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   `SUPABASE_STORAGE_BUCKET`) in the Vercel project's Environment Variables
   settings. Use a `SESSION_SECRET` distinct from your local one.
4. Deploy. Vercel builds and serves the Next.js app automatically; no
   custom build command is required.
5. Apply database migrations to the Supabase project used by that
   deployment (see step 3 above) before or after the first deploy — the
   app expects the schema to already exist.

Production and any other real deployment must never be seeded with
demonstration recipes or meal plans.

## Project structure

```
app/
  login/            Public password screen
  (app)/            Route group sharing the authenticated layout and nav
    calendar/        Meal calendar: month view, agenda/grid, slot dialogs
    recipes/         Recipe library, detail, add/edit
components/
  auth/             Login form
  calendar/         Calendar view, month navigation, meal-slot dialog
  recipes/          Recipe cards/table, form dialog, filters, category select
  shared/           Navigation and other cross-cutting UI
  ui/               shadcn/ui primitives
lib/
  auth/             Session creation/validation, login/logout server actions
  constants/        Environment variable access, controlled category values
  database/         Supabase client and row/domain types
  dates/            Europe/London calendar-month helpers
  meal-plans/       Meal-plan server actions and form/picker types
  recipes/          Recipe server actions, form/filter types
  validation/       Zod schemas (recipe, meal plan)
supabase/
  migrations/       SQL migrations, applied in filename order
proxy.ts             Next.js 16 "proxy" (formerly middleware): redirects
                     unauthenticated requests away from protected routes
```

## Assumptions made where the specification left an implementation detail
unspecified

- Session cookies are signed JWTs (HS256, via `jose`) with a 30-day
  expiry, containing no personal data — only a fixed subject and issuer,
  satisfying the requirement that the cookie not store the password and be
  cryptographically protected.
- The root path `/` redirects to `/calendar`; the proxy layer then redirects
  unauthenticated visitors on to `/login`.
- Calendar and Recipes share a single authenticated layout (route group
  `app/(app)`) that renders the primary navigation, rather than duplicating
  navigation per page.
- Next.js 16 renamed `middleware.ts` to `proxy.ts` with an equivalent API;
  this project uses `proxy.ts` accordingly.
- No date-handling library is installed; calendar-month arithmetic and
  formatting (`lib/dates/calendar.ts`) use native `Date`/`Intl` directly,
  since the app's date needs are limited to month grids and `Europe/London`
  "today" resolution.
- The empty-slot chooser and populated-slot action menu (specification
  sections 15.7 and 18) reuse the same full-screen-on-mobile /
  centred-on-desktop dialogue used for the recipe form, rather than a
  distinct bottom-sheet component, to avoid adding a new UI primitive for
  a single build stage.
- `setRecipeMeal` and `setManualMeal` upsert directly against the
  `(meal_date, slot)` unique constraint via a single Supabase call, rather
  than a Postgres RPC function, since a single-statement upsert is already
  atomic and needs no additional multi-statement transaction logic.
