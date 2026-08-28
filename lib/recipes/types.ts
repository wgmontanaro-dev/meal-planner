import type {
  Cuisine,
  DietType,
  PrepTimeCategory,
  PreparationType,
  StorageType,
  TernaryCategory,
} from "@/lib/constants/categories";
import type { Recipe } from "@/lib/database/types";
import type { RecipeImageUrls } from "@/lib/images/types";

/** A library recipe row paired with signed URLs for its image (if any). */
export type RecipeWithImage = Recipe & { imageUrls: RecipeImageUrls | null };

export type RecipeFilters = {
  prepTimeCategory?: PrepTimeCategory;
  cuisine?: Cuisine;
  storageType?: StorageType;
  dietType?: DietType;
  childFriendly?: TernaryCategory;
  preparationType?: PreparationType;
};

export type RecipeFormValues = {
  title: string;
  summaryDescription: string;
  sourceUrl: string;
  instructions: string;
  prepTimeCategory: string;
  cuisine: string;
  storageType: string;
  dietType: string;
  childFriendly: string;
  preparationType: string;
  ingredients: { name: string; quantity: string }[];
};

export type RecipeFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
  ingredientErrors?: Record<number, string>;
  values?: RecipeFormValues;
};

export const initialRecipeFormState: RecipeFormState = { status: "idle" };

export type DeleteRecipeState = {
  status: "idle" | "error";
  message?: string;
};

export const initialDeleteRecipeState: DeleteRecipeState = { status: "idle" };
