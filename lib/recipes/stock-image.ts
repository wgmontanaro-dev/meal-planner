import type { Cuisine, DietType } from "@/lib/constants/categories";

// A small library of bundled illustrations used when a recipe has no
// uploaded image. Files live in `public/stock/<id>.svg`.
export const STOCK_IMAGE_IDS = [
  "curry",
  "roast",
  "salad",
  "pasta",
  "soup",
  "bread",
  "dessert",
  "breakfast",
  "seafood",
  "stir-fry",
  "tacos",
  "pizza",
  "grill",
  "smoothie",
  "plate",
] as const;

export type StockImageId = (typeof STOCK_IMAGE_IDS)[number];

const TITLE_PATTERNS: [StockImageId, RegExp][] = [
  ["curry", /\b(curry|curried|dahl|dhal|dal|masala|korma|tikka|balti|rogan|biryani|saag)\b/i],
  ["pasta", /\b(pasta|spaghetti|linguine|penne|lasagne|lasagna|carbonara|bolognese|ravioli|tagliatelle|gnocchi|macaroni|risotto)\b/i],
  ["soup", /\b(soup|broth|chowder|bisque|minestrone|ramen|pho|stew|casserole|hotpot)\b/i],
  ["salad", /\b(salad|slaw|coleslaw|greens|rocket|caesar|tabbouleh|buddha bowl|poke)\b/i],
  ["bread", /\b(bread|loaf|sourdough|focaccia|baguette|roll|bun|flatbread|naan|pitta|pita|scone|bagel)\b/i],
  ["dessert", /\b(cake|dessert|pudding|pie|tart|cookie|biscuit|brownie|crumble|cheesecake|ice cream|mousse|trifle|pavlova|muffin|cupcake)\b/i],
  ["breakfast", /\b(breakfast|pancake|pancakes|waffle|omelette|omelet|scrambled|porridge|oats|oatmeal|granola|muesli|toast|frittata|shakshuka)\b/i],
  ["seafood", /\b(fish|salmon|tuna|cod|haddock|prawn|shrimp|crab|lobster|mussel|scallop|seafood|calamari|squid|fishcake)\b/i],
  ["stir-fry", /\b(stir.?fry|stir.?fried|wok|noodle|noodles|chow mein|pad thai|fried rice|teriyaki|szechuan|katsu|gyoza)\b/i],
  ["tacos", /\b(taco|tacos|burrito|quesadilla|enchilada|fajita|nachos|tostada|chilli con carne|chili con carne)\b/i],
  ["pizza", /\b(pizza|calzone|margherita)\b/i],
  ["grill", /\b(grill|grilled|bbq|barbecue|barbeque|steak|burger|kebab|skewer|sausage|chargrilled|souvlaki)\b/i],
  ["smoothie", /\b(smoothie|juice|shake|acai)\b/i],
  ["roast", /\b(roast|roasted|traybake|tray bake|sunday lunch|pot roast|rotisserie|schnitzel)\b/i],
];

const CUISINE_FALLBACK: Partial<Record<Cuisine, StockImageId>> = {
  INDIAN: "curry",
  ITALIAN: "pasta",
  MEXICAN: "tacos",
  LATIN_AMERICAN: "tacos",
  CHINESE: "stir-fry",
  JAPANESE: "stir-fry",
  KOREAN: "stir-fry",
  THAI: "stir-fry",
  VIETNAMESE: "stir-fry",
  SOUTH_EAST_ASIAN: "stir-fry",
  MEDITERRANEAN: "salad",
  GREEK: "salad",
  MIDDLE_EASTERN: "salad",
  NORTH_AFRICAN: "salad",
  SPANISH: "seafood",
  AMERICAN: "grill",
  BRITISH: "roast",
  CARIBBEAN: "grill",
  AFRICAN: "soup",
  FRENCH: "bread",
  EASTERN_EUROPEAN: "soup",
  SCANDINAVIAN: "seafood",
};

// Light diet nudges — small weight, only breaks ties.
const DIET_NUDGE: Record<DietType, StockImageId[]> = {
  VEGETARIAN: ["salad", "curry", "soup", "smoothie", "pasta"],
  MEAT_OR_FISH: ["roast", "grill", "seafood"],
  FLEXIBLE: [],
};

/** Stable 32-bit hash of a string (FNV-1a). */
function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export type RecipeImageContext = {
  id: string;
  title: string;
  cuisine: Cuisine;
  dietType: DietType;
};

/**
 * Deterministically picks a bundled illustration for a recipe that has no
 * uploaded image, from its title, cuisine and diet type. Recipes with no
 * usable signal still get a stable, evenly-spread choice via a hash of the
 * recipe id, so the library never looks like it only has one picture.
 */
export function pickStockImageId(recipe: RecipeImageContext): StockImageId {
  const scores = new Map<StockImageId, number>();
  const add = (id: StockImageId, weight: number) =>
    scores.set(id, (scores.get(id) ?? 0) + weight);

  for (const [id, pattern] of TITLE_PATTERNS) {
    if (pattern.test(recipe.title)) add(id, 10);
  }

  const cuisinePick = CUISINE_FALLBACK[recipe.cuisine];
  if (cuisinePick) add(cuisinePick, 4);

  for (const id of DIET_NUDGE[recipe.dietType]) add(id, 1);

  let best: StockImageId | null = null;
  let bestScore = 0;
  for (const [id, score] of scores) {
    if (score > bestScore) {
      best = id;
      bestScore = score;
    }
  }

  if (best && bestScore > 0) {
    return best;
  }

  return STOCK_IMAGE_IDS[hashString(recipe.id) % STOCK_IMAGE_IDS.length];
}

export function stockImageSrc(id: StockImageId): string {
  return `/stock/${id}.svg`;
}

/** Convenience: the `{ src, alt }` a recipe's fallback illustration needs. */
export function stockImageFor(recipe: RecipeImageContext): { src: string; alt: string } {
  return {
    src: stockImageSrc(pickStockImageId(recipe)),
    alt: `Illustration for ${recipe.title}`,
  };
}
