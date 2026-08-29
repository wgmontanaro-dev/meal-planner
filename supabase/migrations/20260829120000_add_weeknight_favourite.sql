-- Add the "weeknight favourite" recipe category (SPEC.md section 10.7).
--
-- A post-MVP ternary category with the same shape as child_friendly: a
-- quick, reliable go-to for a busy evening, used mainly so the recipe
-- library and the meal-slot picker can filter to weeknight favourites.
--
-- Optional like every other controlled category since the post-MVP change
-- (20260828120000): NULL means "not specified" and renders as "—". No
-- default is written, and no index is added — filtering is a small
-- equality check at household scale, matching the other ternary columns.

alter table recipes add column weeknight_favourite text;

alter table recipes add constraint recipes_weeknight_favourite_valid check (
  weeknight_favourite is null or weeknight_favourite in ('YES', 'NO', 'NOT_SPECIFIED')
);
