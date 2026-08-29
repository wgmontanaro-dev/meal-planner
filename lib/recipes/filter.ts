import type { RecipeSummary } from "@/lib/meal-plans/types";
import type { DraftFilters } from "@/components/recipes/filter-fields";

/**
 * Client-side application of the six controlled-category filters
 * (SPEC.md section 12.6) against an already-loaded recipe collection.
 * Used by the meal-slot recipe picker, where pushing filter changes to the
 * URL would remount the open dialogue — permitted for a small collection
 * per SPEC.md section 12.6.
 */
export function matchesFilters(recipe: RecipeSummary, filters: DraftFilters): boolean {
  if (filters.prepTimeCategory && recipe.prepTimeCategory !== filters.prepTimeCategory) {
    return false;
  }
  if (filters.cuisine && recipe.cuisine !== filters.cuisine) {
    return false;
  }
  if (filters.storageType && recipe.storageType !== filters.storageType) {
    return false;
  }
  if (filters.dietType && recipe.dietType !== filters.dietType) {
    return false;
  }
  if (filters.childFriendly && recipe.childFriendly !== filters.childFriendly) {
    return false;
  }
  if (filters.weeknightFavourite && recipe.weeknightFavourite !== filters.weeknightFavourite) {
    return false;
  }
  if (filters.preparationType && recipe.preparationType !== filters.preparationType) {
    return false;
  }
  return true;
}
