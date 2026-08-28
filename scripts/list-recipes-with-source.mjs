// Ad-hoc: list recipes that have a source_url, with their current ingredient count.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

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

const env = loadEnv();
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: recipes, error } = await supabase
  .from("recipes")
  .select("id, title, source_url")
  .order("title");
if (error) throw error;

const { data: ingredients, error: ingErr } = await supabase
  .from("ingredients")
  .select("recipe_id");
if (ingErr) throw ingErr;

const counts = new Map();
for (const row of ingredients) counts.set(row.recipe_id, (counts.get(row.recipe_id) ?? 0) + 1);

const withSource = recipes.filter((r) => r.source_url && r.source_url.trim());
console.log(`${recipes.length} recipes total, ${withSource.length} with a source URL\n`);
for (const r of withSource) {
  console.log(JSON.stringify({ id: r.id, title: r.title, ingredients: counts.get(r.id) ?? 0, source_url: r.source_url }));
}
