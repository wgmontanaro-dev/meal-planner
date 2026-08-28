import { formatDateLong } from "@/lib/dates/calendar";
import type { ShoppingListIngredient, ShoppingListOccurrence } from "@/lib/shopping-list/types";

// Structural subsets of the domain rows, so callers (and tests) can pass
// plain objects without constructing full entities.
type EntryInput = {
  mealDate: string;
  slot: 1 | 2;
  entryType: "recipe" | "manual";
  recipeId: string | null;
};
type IngredientInput = ShoppingListIngredient & { sortOrder: number };

/**
 * Builds the occurrence-grouped shopping list from raw rows (SPEC.md
 * sections 20.3, 20.4, 20.6):
 *
 * - only `entryType === "recipe"` entries contribute; manual meals are ignored
 * - every entry becomes one independent occurrence — no de-duplication,
 *   no quantity merging, scaling or omission
 * - occurrences are ordered by meal date then slot
 * - each occurrence's ingredients keep their stored `sortOrder`
 *
 * Entries whose recipe is absent from `recipeTitlesById` are skipped (the
 * `on delete restrict` foreign key makes this unreachable in practice, but
 * a concurrent delete race is handled gracefully rather than crashing).
 */
export function assembleShoppingList(
  entries: EntryInput[],
  recipeTitlesById: Map<string, string>,
  ingredientsByRecipeId: Map<string, IngredientInput[]>
): ShoppingListOccurrence[] {
  return entries
    .filter(
      (entry): entry is EntryInput & { recipeId: string } =>
        entry.entryType === "recipe" &&
        entry.recipeId !== null &&
        recipeTitlesById.has(entry.recipeId)
    )
    .sort((a, b) =>
      a.mealDate === b.mealDate ? a.slot - b.slot : a.mealDate < b.mealDate ? -1 : 1
    )
    .map((entry) => ({
      mealDate: entry.mealDate,
      slot: entry.slot,
      recipeTitle: recipeTitlesById.get(entry.recipeId) as string,
      ingredients: [...(ingredientsByRecipeId.get(entry.recipeId) ?? [])]
        .sort((x, y) => x.sortOrder - y.sortOrder)
        .map((ingredient) => ({ name: ingredient.name, quantity: ingredient.quantity })),
    }));
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
 * Readable plain-text rendering for "Copy to clipboard" (SPEC.md sections
 * 20.4, 20.8): date, meal slot, recipe title and bulleted ingredients per
 * occurrence, blank-line separated.
 */
export function formatShoppingListText(occurrences: ShoppingListOccurrence[]): string {
  return occurrences
    .map((occurrence) => {
      const header = `${formatDateLong(occurrence.mealDate)}\nMeal ${occurrence.slot}: ${occurrence.recipeTitle}`;
      const lines = occurrence.ingredients
        .map((ingredient) => `• ${formatIngredientLine(ingredient)}`)
        .join("\n");
      return lines ? `${header}\n\n${lines}` : header;
    })
    .join("\n\n\n");
}
