import type {
  Cuisine,
  DietType,
  PrepTimeCategory,
  PreparationType,
  StorageType,
  TernaryCategory,
} from "@/lib/constants/categories";

export type MealSlotState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
};

export const initialMealSlotState: MealSlotState = { status: "idle" };

// Compact projection of a Recipe for the meal-slot recipe picker
// (SPEC.md section 16.1) — deliberately excludes instructions, source URL
// and image metadata so a large recipe collection stays lightweight in the
// browser (SPEC.md section 27).
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
};
