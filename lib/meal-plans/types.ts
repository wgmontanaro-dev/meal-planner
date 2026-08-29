import type {
  Cuisine,
  DietType,
  PrepTimeCategory,
  PreparationType,
  StorageType,
  TernaryCategory,
} from "@/lib/constants/categories";
import type { RecipeImageUrls } from "@/lib/images/types";

export type MealSlotState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
};

export const initialMealSlotState: MealSlotState = { status: "idle" };

// Compact projection of a Recipe for the meal-slot recipe picker
// (SPEC.md section 16.1) — excludes instructions and source URL so a large
// recipe collection stays lightweight in the browser (SPEC.md section 27).
// `imageUrls` carries short-lived signed thumbnail URLs (or null) so the
// picker can show the same photo / stock-illustration thumbnail as the
// recipe library.
export type RecipeSummary = {
  id: string;
  title: string;
  prepTimeCategory: PrepTimeCategory | null;
  cuisine: Cuisine | null;
  storageType: StorageType | null;
  dietType: DietType | null;
  childFriendly: TernaryCategory | null;
  weeknightFavourite: TernaryCategory | null;
  preparationType: PreparationType | null;
  imageUrls: RecipeImageUrls | null;
};
