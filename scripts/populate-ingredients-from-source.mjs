// Populate recipe ingredients by scraping each recipe's source URL.
//
//   node scripts/populate-ingredients-from-source.mjs           # fetch + parse, write report only
//   node scripts/populate-ingredients-from-source.mjs --apply    # also insert ingredient rows
//
// Only touches recipes that (a) have a non-empty source_url and (b) currently
// have zero ingredient rows. Extraction relies on schema.org Recipe JSON-LD
// (recipeIngredient), which nearly every mainstream recipe site publishes.
// Pages without it (YouTube, Reddit, some blogs) are reported as misses and
// left untouched.

import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

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

const env = loadEnv();
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const UNICODE_FRACTIONS = {
  "¼": "1/4", "½": "1/2", "¾": "3/4", "⅓": "1/3", "⅔": "2/3",
  "⅛": "1/8", "⅜": "3/8", "⅝": "5/8", "⅞": "7/8", "⅕": "1/5",
  "⅖": "2/5", "⅗": "3/5", "⅘": "4/5", "⅙": "1/6",
};

const UNITS = new Set([
  "g", "gm", "gms", "gr", "gram", "grams", "kg", "kgs", "kilogram", "kilograms",
  "ml", "l", "litre", "litres", "liter", "liters", "cl",
  "oz", "ozs", "ounce", "ounces", "lb", "lbs", "pound", "pounds",
  "tsp", "tsps", "teaspoon", "teaspoons", "tbsp", "tbsps", "tbs", "tablespoon", "tablespoons",
  "cup", "cups", "pint", "pints", "quart", "quarts", "gallon", "gallons",
  "clove", "cloves", "can", "cans", "tin", "tins", "jar", "jars", "packet", "packets",
  "pack", "packs", "bag", "bags", "bunch", "bunches", "sprig", "sprigs", "stick", "sticks",
  "slice", "slices", "rasher", "rashers", "fillet", "fillets", "head", "heads",
  "handful", "handfuls", "pinch", "pinches", "dash", "dashes", "knob", "knobs",
  "piece", "pieces", "sheet", "sheets", "strip", "strips", "block", "blocks",
  "ball", "balls", "punnet", "punnets", "glug", "glugs", "drizzle", "splash",
  "glass", "glasses", "cm", "inch", "inches",
]);

const SIZE_WORDS = new Set(["large", "small", "medium", "big", "whole", "heaped", "level", "generous", "scant"]);

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#8217;|&rsquo;|&#39;|&apos;/g, "’")
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/&#8212;|&mdash;/g, "—")
    .replace(/&nbsp;/g, " ")
    .replace(/&frac12;/g, "½")
    .replace(/&frac14;/g, "¼")
    .replace(/&frac34;/g, "¾")
    .replace(/&deg;/g, "°")
    .replace(/&quot;/g, '"');
}

function normalise(raw) {
  let s = decodeEntities(String(raw)).replace(/\s+/g, " ").trim();
  // Leftover JS/JSON unicode escapes that lost their backslash in transit.
  s = s.replace(/\\?u00(22|27|2019|2018)/gi, (m, code) =>
    ({ "22": '"', "27": "’", "2018": "‘", "2019": "’" })[code] ?? ""
  );
  s = s.replace(/^[-*•·▢●○–—]\s*/, "");
  for (const [k, v] of Object.entries(UNICODE_FRACTIONS)) {
    s = s.split(k).join(v);
  }
  // "11/2" is a mangled "1 1/2"; give the whole number its own token.
  s = s.replace(/(^|\s)(\d)(\d\/\d+)/g, "$1$2 $3");
  // Split a number glued to its unit or a following word: "400g" -> "400 g",
  // "4Clove" -> "4 Clove", "2tbsp" -> "2 tbsp". Only when the trailing part is
  // alphabetic so we don't break "1/2" or "150-180Gm" stays "150-180 Gm".
  s = s.replace(/(\d)([a-zA-Z]+)/g, (m, d, word) =>
    UNITS.has(word.toLowerCase()) || SIZE_WORDS.has(word.toLowerCase()) ? `${d} ${word}` : m
  );
  return s;
}

const NUMERIC = /^[\d.,/]+$/;
const RANGE = /^\d+(?:\.\d+)?(?:\s*[-–—]\s*|\s+to\s+)\d+(?:\.\d+)?$/;

function isQuantityToken(tok, atStart) {
  const t = tok.toLowerCase().replace(/[),.]+$/, "");
  if (!t) return false;
  if (NUMERIC.test(t) && /\d/.test(t)) return true;
  if (/^\d/.test(t) && /^[\d/.]+$/.test(t)) return true;
  if (UNITS.has(t)) return true;
  if (SIZE_WORDS.has(t)) return true;
  if (t === "x" || t === "×") return true;
  if (t === "of" || t === "a" || t === "an") return atStart;
  // parenthetical amount like "(400g)" or "(2-inch)"
  if (/^\(.*\d.*\)$/.test(tok)) return true;
  return false;
}

function splitIngredient(raw) {
  const line = normalise(raw);
  if (!line) return null;
  const tokens = line.split(" ");
  let i = 0;
  let sawNumber = false;
  while (i < tokens.length) {
    const tok = tokens[i];
    if (isQuantityToken(tok, i === 0)) {
      if (/\d/.test(tok)) sawNumber = true;
      i++;
      continue;
    }
    // allow a range written with spaces: "2 - 3"
    if ((tok === "-" || tok === "–" || tok === "—" || tok === "to") && i > 0 && i + 1 < tokens.length && /\d/.test(tokens[i + 1])) {
      i++;
      continue;
    }
    break;
  }

  let quantityTokens = tokens.slice(0, i);
  let quantity = quantityTokens.join(" ").trim();
  let name = tokens.slice(i).join(" ").trim();

  // A leading "of" belongs to neither field ("bunch of sage" -> qty "bunch",
  // name "sage"); it can land at the end of the quantity or the start of the name.
  name = name.replace(/^of\s+/i, "").trim();

  if (!name && quantityTokens.length) {
    // The whole line was quantity + unit (e.g. "3 cloves"): keep the last
    // word as the name so the row still reads sensibly.
    name = quantityTokens[quantityTokens.length - 1];
    quantity = quantityTokens.slice(0, -1).join(" ").trim();
  }

  // If we only consumed a bare size word with no number, that word is really
  // part of the name ("Whole nutmeg", not qty "whole").
  if (name && !sawNumber && quantity && SIZE_WORDS.has(quantity.toLowerCase())) {
    name = `${quantity} ${name}`;
    quantity = "";
  }

  if (!name) {
    name = line;
    quantity = "";
  }

  // Tidy quantity: drop a dangling "of", normalise spacing around ranges.
  quantity = quantity.replace(/\s+of$/i, "").replace(/\s*([-–—])\s*/g, "$1").trim();

  // Capitalise the ingredient name's first letter.
  name = name.charAt(0).toUpperCase() + name.slice(1);

  return { name: name || line, quantity: quantity || null };
}

function collectRecipeNodes(json, out) {
  if (Array.isArray(json)) {
    for (const item of json) collectRecipeNodes(item, out);
    return;
  }
  if (!json || typeof json !== "object") return;
  if (Array.isArray(json["@graph"])) collectRecipeNodes(json["@graph"], out);
  const type = json["@type"];
  const types = Array.isArray(type) ? type : [type];
  if (types.some((t) => typeof t === "string" && t.toLowerCase() === "recipe")) {
    out.push(json);
  }
}

function stripTags(fragment) {
  return fragment
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8217;|&rsquo;/g, "’")
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/&nbsp;/g, " ")
    .replace(/&frac12;/g, "½")
    .replace(/&frac14;/g, "¼")
    .replace(/&frac34;/g, "¾")
    .replace(/\s+/g, " ")
    .trim();
}

// 1. schema.org Recipe JSON-LD — the common case.
function fromJsonLd(html) {
  const scripts = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const nodes = [];
  for (const m of scripts) {
    let text = m[1].trim();
    text = text.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
    // Raw control characters inside string values are invalid JSON and make
    // JSON.parse throw (some sites embed multi-line author bios). Flatten them.
    text = text.replace(/[\u0000-\u001F]+/g, " ");
    const attempts = [text];
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end > start) attempts.push(text.slice(start, end + 1));
    for (const attempt of attempts) {
      try {
        collectRecipeNodes(JSON.parse(attempt), nodes);
        break;
      } catch {
        /* try next */
      }
    }
  }
  for (const node of nodes) {
    const list = node.recipeIngredient || node.ingredients;
    if (Array.isArray(list) && list.length) {
      return list.map((x) => (typeof x === "string" ? x : String(x?.name ?? ""))).filter(Boolean);
    }
    if (typeof list === "string" && list.trim()) {
      return list.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    }
  }
  return null;
}

// 2. Microdata: elements tagged itemprop="recipeIngredient" / "ingredients".
function fromMicrodata(html) {
  const matches = [
    ...html.matchAll(
      /<([a-z0-9]+)[^>]*itemprop=["'](?:recipeIngredient|ingredients)["'][^>]*>([\s\S]*?)<\/\1>/gi
    ),
  ];
  const items = matches.map((m) => stripTags(m[2])).filter(Boolean);
  return items.length ? items : null;
}

// 3. jamesmartinchef.co.uk: <div class="recipe-ingredients"> ... <li>.
function fromJamesMartin(html) {
  const anchor = html.indexOf('class="recipe-ingredients"');
  if (anchor === -1) return null;
  const slice = html.slice(anchor, anchor + 6000).split(/recipe-method|<!--\s*Method/i)[0];
  const items = [...slice.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((m) => stripTags(m[1]))
    .filter(Boolean);
  return items.length ? items : null;
}

function extractIngredients(html) {
  return fromJsonLd(html) || fromMicrodata(html) || fromJamesMartin(html) || null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchOnce(url) {
  const res = await fetch(url, {
    headers: {
      "user-agent": UA,
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "en-GB,en;q=0.9",
      "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "none",
      "upgrade-insecure-requests": "1",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

// Last-ditch: the most recent Wayback Machine snapshot of the page.
async function fetchFromWayback(url) {
  const api = `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`;
  const res = await fetch(api, { signal: AbortSignal.timeout(25000) });
  const json = await res.json();
  const snap = json?.archived_snapshots?.closest;
  if (!snap?.url) throw new Error("no Wayback snapshot");
  return await fetchOnce(snap.url.replace(/^http:/, "https:"));
}

async function fetchHtml(url) {
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await fetchOnce(url);
    } catch (err) {
      lastErr = err;
      if (attempt < 3) await sleep(1500 * attempt);
    }
  }
  try {
    return await fetchFromWayback(url);
  } catch {
    throw lastErr;
  }
}

async function main() {
  const { data: recipes, error } = await supabase
    .from("recipes")
    .select("id, title, source_url")
    .order("title");
  if (error) throw error;

  const { data: ingRows, error: ingErr } = await supabase.from("ingredients").select("recipe_id");
  if (ingErr) throw ingErr;
  const haveIngredients = new Set(ingRows.map((r) => r.recipe_id));

  const targets = recipes.filter(
    (r) => r.source_url && r.source_url.trim() && !haveIngredients.has(r.id)
  );

  console.log(`${targets.length} recipe(s) with a source URL and no ingredients.\n`);

  const report = [];
  for (const r of targets) {
    const entry = { id: r.id, title: r.title, source_url: r.source_url };
    try {
      const html = await fetchHtml(r.source_url);
      const rawList = extractIngredients(html);
      if (!rawList) {
        entry.status = "no-jsonld-ingredients";
        console.log(`  –  ${r.title}\n       (no Recipe JSON-LD found)`);
      } else {
        const parsed = rawList.map(splitIngredient).filter(Boolean);
        entry.status = "ok";
        entry.raw = rawList;
        entry.ingredients = parsed;
        console.log(`  ✓  ${r.title}  —  ${parsed.length} ingredient(s)`);
      }
    } catch (err) {
      entry.status = "fetch-failed";
      entry.error = err.message;
      console.log(`  ✗  ${r.title}\n       ${err.message}`);
    }
    report.push(entry);
  }

  const reportPath = new URL("../import/ingredient-scrape-report.json", import.meta.url);
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nReport written to import/ingredient-scrape-report.json`);

  const ok = report.filter((e) => e.status === "ok");
  console.log(
    `\nSummary: ${ok.length} scraped, ` +
      `${report.filter((e) => e.status === "no-jsonld-ingredients").length} no JSON-LD, ` +
      `${report.filter((e) => e.status === "fetch-failed").length} fetch failed.`
  );

  if (!APPLY) {
    console.log("\nDry run. Review the report, then re-run with --apply to insert rows.");
    return;
  }

  // Match the ingredients table CHECK constraints: name <= 150, quantity <= 50.
  const clip = (s, max) => {
    if (!s) return s;
    if (s.length <= max) return s;
    const cut = s.slice(0, max);
    const lastSpace = cut.lastIndexOf(" ");
    return (lastSpace > max - 20 ? cut.slice(0, lastSpace) : cut).trim();
  };

  let applied = 0;
  for (const e of ok) {
    const rows = e.ingredients
      .map((ing, idx) => ({
        recipe_id: e.id,
        name: clip(ing.name.trim(), 150),
        quantity: ing.quantity ? clip(ing.quantity.trim(), 50) || null : null,
        sort_order: idx,
      }))
      .filter((row) => row.name);
    if (!rows.length) continue;
    const { error: insErr } = await supabase.from("ingredients").insert(rows);
    if (insErr) {
      console.log(`  ✗ ${e.title}: ${insErr.message}`);
    } else {
      applied += 1;
      console.log(`  ✓ ${e.title}: ${rows.length} rows`);
    }
  }
  console.log(`\nInserted ingredients for ${applied}/${ok.length} recipe(s).`);
}

export { splitIngredient };

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("populate-ingredients-from-source.mjs")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
