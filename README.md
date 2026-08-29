# Meal Planner

A small shared household web application for planning meals, maintaining a
recipe library, and generating shopping lists. Built for one couple, with a
single shared password rather than individual accounts. See `SPEC.md` for
the full product and implementation specification.

**Status: MVP complete.** All six build stages in `SPEC.md` section 32
(Foundation, Recipe core, Calendar core, Retention, Shopping list, Images
and hardening) are implemented, plus a round of post-spec enhancements
(see "Working on this codebase" below). `npx tsc --noEmit`, `npm run lint`,
`npm run build` and `npm test` all pass.

Spec scope, in brief:

- **Recipe library** — CRUD, seven controlled-category filters, ingredient
  editor, source links, deletion blocked while a recipe is planned.
- **Calendar** — mobile agenda / desktop grid, Meal 1 & Meal 2 per day,
  recipe or manual entries, month navigation.
- **Retention** — boundary = first day of the current Europe/London month
  minus three calendar months; idempotent cleanup of expired entries on
  every meal-plan mutation and on the recipe-deletion path; edits to
  expired dates rejected; backward navigation floored at the boundary.
- **Shopping list** — a "Generate shopping list" dialogue on the Calendar
  page feeds an occurrence-grouped, print-friendly `/shopping-list` page
  with copy-to-clipboard.
- **Images** — server-validated (JPEG/PNG/WebP, ≤5 MB) upload / replace /
  remove against a private Supabase Storage bucket; short-lived signed URLs
  for a thumbnail and an enlarged preview; storage-object cleanup on image
  removal and recipe deletion.

## Working on this codebase

`SPEC.md` is the authority on _what_ each feature should do — read the
relevant section before changing feature behaviour. Everything in it is
built. The following was added **after** the spec was met; keep it in mind
so a change doesn't undo it:

- **Visual design.** The UI was reskinned to a Material-3 design produced in
  [Stitch](https://stitch.withgoogle.com); the raw exports are kept in
  `stitch/` for reference. The palette and fonts (Work Sans body / Literata
  headings, via `next/font`) live as CSS variables in `app/globals.css`;
  `--terracotta` and `--primary-container` are extra tokens beyond the
  shadcn set. `components/ui/button.tsx` defaults to a pill radius and adds
  a `terracotta` variant. New UI should match this system — warm surface,
  sage-green primary, terracotta accent, pill buttons, `rounded-xl` cards —
  not the stock neutral shadcn look.
- **Recipe quick-view.** "View recipe" in the calendar's meal-slot dialog
  opens the recipe **inline** (dialog mode `"view-recipe"` →
  `RecipeQuickView` → `RecipeDetailView`), not a navigation. Data comes
  from `getRecipeForModal` in `lib/recipes/actions.ts`. `RecipeDetailView`
  is the single read-only recipe renderer, shared with `/recipes/[id]` —
  change recipe presentation there, once.
- **Stock illustrations.** Recipes with no uploaded image show one of 15
  bundled SVGs (`public/stock/`), chosen by `lib/recipes/stock-image.ts`
  from title keywords → cuisine → a hash of the recipe id.
- **Recipe library views.** `/recipes` has a **list** (default) / **card**
  toggle (`RecipeViewToggle`, state in `?view=`). `RecipeResults` (client)
  adds an instant title search over the loaded rows; `RecipeTable` (client)
  adds per-column sort and filter, also client-side. The URL-param
  `RecipeFilters` still drives the server query and is shared with card
  view — the layers compose with AND.
- **Bulk import.** `scripts/import-recipes.mjs` + `import/` load a reviewed
  JSON array of recipes via the `create_recipe_with_ingredients` RPC. The
  live database was seeded this way from the owner's ~80 Apple Notes
  recipes; **its category fields (`cuisine`, `prepTimeCategory`, …) are
  best-guesses, not authoritative.** `import/` is throwaway.
- **Only the title is required.** Since MVP, a recipe needs a title and
  nothing else — the seven controlled categories and the ingredient list may
  all be empty. Migration `20260828120000_optional_recipe_categories.sql`
  drops the `NOT NULL`s and widens the `CHECK`s to permit `NULL` (meaning
  "not specified"); `recipeInputSchema` maps a blank category to `null` and
  no longer requires an ingredient. Read code uses `categoryLabel()`
  (`lib/constants/categories.ts`), which renders "—" for an unset value, and
  the compact card/calendar chips hide themselves when empty. This
  supersedes SPEC.md §11.4 and §11.6.
- **Weeknight favourite.** A seventh controlled category (SPEC.md §10.7),
  added after the others — a nullable ternary (`YES` / `NO` /
  `NOT_SPECIFIED`) in a new `weeknight_favourite` column. Migrations
  `20260829120000_add_weeknight_favourite.sql` (column + `CHECK`) and
  `20260829120100_recipe_write_functions_weeknight_favourite.sql` (both
  recipe-write RPCs gain the column). It flows through the same paths as
  `childFriendly` everywhere, and its filter is added once in
  `components/recipes/filter-fields.tsx`, so it appears in both the library
  and the meal-slot recipe picker. Selecting "Yes" is the fast path to
  "what can we cook tonight".
- **Post-spec refinements.** Success toasts on calendar meal actions and
  recipe-edit saves (`Toaster` mounted in `app/(app)/layout.tsx`, `toast`
  from `components/ui/toast.tsx`); the mobile calendar agenda scrolls to
  today's row on load for the current month; the meal-slot dialog keeps a
  back stack so Replace / Edit can be abandoned without closing it; the
  recipe form prompts (`window.confirm`) before discarding unsaved edits on
  Cancel / Escape / backdrop / close. SPEC.md §§13.6, 15.5, 18.1, 23 carry
  the amendment notes.
- **Add a recipe from a URL.** The Add Recipe dialog opens on a chooser —
  paste a recipe web address, or enter the details by hand.
  `lib/recipes/import.ts` (a pure, unit-tested module) fetches the page and
  reads a recipe out of schema.org JSON-LD, then microdata, then OpenGraph:
  ingredients and method first, then title / summary / image, then *derived*
  prep time (ISO-8601 `totalTime`), cuisine (`recipeCuisine` + a synonym
  table) and diet type (`suitableForDiet`, else a meat/fish keyword scan of
  the ingredients — a soft guess is flagged as a warning).
  `importRecipeFromUrlAction` in `lib/recipes/actions.ts` runs it and
  returns pre-filled form values plus warnings; it never writes — the user
  reviews and submits the normal create form. `createRecipe` then attaches
  any discovered image via `uploadRecipeImageFromUrl` (`lib/images/actions.ts`,
  best-effort; a file the user picks wins). Pages with no readable recipe
  (video, forum, JS-only) fail cleanly to "add it manually". Retries and a
  Wayback Machine fallback cover flaky or blocking hosts.
- **Ingredient backfill scripts.** `scripts/populate-ingredients-from-source.mjs`
  and `scripts/populate-ingredients-manual.mjs` were a one-off pass to fill
  ingredients for library recipes that had a `source_url` but no ingredient
  rows, using the same extraction the URL-import feature now uses.
  `scripts/list-recipes-with-source.mjs` reports coverage;
  `import/ingredient-scrape-report.json` is the run output. Kept for
  re-runs; not part of the app.

**Verify a change with** `npm test && npx tsc --noEmit && npm run lint &&
npm run build`, then a manual browser pass (`npm run dev`). Note: automated
agents in some harnesses cannot screenshot `@base-ui/react` dialogs — the
calendar meal-slot flow and recipe form/preview dialogs need checking in a
real browser.

**Not covered by automated tests** (verify by hand): the Storage
round-trip against a real bucket, `window.print()` output, and responsive /
end-to-end behaviour (SPEC.md section 30.7 is a manual checklist).

## Conventions

Established across the build — keep following these:

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
- Colours, radii and fonts are CSS variables in `app/globals.css` consumed
  through Tailwind tokens — never hard-code a hex. Use `terracotta` /
  `primary`/`secondary` button variants rather than ad-hoc classes.
- State that should be shareable or survive a refresh goes in the URL
  (`?view=`, the recipe filter params); ephemeral interactive state (search
  text, a table's column sort) is plain client `useState`.
- Read-only recipe rendering is centralised in
  `components/recipes/recipe-detail-view.tsx` (detail page + calendar
  quick-view). Multi-step dialog bodies switch on a `mode` string rather
  than nesting dialogs — see `components/calendar/meal-slot-dialog.tsx`.

## Tech stack

- [Next.js](https://nextjs.org) (App Router), TypeScript in strict mode
- Tailwind CSS v4 and [shadcn/ui](https://ui.shadcn.com)
- [Supabase](https://supabase.com) Postgres for persistence and Supabase
  Storage (private bucket) for recipe images
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
| `SUPABASE_STORAGE_BUCKET` | Name of the private Storage bucket that holds recipe images (default `recipe-images`). Create it as described in "Set up storage" below. |

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
transactional functions used by the recipe form. Later migrations make
every recipe **category** column nullable (only the title is required —
see "Working on this codebase") and add the `weeknight_favourite` category
column (updating both write functions to match). They do not insert any
demonstration data — a fresh deployment starts with an empty recipe
library, as required by the specification.

## 4. Set up storage

Recipe images live in a **private** Supabase Storage bucket. Create it once
per project:

1. Supabase dashboard → **Storage** → **New bucket**.
2. Name it exactly `SUPABASE_STORAGE_BUCKET` (default `recipe-images`).
3. Leave **Public bucket** **off** — the app serves images through
   short-lived signed URLs generated server-side with the service-role key.
4. Optional but recommended: set the bucket file-size limit to **5 MB** and
   allowed MIME types to `image/jpeg, image/png, image/webp` to mirror the
   server-side checks in `lib/validation/image.ts`.
5. Optional: enable **Storage → Image Transformations** for the project. The
   app requests resized renditions for thumbnails and the enlarged preview;
   if transformations are unavailable it falls back to serving the original
   object, which still works but downloads more data.

No Storage RLS policies are required: all access goes through the
service-role client on the server, never directly from the browser.

Local development with `supabase start` picks the bucket up automatically
from `supabase/config.toml`.

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
npm test           # Vitest (run once); npm run test:watch to watch
```

The Vitest suite was introduced in Stage 4 for the retention rules, whose
boundary and year-transition cases (SPEC.md section 30.5) need a
controllable clock — `getTodayIsoDateLondon()` and its callers take an
optional `now: Date`. Current coverage:

- `lib/dates/calendar.test.ts` — retention boundary arithmetic,
  London-vs-UTC month resolution, the expiry predicate.
- `lib/meal-plans/retention.test.ts` — `cleanupExpiredMealPlans` issues a
  single boundary-scoped delete, never touches recipes, is idempotent, and
  swallows errors.
- `lib/shopping-list/build.test.ts` — occurrence grouping, manual-meal
  exclusion, date/slot and ingredient ordering, quantity formatting, the
  plain-text output, and the range schema (SPEC.md section 30.6).
- `lib/shopping-list/actions.test.ts` — `generateShoppingList` queries the
  range with inclusive bounds and `entry_type = recipe`, and rejects an
  out-of-retention or inverted range without touching the database.
- `lib/validation/image.test.ts` — MIME/size validation and
  `buildImageStoragePath` (per-recipe prefix, random UUID name, mime-derived
  extension; never the client filename).
- `lib/images/actions.test.ts` — `uploadRecipeImage` rejects unsupported
  files before any I/O, stores the object then the reference (and rolls the
  object back if the reference write fails); `removeRecipeImage` clears all
  three columns then deletes the object; `replaceRecipeImage` deletes the
  previous object only after the new one is stored and referenced.
- `lib/recipes/stock-image.test.ts` — the fallback-illustration picker:
  title keyword beats cuisine fallback, cuisine used when the title has no
  signal, a signal-less recipe still gets a stable, evenly-spread pick, and
  a recipe with no cuisine or diet set is handled.
- `lib/recipes/import.test.ts` — the source-URL importer: ISO-8601 duration
  → prep-time bucket, cuisine mapping and synonyms, diet-type derivation
  (explicit `suitableForDiet`, meat/fish scan, soft vegetarian guess), the
  ingredient-line splitter, and end-to-end extraction from fixture HTML
  (JSON-LD and microdata).

Everything else — including the storage round-trip against a real bucket,
`window.print()` output, and the client-side table sort/filter and library
view toggle — is verified manually against a live Supabase project and the
running app in a browser.

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
.claude/
  launch.json       Dev-server launch config (used by preview tooling)
app/
  globals.css       Design tokens (colours, radii) + print styles
  layout.tsx        Root layout; loads Work Sans + Literata via next/font
  login/            Public password screen
  (app)/            Route group: sidebar (desktop) / bottom-nav (mobile) layout
    calendar/        Meal calendar: month view, agenda/grid, slot dialogs
    recipes/         Library (list default / card views), detail, add/edit
    shopping-list/   Occurrence-grouped, print-friendly shopping list
components/
  auth/             Login form
  calendar/         Calendar view, month nav, meal-slot dialog (incl. recipe
                    quick-view), shopping-list date dialog
  recipes/          Card grid + sortable/filterable table + view toggle +
                    search wrapper, form dialog, filters, detail view,
                    image thumbnail/preview
  shopping-list/    Copy-to-clipboard / print controls
  shared/           Primary nav, nav links, dialog classes
  ui/               shadcn/ui primitives (base-nova on @base-ui/react)
lib/
  auth/             Session creation/validation, login/logout server actions
  constants/        Environment variable access, controlled category values
  database/         Supabase client and row/domain types
  dates/            Europe/London calendar-month + retention-boundary helpers
  images/           Recipe-image upload/replace/remove actions + signed-URL helper
  meal-plans/       Meal-plan server actions and form/picker types
  recipes/          Recipe server actions, form/filter types, stock-image
                    picker, source-URL recipe importer (import.ts)
  shopping-list/    Shopping-list server action + pure assembly/formatting
  validation/       Zod schemas (recipe, meal plan, shopping list, image)
public/
  stock/            15 bundled recipe illustrations (fallback when no upload)
scripts/
  import-recipes.mjs               Bulk recipe importer (JSON array -> RPC)
  populate-ingredients-from-source.mjs  One-off: scrape ingredients for
                                   recipes that have a source_url but none
  populate-ingredients-manual.mjs  One-off: same, from hand-transcribed lists
  list-recipes-with-source.mjs     Report source-URL / ingredient coverage
import/             Throwaway: reviewed recipe JSON, import notes (see its
                    README), and the ingredient-scrape report
stitch/             Reference: the Stitch design exports the UI was built from
supabase/
  migrations/       SQL migrations, applied in filename order
proxy.ts             Next.js 16 "proxy" (formerly middleware): redirects
                     unauthenticated requests away from protected routes
vitest.config.mts    Node-environment test config; suite lives in lib/**/*.test.ts
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
- Retention housekeeping (SPEC.md section 19.4) runs on every meal-plan
  mutation (`setRecipeMeal` / `setManualMeal` / `removeMeal`). Because the
  `meal_plan_entries.recipe_id` foreign key is `on delete restrict`, the
  same `cleanupExpiredMealPlans()` also runs at the start of `getRecipeUsage`
  and `deleteRecipe` so an expired entry can never block a recipe deletion
  (SPEC.md section 19.3). No scheduled task or long-running worker is used.
- The retention boundary is compared as `"YYYY-MM-DD"` string ordering
  (`isExpiredDate`), which is exact for zero-padded ISO dates and avoids
  reintroducing `Date` timezone drift.
- The shopping list is its own route (`/shopping-list?start=…&end=…`) rather
  than an in-dialogue result, so `window.print()` and an `@media print`
  block in `app/globals.css` (hiding `nav[aria-label="Primary"]` and any
  `[data-print-hidden]` control) give the print-friendly layout SPEC.md
  section 20.8 requires without portal-stacking gymnastics. The Calendar
  dialogue only collects and validates the date range, then navigates.
- Shopping-list assembly (`lib/shopping-list/build.ts`) is a pure function
  over already-fetched rows — grouping by occurrence, filtering out manual
  meals, and sorting by date/slot then stored ingredient order — so the
  SPEC.md section 30.6 cases are unit-tested without a database.
- Recipe images: JPEG/PNG/WebP only, 5 MB maximum — both enforced
  server-side by MIME type and byte size (`lib/validation/image.ts`).
  Objects are stored at `recipeId/<uuid>.<ext>`; the client-supplied
  filename is kept only as display metadata, never as a path. The image is
  validated **before** the recipe create/update transaction, and uploaded
  **after** it commits, so a bad file blocks the whole save and a failed
  optional upload never rolls back a saved recipe (SPEC.md sections 11.7,
  13.5). Replace uploads-then-repoints-then-deletes-old; a failure before
  the repoint leaves the old image intact (SPEC.md section 21.2).
- Images are served only through 1-hour signed URLs minted server-side with
  the service-role key; the bucket is private and has no RLS policies
  because the browser never touches Storage directly. Client-side image
  resizing is not done — "resize where practical" (SPEC.md 11.7) is left to
  the optional Supabase image-transformation renditions, with the size cap
  as the hard guarantee.
- Recipes without an uploaded image show a bundled illustration instead of a
  bare placeholder. `lib/recipes/stock-image.ts` picks one of 15 SVGs in
  `public/stock/` deterministically from the recipe's title keywords, then
  cuisine, then a hash of its id (so a signal-less library still varies).
  Swapping the SVGs for photos of the same names needs no code change.
- The recipe library defaults to a list/table view (`?view=card` for the
  grid). Server-side filtering (`RecipeFilters`, URL params) narrows the
  query; the title search (`RecipeResults`) and the table's per-column
  sort + filter (`RecipeTable`) then operate client-side over the loaded
  rows. Column filter options are the distinct values present in the
  already-filtered data, not the full enum.

## Security notes

- **One shared secret.** There are no user accounts; `APP_SHARED_PASSWORD`
  gates everything. The session is a signed (HS256, `jose`) cookie holding
  no personal data; `SESSION_SECRET` must differ per environment.
- **Server-only privilege.** `SUPABASE_SERVICE_ROLE_KEY` is read exclusively
  in server code (`lib/database/client.ts` is `import "server-only"`).
  Authorisation is enforced in the application layer: every server action
  and data read calls `requireSession()` first, and `proxy.ts` redirects
  unauthenticated navigations to `/calendar`, `/recipes`, `/shopping-list`.
- **Storage.** Private bucket, server-side MIME + size validation,
  unguessable object names, signed-URL reads only, best-effort object
  cleanup on image removal and recipe deletion (failures logged, never
  surfaced — SPEC.md 21.4).
- **Input.** All writes go through Zod schemas (`lib/validation/`); recipe
  and ingredient writes use Postgres transactional functions; meal-plan
  slots upsert against a unique `(meal_date, slot)` constraint.
