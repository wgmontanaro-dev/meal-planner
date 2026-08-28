// Companion to populate-ingredients-from-source.mjs for recipes whose source
// page has no machine-readable ingredient data but a clear prose list that was
// transcribed by hand (client-rendered pages, Blogger prose, etc.).
//
//   node scripts/populate-ingredients-manual.mjs           # dry run
//   node scripts/populate-ingredients-manual.mjs --apply    # insert rows
//
// Only inserts for a recipe that currently has zero ingredient rows.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { splitIngredient } from "./populate-ingredients-from-source.mjs";

const APPLY = process.argv.includes("--apply");

function loadEnv() {
  const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
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

// Keyed by exact recipe title. Raw ingredient lines, as written on the source.
const MANUAL = {
  "Wahaca black bean quesadillas": {
    source: "https://www.wahaca.co.uk/3073-2/ (client-rendered; transcribed)",
    lines: [
      "30g butter",
      "3 tbsp oil",
      "2 medium onions, finely chopped",
      "3 fat cloves garlic, crushed or finely chopped",
      "1-2 tsp chipotle puree or a small dried chilli, crumbled (optional)",
      "small bunch thyme, shredded",
      "bunch fresh coriander",
      "Flaky salt and black pepper",
      "400g grated cheese (mix of feta, cheddar, Lancashire, mozzarella)",
      "300g dried black beans",
      "4 garlic cloves, bashed",
      "few bay leaves (optional)",
      "Corn or flour tortillas, to serve",
      "Home-made salsa, to serve",
      "Avocados or guacamole, to serve",
    ],
  },
  "Tartiflette (Food Wishes)": {
    source: "https://foodwishes.blogspot.com/2016/03/tartiflette-french-potato-bacon-and.html (prose; transcribed)",
    lines: [
      "butter for greasing casserole dish",
      "3 pounds russet potatoes, cooked with skins on, in salted water",
      "12 ounces thick-cut bacon, cut into 1/2-inch pieces",
      "2 large onions, sliced thin",
      "salt, freshly ground black pepper, and cayenne to taste",
      "1/2 cup drinkable white wine",
      "3/4 cup crème fraiche",
      "1 pound Reblochon cheese, or something similar",
    ],
  },
};

const clip = (s, max) => {
  if (!s) return s;
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max - 20 ? cut.slice(0, lastSpace) : cut).trim();
};

const env = loadEnv();
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const titles = Object.keys(MANUAL);
const { data: recipes, error } = await supabase
  .from("recipes")
  .select("id, title")
  .in("title", titles);
if (error) throw error;

const { data: ingRows } = await supabase.from("ingredients").select("recipe_id");
const haveIngredients = new Set(ingRows.map((r) => r.recipe_id));

for (const title of titles) {
  const recipe = recipes.find((r) => r.title === title);
  if (!recipe) {
    console.log(`  ?  "${title}" — no matching recipe row, skipping`);
    continue;
  }
  if (haveIngredients.has(recipe.id)) {
    console.log(`  –  ${title} — already has ingredients, skipping`);
    continue;
  }

  const parsed = MANUAL[title].lines.map(splitIngredient).filter(Boolean);
  console.log(`\n### ${title}  (${MANUAL[title].source})`);
  parsed.forEach((i) => console.log(`  [${String(i.quantity ?? "").padEnd(16)}] ${i.name}`));

  if (!APPLY) continue;

  const rows = parsed
    .map((ing, idx) => ({
      recipe_id: recipe.id,
      name: clip(ing.name.trim(), 150),
      quantity: ing.quantity ? clip(ing.quantity.trim(), 50) || null : null,
      sort_order: idx,
    }))
    .filter((r) => r.name);
  const { error: insErr } = await supabase.from("ingredients").insert(rows);
  console.log(insErr ? `  ✗ ${insErr.message}` : `  ✓ inserted ${rows.length} rows`);
}

if (!APPLY) console.log("\nDry run. Re-run with --apply to insert rows.");
