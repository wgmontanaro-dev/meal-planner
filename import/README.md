# Recipe import

One-off bulk import of recipes (e.g. from an Apple Notes dump).

1. `recipes.json` here holds an array of recipe objects — see the shape and
   field rules in the header of `scripts/import-recipes.mjs`.
2. Review it. The category fields (`prepTimeCategory`, `cuisine`,
   `storageType`, `dietType`, `childFriendly`, `preparationType`) are
   **required** with fixed enum values; thin source notes get inferred or
   neutral defaults, tagged with `_confidence`. Fix anything wrong here —
   it is much faster than editing recipes in the app afterwards.
3. Dry run (validates, reports new vs. already-present, writes nothing):

   ```bash
   node scripts/import-recipes.mjs import/recipes.json
   ```

4. Apply:

   ```bash
   node scripts/import-recipes.mjs import/recipes.json --apply
   ```

Titles already in the database are skipped (case-insensitive), so the
script is safe to re-run after corrections. Inserts go through the
`create_recipe_with_ingredients` transaction, one recipe per call.

## Ingredient backfill (separate, later pass)

`ingredient-scrape-report.json` here is the output of
`scripts/populate-ingredients-from-source.mjs`, a one-off that scraped
ingredient lists for recipes already in the library that had a `source_url`
but no ingredient rows. It uses the same schema.org extraction as the app's
"add recipe from URL" feature (`lib/recipes/import.ts`). Unrelated to the
bulk import above; see that script's header for usage.

This directory is throwaway — delete it once the import is done.
