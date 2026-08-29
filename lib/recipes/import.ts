// Best-effort recipe extraction from a source web page.
//
// The parser leans on schema.org `Recipe` structured data (JSON-LD, then
// microdata), which nearly every mainstream recipe site publishes; when a page
// carries neither it falls back to scraping a plain-HTML ingredient list
// (recipe-card plugin markup, or the first list after an "Ingredients"
// heading). Ingredients and instructions are the priority; title, summary,
// image, prep time, cuisine and diet type are filled in when the page exposes
// them. Pages with no recognisable recipe (many video pages, forum threads,
// JS-only sites) return a failure the caller can turn into "enter it manually
// instead".
//
// This module performs network I/O but holds no server-only imports, so it can
// be unit-tested directly.

import {
  CUISINES,
  CUISINE_LABELS,
  type Cuisine,
  type DietType,
  type PrepTimeCategory,
} from "@/lib/constants/categories";
import {
  RECIPE_INSTRUCTIONS_MAX_LENGTH,
  RECIPE_SUMMARY_MAX_LENGTH,
  RECIPE_TITLE_MAX_LENGTH,
  RECIPE_SOURCE_URL_MAX_LENGTH,
} from "@/lib/validation/recipe";

export type ScrapedIngredient = { name: string; quantity: string | null };

export type ScrapedRecipe = {
  sourceUrl: string;
  title: string | null;
  summaryDescription: string | null;
  instructions: string | null;
  ingredients: ScrapedIngredient[];
  imageUrl: string | null;
  prepTimeCategory: PrepTimeCategory | null;
  cuisine: Cuisine | null;
  dietType: DietType | null;
};

export type ImportOutcome =
  | { ok: true; recipe: ScrapedRecipe; warnings: string[] }
  | { ok: false; reason: string };

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

const UNICODE_FRACTIONS: Record<string, string> = {
  "¼": "1/4", "½": "1/2", "¾": "3/4", "⅓": "1/3", "⅔": "2/3",
  "⅛": "1/8", "⅜": "3/8", "⅝": "5/8", "⅞": "7/8", "⅕": "1/5",
  "⅖": "2/5", "⅗": "3/5", "⅘": "4/5", "⅙": "1/6",
};

function decodeEntities(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&#8217;|&rsquo;|&#39;|&apos;/g, "’")
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/&#8212;|&mdash;/g, "—")
    .replace(/&nbsp;/g, " ")
    .replace(/&frac12;/g, "½")
    .replace(/&frac14;/g, "¼")
    .replace(/&frac34;/g, "¾")
    .replace(/&deg;/g, "°")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

function stripTags(fragment: string): string {
  return decodeEntities(fragment.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function clip(value: string | null | undefined, max: number): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length <= max) return trimmed;
  const cut = trimmed.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max - 30 ? cut.slice(0, lastSpace) : cut).trim();
}

function toArray(value: unknown): unknown[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    return value.includes(",") ? value.split(",") : [value];
  }
  return [value];
}

// ---------------------------------------------------------------------------
// Ingredient line -> { quantity, name }
// ---------------------------------------------------------------------------

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

const SIZE_WORDS = new Set([
  "large", "small", "medium", "big", "whole", "heaped", "level", "generous", "scant",
]);

const NUMERIC = /^[\d.,/]+$/;

function normaliseIngredientLine(raw: string): string {
  let s = decodeEntities(String(raw)).replace(/\s+/g, " ").trim();
  s = s.replace(/\\?u00(22|27|2019|2018)/gi, (_, code) =>
    (({ "22": '"', "27": "’", "2018": "‘", "2019": "’" }) as Record<string, string>)[
      code
    ] ?? ""
  );
  s = s.replace(/^[-*•·▢●○–—]\s*/, "");
  for (const [key, value] of Object.entries(UNICODE_FRACTIONS)) {
    s = s.split(key).join(value);
  }
  s = s.replace(/(^|\s)(\d)(\d\/\d+)/g, "$1$2 $3");
  s = s.replace(/(\d)([a-zA-Z]+)/g, (m, digit, word) =>
    UNITS.has(word.toLowerCase()) || SIZE_WORDS.has(word.toLowerCase()) ? `${digit} ${word}` : m
  );
  return s;
}

function isQuantityToken(token: string, atStart: boolean): boolean {
  const t = token.toLowerCase().replace(/^[("']+/, "").replace(/[)"',.]+$/, "");
  if (!t) return false;
  if (NUMERIC.test(t) && /\d/.test(t)) return true;
  // Numeric range, e.g. "1-2", "1.5–2", "6–8".
  if (/^\d[\d.,/]*[-–—]\d[\d.,/]*$/.test(t)) return true;
  if (/^\d/.test(t) && /^[\d/.]+$/.test(t)) return true;
  if (UNITS.has(t)) return true;
  if (SIZE_WORDS.has(t)) return true;
  if (t === "x" || t === "×") return true;
  if (t === "of" || t === "a" || t === "an") return atStart;
  if (/^\(.*\d.*\)$/.test(token)) return true;
  return false;
}

/** Splits a free-text ingredient line into a leading quantity and the name. */
export function splitIngredient(raw: string): ScrapedIngredient | null {
  const line = normaliseIngredientLine(raw);
  if (!line) return null;

  const tokens = line.split(" ");
  let i = 0;
  let sawNumber = false;
  while (i < tokens.length) {
    const token = tokens[i];
    if (isQuantityToken(token, i === 0)) {
      if (/\d/.test(token)) sawNumber = true;
      i += 1;
      continue;
    }
    if (
      (token === "-" || token === "–" || token === "—" || token === "to") &&
      i > 0 &&
      i + 1 < tokens.length &&
      /\d/.test(tokens[i + 1])
    ) {
      i += 1;
      continue;
    }
    break;
  }

  const quantityTokens = tokens.slice(0, i);
  let quantity = quantityTokens.join(" ").trim();
  let name = tokens.slice(i).join(" ").trim();

  name = name.replace(/^of\s+/i, "").trim();

  if (!name && quantityTokens.length) {
    name = quantityTokens[quantityTokens.length - 1];
    quantity = quantityTokens.slice(0, -1).join(" ").trim();
  }

  if (name && !sawNumber && quantity && SIZE_WORDS.has(quantity.toLowerCase())) {
    name = `${quantity} ${name}`;
    quantity = "";
  }

  if (!name) {
    name = line;
    quantity = "";
  }

  quantity = quantity.replace(/\s+of$/i, "").replace(/\s*([-–—])\s*/g, "$1").trim();
  name = name.charAt(0).toUpperCase() + name.slice(1);

  return { name: (name || line).slice(0, 150), quantity: quantity ? quantity.slice(0, 50) : null };
}

// ---------------------------------------------------------------------------
// Derived metadata
// ---------------------------------------------------------------------------

/** Minutes in an ISO 8601 duration such as `PT1H30M` or `P1DT2H`; null if none. */
export function parseIsoDurationMinutes(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const match = value
    .trim()
    .match(/^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i);
  if (!match) return null;
  const [, days, hours, minutes, seconds] = match;
  const total =
    (Number(days ?? 0) * 24 * 60) +
    (Number(hours ?? 0) * 60) +
    Number(minutes ?? 0) +
    Number(seconds ?? 0) / 60;
  return total > 0 ? Math.round(total) : null;
}

export function minutesToPrepTimeCategory(minutes: number | null): PrepTimeCategory | null {
  if (minutes == null || minutes <= 0) return null;
  if (minutes < 15) return "UNDER_15";
  if (minutes <= 30) return "FROM_15_TO_30";
  if (minutes <= 60) return "FROM_30_TO_60";
  if (minutes <= 90) return "FROM_60_TO_90";
  return "OVER_90";
}

const CUISINE_LOOKUP: Record<string, Cuisine> = (() => {
  const map: Record<string, Cuisine> = {};
  for (const key of CUISINES) {
    map[CUISINE_LABELS[key].toLowerCase()] = key;
  }
  const synonyms = {
    english: "BRITISH", uk: "BRITISH", "united kingdom": "BRITISH", scottish: "BRITISH", welsh: "BRITISH", irish: "BRITISH",
    usa: "AMERICAN", american: "AMERICAN", "north american": "AMERICAN", southern: "AMERICAN", cajun: "AMERICAN", creole: "AMERICAN", "soul food": "AMERICAN",
    "tex-mex": "MEXICAN", "tex mex": "MEXICAN",
    moroccan: "NORTH_AFRICAN", tunisian: "NORTH_AFRICAN", algerian: "NORTH_AFRICAN",
    "middle-eastern": "MIDDLE_EASTERN", levantine: "MIDDLE_EASTERN", persian: "MIDDLE_EASTERN", iranian: "MIDDLE_EASTERN", lebanese: "MIDDLE_EASTERN", turkish: "MIDDLE_EASTERN", "israeli": "MIDDLE_EASTERN",
    "south american": "LATIN_AMERICAN", peruvian: "LATIN_AMERICAN", brazilian: "LATIN_AMERICAN", argentinian: "LATIN_AMERICAN", argentine: "LATIN_AMERICAN", colombian: "LATIN_AMERICAN", cuban: "LATIN_AMERICAN",
    "southeast asian": "SOUTH_EAST_ASIAN", "south-east asian": "SOUTH_EAST_ASIAN", malaysian: "SOUTH_EAST_ASIAN", indonesian: "SOUTH_EAST_ASIAN", filipino: "SOUTH_EAST_ASIAN", singaporean: "SOUTH_EAST_ASIAN",
    nordic: "SCANDINAVIAN", swedish: "SCANDINAVIAN", danish: "SCANDINAVIAN", norwegian: "SCANDINAVIAN", finnish: "SCANDINAVIAN",
    "eastern-european": "EASTERN_EUROPEAN", polish: "EASTERN_EUROPEAN", hungarian: "EASTERN_EUROPEAN", russian: "EASTERN_EUROPEAN", ukrainian: "EASTERN_EUROPEAN", "german": "EASTERN_EUROPEAN",
  } satisfies Record<string, Cuisine>;
  return Object.assign(map, synonyms);
})();

export function mapCuisine(recipeCuisine: unknown, keywords: unknown, title: string | null): Cuisine | null {
  for (const raw of toArray(recipeCuisine)) {
    const key = CUISINE_LOOKUP[String(raw).trim().toLowerCase()];
    if (key) return key;
  }
  const haystack = `${toArray(keywords).map(String).join(" ")} ${title ?? ""}`.toLowerCase();
  for (const [needle, key] of Object.entries(CUISINE_LOOKUP)) {
    if (needle.length >= 5 && haystack.includes(needle)) return key;
  }
  return null;
}

const MEAT_OR_FISH =
  /\b(chicken|beef|pork|lamb|mutton|bacon|ham|gammon|sausages?|chorizo|prosciutto|pancetta|salami|pepperoni|turkey|duck|veal|venison|rabbit|mince|meatballs?|steak|brisket|oxtail|lardons?|lard|suet|anchov(?:y|ies)|fish|salmon|tuna|cod|haddock|pollock|mackerel|sardines?|trout|sea bass|prawns?|shrimps?|crab|lobster|mussels?|clams?|oysters?|squid|calamari|scallops?|nam pla)\b/i;

export function deriveDietType(
  suitableForDiet: unknown,
  ingredients: ScrapedIngredient[],
  title: string | null,
  keywords: unknown
): { value: DietType | null; guessed: boolean } {
  const diet = toArray(suitableForDiet).map(String).join(" ").toLowerCase();
  if (/vegan|vegetarian/.test(diet)) return { value: "VEGETARIAN", guessed: false };

  const haystack = [title ?? "", toArray(keywords).map(String).join(" "), ...ingredients.map((i) => i.name)]
    .join(" ")
    .toLowerCase();
  if (MEAT_OR_FISH.test(haystack)) return { value: "MEAT_OR_FISH", guessed: false };
  if (/\bvegan\b|\bvegetarian\b/.test(haystack)) return { value: "VEGETARIAN", guessed: false };

  if (ingredients.length >= 4) return { value: "VEGETARIAN", guessed: true };
  return { value: null, guessed: false };
}

// ---------------------------------------------------------------------------
// JSON-LD / microdata / OpenGraph extraction
// ---------------------------------------------------------------------------

type JsonRecord = Record<string, unknown>;

function collectRecipeNodes(node: unknown, out: JsonRecord[], depth = 0): void {
  if (depth > 6) return;
  if (Array.isArray(node)) {
    for (const item of node) collectRecipeNodes(item, out, depth + 1);
    return;
  }
  if (!node || typeof node !== "object") return;
  const record = node as JsonRecord;
  const type = record["@type"];
  const types = Array.isArray(type) ? type : [type];
  if (types.some((t) => typeof t === "string" && t.toLowerCase() === "recipe")) {
    out.push(record);
  }
  // Recurse into every nested object/array (@graph, mainEntity, hasPart, …) so
  // a Recipe that isn't at the top level is still found.
  for (const value of Object.values(record)) {
    if (value && typeof value === "object") collectRecipeNodes(value, out, depth + 1);
  }
}

function jsonLdRecipeNodes(html: string): JsonRecord[] {
  const scripts = [
    ...html.matchAll(
      /<script[^>]*type=["']application\/ld\+json(?:;[^"']*)?["'][^>]*>([\s\S]*?)<\/script>/gi
    ),
  ];
  const nodes: JsonRecord[] = [];
  for (const match of scripts) {
    let text = match[1].trim().replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
    // Raw control characters inside string values are invalid JSON.
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
        /* try the next candidate */
      }
    }
  }
  return nodes;
}

function ingredientListFromNode(node: JsonRecord): string[] {
  const list = node.recipeIngredient ?? node.ingredients;
  if (Array.isArray(list) && list.length) {
    return list
      .map((x) =>
        typeof x === "string"
          ? x
          : String((x as JsonRecord)?.name ?? (x as JsonRecord)?.text ?? "")
      )
      .map((s) => stripTags(s)) // structured data sometimes embeds <a>/<span>/entities
      .filter(Boolean);
  }
  if (typeof list === "string" && list.trim()) {
    return list
      .split(/\r?\n/)
      .map((s) => stripTags(s))
      .filter(Boolean);
  }
  return [];
}

function flattenInstructionStep(step: unknown): string[] {
  if (typeof step === "string") {
    const text = stripTags(step);
    return text ? [text] : [];
  }
  if (!step || typeof step !== "object") return [];
  const record = step as JsonRecord;
  const type = String(record["@type"] ?? "").toLowerCase();
  if (type === "howtosection") {
    const heading =
      typeof record.name === "string" ? stripTags(record.name).replace(/[:：]\s*$/, "") : "";
    const children = toArray(record.itemListElement).flatMap(flattenInstructionStep);
    return heading ? [`${heading}:`, ...children] : children;
  }
  const text = record.text ?? record.name ?? "";
  const clean = stripTags(String(text));
  return clean ? [clean] : [];
}

function instructionsFromNode(node: JsonRecord): string | null {
  const value = node.recipeInstructions;
  if (typeof value === "string") return clip(stripTags(value), RECIPE_INSTRUCTIONS_MAX_LENGTH);
  if (Array.isArray(value)) {
    const parts = value.flatMap(flattenInstructionStep);
    return parts.length ? clip(parts.join("\n\n"), RECIPE_INSTRUCTIONS_MAX_LENGTH) : null;
  }
  return null;
}

function firstImageUrl(image: unknown): string | null {
  if (!image) return null;
  if (typeof image === "string") return image;
  if (Array.isArray(image)) {
    for (const item of image) {
      const url = firstImageUrl(item);
      if (url) return url;
    }
    return null;
  }
  if (typeof image === "object") {
    const url = (image as JsonRecord).url;
    return typeof url === "string" ? url : null;
  }
  return null;
}

function metaContent(html: string, property: string): string | null {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${property}["'][^>]*content=["']([^"']+)["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${property}["']`,
      "i"
    ),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return decodeEntities(match[1]).trim();
  }
  return null;
}

function microdataIngredients(html: string): string[] {
  return [
    ...html.matchAll(
      /<([a-z0-9]+)[^>]*itemprop=["'](?:recipeIngredient|ingredients)["'][^>]*>([\s\S]*?)<\/\1>/gi
    ),
  ]
    .map((m) => stripTags(m[2]))
    .filter(Boolean);
}

function microdataInstructions(html: string): string | null {
  const parts = [
    ...html.matchAll(
      /<([a-z0-9]+)[^>]*itemprop=["']recipeInstructions["'][^>]*>([\s\S]*?)<\/\1>/gi
    ),
  ]
    .map((m) => stripTags(m[2]))
    .filter(Boolean);
  return parts.length ? clip(parts.join("\n\n"), RECIPE_INSTRUCTIONS_MAX_LENGTH) : null;
}

// ---------------------------------------------------------------------------
// Plain-HTML ingredient fallback (pages with no structured data)
// ---------------------------------------------------------------------------

// Whole-line section headings and noise that show up as list items but are
// not ingredients.
const SECTION_HEADER =
  /^(?:for (?:the|your) .{1,40}|to (?:serve|garnish|finish|decorate|taste)|dressing|sauce|marinade|topping|filling|garnish|glaze|optional|equipment|you(?:'| wi)ll need|ingredients?|method|instructions?|directions?)\s*:?\s*$/i;

/** True for a list item that is a section heading or noise, not an ingredient. */
function isJunkIngredient(line: string): boolean {
  const t = line.trim().replace(/\s+/g, " ");
  if (t.length < 2) return true;
  if (/\d/.test(t)) return false; // has a number → treat as a real ingredient
  if (SECTION_HEADER.test(t)) return true;
  return /:\s*$/.test(t) && t.length <= 40;
}

function dedupeLines(lines: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const key = line.toLowerCase().replace(/\s+/g, " ").trim();
    if (key && !seen.has(key)) {
      seen.add(key);
      out.push(line);
    }
  }
  return out;
}

// class= substrings used by the common recipe-card plugins for an ingredient
// row (WP Recipe Maker, Tasty Recipes, Mediavine Create, Allrecipes, generic).
const PLUGIN_INGREDIENT_CLASS =
  /wprm-recipe-ingredient|tasty-recipes-ingredient|mv-create-ingredients|structured-ingredients__list-item|recipe-ingredients?__item|ingredient-item|ingredients?-list-item/i;

/**
 * Best-effort ingredient scrape from raw HTML, used only when neither JSON-LD
 * nor microdata carried a list. Tries recipe-card plugin markup first, then
 * the first <ul>/<ol> that follows an "Ingredients" heading.
 */
function htmlListIngredients(html: string): string[] {
  const pluginItems = [...html.matchAll(/<li\b[^>]*class=["']([^"']*)["'][^>]*>([\s\S]*?)<\/li>/gi)]
    .filter((m) => PLUGIN_INGREDIENT_CLASS.test(m[1]))
    .map((m) => stripTags(m[2]))
    .filter(Boolean);
  if (pluginItems.length >= 2) return dedupeLines(pluginItems);

  const headingRe = /<(h[1-6]|p|strong|b)\b[^>]*>((?:(?!<\/\1>)[\s\S])*?)<\/\1>/gi;
  let match: RegExpExecArray | null;
  while ((match = headingRe.exec(html)) !== null) {
    if (!/^ingredients?\b/i.test(stripTags(match[2]))) continue;
    const after = html.slice(
      match.index + match[0].length,
      match.index + match[0].length + 20000
    );
    const list = after.match(/<(ul|ol)\b[^>]*>([\s\S]*?)<\/\1>/i);
    if (!list) continue;
    const items = [...list[2].matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
      .map((m) => stripTags(m[1]))
      .filter(Boolean);
    if (items.length >= 2) return dedupeLines(items);
  }
  return [];
}

function absoluteUrl(candidate: string | null, base: string): string | null {
  if (!candidate) return null;
  try {
    return new URL(candidate, base).toString();
  } catch {
    return null;
  }
}

/**
 * Pulls a `ScrapedRecipe` out of a page's HTML, or null when it holds nothing
 * recipe-shaped (no ingredients and no instructions). `warnings` describes
 * fields that could not be filled.
 */
export function extractRecipeFromHtml(
  html: string,
  sourceUrl: string
): { recipe: ScrapedRecipe; warnings: string[] } | null {
  // Prefer the JSON-LD Recipe node that actually carries an ingredient list —
  // pages sometimes ship a stub Recipe node first (or several).
  const nodes = jsonLdRecipeNodes(html);
  let node: JsonRecord | null = nodes[0] ?? null;
  let bestCount = node ? ingredientListFromNode(node).length : 0;
  for (const candidate of nodes.slice(1)) {
    const count = ingredientListFromNode(candidate).length;
    if (count > bestCount) {
      node = candidate;
      bestCount = count;
    }
  }
  const warnings: string[] = [];

  let ingredientLines = node ? ingredientListFromNode(node) : [];
  if (ingredientLines.length === 0) ingredientLines = microdataIngredients(html);
  if (ingredientLines.length === 0) ingredientLines = htmlListIngredients(html);
  const ingredients = dedupeLines(ingredientLines)
    .filter((line) => !isJunkIngredient(line))
    .map(splitIngredient)
    .filter((x): x is ScrapedIngredient => x != null);

  const instructions =
    (node ? instructionsFromNode(node) : null) ?? microdataInstructions(html);

  if (ingredients.length === 0 && !instructions) {
    return null;
  }

  const title =
    clip(
      (typeof node?.name === "string" ? node.name : null) ??
        metaContent(html, "og:title") ??
        (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? null),
      RECIPE_TITLE_MAX_LENGTH
    ) ?? null;

  const summaryDescription =
    clip(
      (typeof node?.description === "string" ? stripTags(node.description) : null) ??
        metaContent(html, "og:description") ??
        metaContent(html, "description"),
      RECIPE_SUMMARY_MAX_LENGTH
    ) ?? null;

  const imageUrl = absoluteUrl(
    firstImageUrl(node?.image) ?? metaContent(html, "og:image"),
    sourceUrl
  );

  const totalMinutes =
    parseIsoDurationMinutes(node?.totalTime) ??
    (() => {
      const prep = parseIsoDurationMinutes(node?.prepTime);
      const cook = parseIsoDurationMinutes(node?.cookTime);
      return prep != null || cook != null ? (prep ?? 0) + (cook ?? 0) : null;
    })();
  const prepTimeCategory = minutesToPrepTimeCategory(totalMinutes);

  const cuisine = mapCuisine(node?.recipeCuisine, node?.keywords, title);
  const diet = deriveDietType(node?.suitableForDiet, ingredients, title, node?.keywords);

  if (ingredients.length === 0) warnings.push("No ingredients were found on the page.");
  if (!instructions) warnings.push("No method was found on the page.");
  if (!prepTimeCategory) warnings.push("Couldn’t work out the prep time.");
  if (!cuisine) warnings.push("Couldn’t work out the cuisine.");
  if (diet.guessed) warnings.push("Guessed the diet type from the ingredients — worth checking.");
  else if (!diet.value) warnings.push("Couldn’t work out the diet type.");

  return {
    recipe: {
      sourceUrl,
      title,
      summaryDescription,
      instructions,
      ingredients,
      imageUrl,
      prepTimeCategory,
      cuisine,
      dietType: diet.value,
    },
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Fetching
// ---------------------------------------------------------------------------

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchOnce(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "user-agent": USER_AGENT,
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "en-GB,en;q=0.9",
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "none",
      "upgrade-insecure-requests": "1",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function fetchViaWayback(url: string): Promise<string> {
  const api = `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`;
  const res = await fetch(api, { signal: AbortSignal.timeout(20000) });
  const json = (await res.json()) as {
    archived_snapshots?: { closest?: { url?: string } };
  };
  const snapshot = json?.archived_snapshots?.closest?.url;
  if (!snapshot) throw new Error("no snapshot");
  return fetchOnce(snapshot.replace(/^http:/, "https:"));
}

async function fetchHtml(url: string): Promise<string> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await fetchOnce(url);
    } catch (error) {
      lastError = error;
      if (attempt < 3) await sleep(1000 * attempt);
    }
  }
  try {
    return await fetchViaWayback(url);
  } catch {
    throw lastError;
  }
}

function normaliseSourceUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > RECIPE_SOURCE_URL_MAX_LENGTH) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Fetches `rawUrl` and extracts a recipe, or explains why it could not. */
export async function importRecipeFromUrl(rawUrl: string): Promise<ImportOutcome> {
  const url = normaliseSourceUrl(rawUrl);
  if (!url) {
    return { ok: false, reason: "That doesn’t look like a valid web address." };
  }

  let html: string;
  try {
    html = await fetchHtml(url);
  } catch {
    return {
      ok: false,
      reason: "Couldn’t open that page. Check the address, or add the recipe manually.",
    };
  }

  const extracted = extractRecipeFromHtml(html, url);
  if (!extracted) {
    return {
      ok: false,
      reason:
        "That page doesn’t contain a recipe we can read (some video and blog pages don’t). Add it manually instead.",
    };
  }

  return { ok: true, recipe: extracted.recipe, warnings: extracted.warnings };
}
