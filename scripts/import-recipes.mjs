// One-off importer for recipes parsed from an Apple Notes dump.
//
//   node scripts/import-recipes.mjs import/recipes.json           # validate + report, no writes
//   node scripts/import-recipes.mjs import/recipes.json --apply   # insert new recipes
//
// Each record in the JSON array:
//   {
//     "title": "string (required, <=150, not blank)",
//     "sourceUrl": "https://... | null",
//     "summaryDescription": "string <=500 | null",
//     "instructions": "string <=10000 | null",
//     "prepTimeCategory": "UNDER_15 | FROM_15_TO_30 | FROM_30_TO_60 | FROM_60_TO_90 | OVER_90",
//     "cuisine": "<one of CUISINES>",
//     "storageType": "STORE_CUPBOARD | FRESH | MIXED",
//     "dietType": "VEGETARIAN | MEAT_OR_FISH | FLEXIBLE",
//     "childFriendly": "YES | NO | NOT_SPECIFIED",
//     "preparationType": "PRE_PREPARED | REQUIRES_PREPARATION | NOT_SPECIFIED",
//     "ingredients": [{ "name": "string (required)", "quantity": "string | null" }],
//     "_source": "free note about where this came from (ignored)",
//     "_confidence": "low | medium | high (ignored)"
//   }
//
// Titles that already exist in the database (case-insensitive, trimmed) are
// skipped, so the script is safe to re-run after fixing rows.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "/Users/Will/meal-planner/node_modules/@supabase/supabase-js/dist/index.mjs";

const ENUMS = {
  prepTimeCategory: ["UNDER_15", "FROM_15_TO_30", "FROM_30_TO_60", "FROM_60_TO_90", "OVER_90"],
  cuisine: [
    "AFRICAN", "AMERICAN", "BRITISH", "CARIBBEAN", "CHINESE", "EASTERN_EUROPEAN", "FRENCH",
    "GREEK", "INDIAN", "ITALIAN", "JAPANESE", "KOREAN", "LATIN_AMERICAN", "MEDITERRANEAN",
    "MEXICAN", "MIDDLE_EASTERN", "NORTH_AFRICAN", "SCANDINAVIAN", "SOUTH_EAST_ASIAN", "SPANISH",
    "THAI", "VIETNAMESE", "OTHER",
  ],
  storageType: ["STORE_CUPBOARD", "FRESH", "MIXED"],
  dietType: ["VEGETARIAN", "MEAT_OR_FISH", "FLEXIBLE"],
  childFriendly: ["YES", "NO", "NOT_SPECIFIED"],
  preparationType: ["PRE_PREPARED", "REQUIRES_PREPARATION", "NOT_SPECIFIED"],
};

const LIMITS = { title: 150, summaryDescription: 500, sourceUrl: 2000, instructions: 10000 };

function loadEnv() {
  const raw = readFileSync("/Users/Will/meal-planner/.env.local", "utf8");
  return Object.fromEntries(
    raw
      .split(/\r?\n/)
      .filter((l) => l && !l.startsWith("#") && l.includes("="))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      })
  );
}

function validate(record, index) {
  const errors = [];
  const title = typeof record.title === "string" ? record.title.trim() : "";
  if (!title) errors.push("title is required and must not be blank");

  for (const [field, limit] of Object.entries(LIMITS)) {
    const value = record[field];
    if (value != null && String(value).length > limit) {
      errors.push(`${field} exceeds ${limit} characters`);
    }
  }

  for (const [field, allowed] of Object.entries(ENUMS)) {
    if (!allowed.includes(record[field])) {
      errors.push(`${field} must be one of ${allowed.join(", ")} (got ${JSON.stringify(record[field])})`);
    }
  }

  const ingredients = record.ingredients ?? [];
  if (!Array.isArray(ingredients)) {
    errors.push("ingredients must be an array");
  } else {
    ingredients.forEach((ing, i) => {
      if (!ing || typeof ing.name !== "string" || !ing.name.trim()) {
        errors.push(`ingredients[${i}].name is required`);
      }
    });
  }

  return { errors, label: title || `#${index}` };
}

function toRpcPayload(record) {
  const str = (v) => {
    const s = v == null ? null : String(v).trim();
    return s ? s : null;
  };
  return {
    recipe: {
      title: record.title.trim(),
      summaryDescription: str(record.summaryDescription),
      sourceUrl: str(record.sourceUrl),
      instructions: str(record.instructions),
      prepTimeCategory: record.prepTimeCategory,
      cuisine: record.cuisine,
      storageType: record.storageType,
      dietType: record.dietType,
      childFriendly: record.childFriendly,
      preparationType: record.preparationType,
    },
    ingredients: (record.ingredients ?? [])
      .filter((ing) => ing && ing.name && ing.name.trim())
      .map((ing) => ({
        name: ing.name.trim(),
        quantity: ing.quantity && String(ing.quantity).trim() ? String(ing.quantity).trim() : null,
      })),
  };
}

async function main() {
  const [, , fileArg, ...flags] = process.argv;
  if (!fileArg) {
    console.error("usage: node scripts/import-recipes.mjs <recipes.json> [--apply]");
    process.exit(1);
  }
  const apply = flags.includes("--apply");
  const path = resolve(process.cwd(), fileArg);
  const records = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(records)) {
    console.error("Expected the JSON file to contain an array of recipe objects.");
    process.exit(1);
  }

  // Validation pass.
  const invalid = [];
  records.forEach((record, index) => {
    const { errors, label } = validate(record, index);
    if (errors.length) invalid.push({ label, errors });
  });

  if (invalid.length) {
    console.error(`\n${invalid.length} record(s) failed validation:\n`);
    for (const { label, errors } of invalid) {
      console.error(`  • ${label}`);
      for (const e of errors) console.error(`      - ${e}`);
    }
    console.error("\nFix these in the JSON and re-run. Nothing was written.");
    process.exit(1);
  }
  console.log(`✓ ${records.length} record(s) valid.`);

  const env = loadEnv();
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: existingRows, error: existingError } = await supabase.from("recipes").select("title");
  if (existingError) {
    console.error("Could not read existing recipes:", existingError.message);
    process.exit(1);
  }
  const existing = new Set(existingRows.map((r) => r.title.trim().toLowerCase()));

  const toInsert = records.filter((r) => !existing.has(r.title.trim().toLowerCase()));
  const skipped = records.length - toInsert.length;

  console.log(`  ${toInsert.length} new, ${skipped} already in the database (skipped).`);

  if (!apply) {
    console.log("\nDry run. Re-run with --apply to insert the new recipes.");
    return;
  }

  let inserted = 0;
  for (const record of toInsert) {
    const payload = toRpcPayload(record);
    const { error } = await supabase.rpc("create_recipe_with_ingredients", payload);
    if (error) {
      console.error(`  ✗ ${record.title}: ${error.message}`);
    } else {
      inserted += 1;
      console.log(`  ✓ ${record.title}`);
    }
  }
  console.log(`\nInserted ${inserted}/${toInsert.length} new recipe(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
