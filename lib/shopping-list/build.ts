import { formatDateLong } from "@/lib/dates/calendar";
import type { ShoppingListEntry, ShoppingListIngredient } from "@/lib/shopping-list/types";

// Structural subsets of the domain rows, so callers (and tests) can pass
// plain objects without constructing full entities.
type EntryInput = {
  mealDate: string;
  slot: 1 | 2;
  entryType: "recipe" | "manual";
  recipeId: string | null;
  manualTitle: string | null;
};
type IngredientInput = ShoppingListIngredient & { sortOrder: number };

// One planned meal, normalised to a common shape before consolidation.
type Unit = {
  key: string; // identity used to match consecutive-date runs
  kind: "recipe" | "manual";
  title: string;
  date: string; // "YYYY-MM-DD"
  slot: 1 | 2;
  ingredients: ShoppingListIngredient[];
};

/** The calendar day after an ISO "YYYY-MM-DD" date, as an ISO date string. */
function nextDay(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + 1));
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/**
 * Builds the consolidated shopping list from raw meal-plan rows (SPEC.md
 * sections 20.3, 20.4, 20.6):
 *
 * - recipe entries contribute their recipe's ingredients in stored order
 * - manual entries carry no ingredients of their own; the UI renders them
 *   as a single "Ingredients for <title>" line
 * - the same meal (same recipe, or the same manual title ignoring case and
 *   surrounding whitespace) planned on a run of consecutive dates is
 *   consolidated into one entry spanning that inclusive range; its
 *   ingredients are listed once, unchanged — no merging, scaling or
 *   quantity maths
 * - the same meal in both slots on a single date is NOT consolidated
 * - entries are ordered by start date, then single-date before ranged,
 *   then earliest slot
 *
 * Recipe entries whose recipe is absent from `recipeTitlesById` are skipped
 * (a concurrent-delete race; the `on delete restrict` foreign key makes it
 * unreachable in normal use). Manual entries with a blank title are skipped.
 */
export function assembleShoppingList(
  entries: EntryInput[],
  recipeTitlesById: Map<string, string>,
  ingredientsByRecipeId: Map<string, IngredientInput[]>
): ShoppingListEntry[] {
  const units: Unit[] = [];

  for (const entry of entries) {
    if (entry.entryType === "manual") {
      const title = entry.manualTitle?.trim();
      if (!title) continue;
      units.push({
        key: `manual:${title.toLowerCase().replace(/\s+/g, " ")}`,
        kind: "manual",
        title,
        date: entry.mealDate,
        slot: entry.slot,
        ingredients: [],
      });
      continue;
    }

    if (entry.recipeId === null || !recipeTitlesById.has(entry.recipeId)) continue;
    units.push({
      key: `recipe:${entry.recipeId}`,
      kind: "recipe",
      title: recipeTitlesById.get(entry.recipeId) as string,
      date: entry.mealDate,
      slot: entry.slot,
      ingredients: [...(ingredientsByRecipeId.get(entry.recipeId) ?? [])]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((ingredient) => ({ name: ingredient.name, quantity: ingredient.quantity })),
    });
  }

  units.sort((a, b) => (a.date === b.date ? a.slot - b.slot : a.date < b.date ? -1 : 1));

  // Fold consecutive-date runs of the same meal into one entry. `openByKey`
  // holds the entry currently eligible to extend for each meal identity; a
  // same-date repeat or a gap starts a fresh entry (and replaces the open
  // one), so same-day both-slot pairs are never consolidated.
  const built: ShoppingListEntry[] = [];
  const openByKey = new Map<string, ShoppingListEntry>();

  for (const unit of units) {
    const open = openByKey.get(unit.key);
    if (open && unit.date === nextDay(open.endDate)) {
      open.endDate = unit.date;
      if (!open.slots.includes(unit.slot)) {
        open.slots = [...open.slots, unit.slot].sort((a, b) => a - b);
      }
      continue;
    }
    const entry: ShoppingListEntry = {
      kind: unit.kind,
      startDate: unit.date,
      endDate: unit.date,
      slots: [unit.slot],
      title: unit.title,
      ingredients: unit.ingredients,
    };
    built.push(entry);
    openByKey.set(unit.key, entry);
  }

  return built.sort((a, b) => {
    if (a.startDate !== b.startDate) return a.startDate < b.startDate ? -1 : 1;
    const aRanged = a.startDate === a.endDate ? 0 : 1;
    const bRanged = b.startDate === b.endDate ? 0 : 1;
    if (aRanged !== bRanged) return aRanged - bRanged;
    return a.slots[0] - b.slots[0];
  });
}

/**
 * A single ingredient line: "quantity name" where a quantity exists,
 * otherwise just "name" — never placeholder punctuation (SPEC.md section
 * 20.5).
 */
export function formatIngredientLine(ingredient: ShoppingListIngredient): string {
  const quantity = ingredient.quantity?.trim();
  return quantity ? `${quantity} ${ingredient.name}` : ingredient.name;
}

/**
 * The date heading for an entry: a single long date, or "start – end" when
 * the entry was consolidated across a consecutive-date run (SPEC.md section
 * 20.4).
 */
export function formatEntryDateRange(entry: ShoppingListEntry): string {
  return entry.startDate === entry.endDate
    ? formatDateLong(entry.startDate)
    : `${formatDateLong(entry.startDate)} – ${formatDateLong(entry.endDate)}`;
}

/** "Meal 1" for a single slot, "Meals 1 & 2" when an entry spans both. */
export function formatEntrySlotLabel(entry: ShoppingListEntry): string {
  return entry.slots.length === 1
    ? `Meal ${entry.slots[0]}`
    : `Meals ${entry.slots.join(" & ")}`;
}

/**
 * Readable plain-text rendering for "Copy to clipboard" (SPEC.md sections
 * 20.4, 20.8): date (or date range), meal slot(s), title and bulleted
 * ingredients per entry, blank-line separated. Manual entries render a
 * single "Ingredients for <title>" bullet.
 */
export function formatShoppingListText(entries: ShoppingListEntry[]): string {
  return entries
    .map((entry) => {
      const header = `${formatEntryDateRange(entry)}\n${formatEntrySlotLabel(entry)}: ${entry.title}`;
      const lines =
        entry.kind === "manual"
          ? `• Ingredients for ${entry.title}`
          : entry.ingredients.map((ingredient) => `• ${formatIngredientLine(ingredient)}`).join("\n");
      return lines ? `${header}\n\n${lines}` : header;
    })
    .join("\n\n\n");
}
