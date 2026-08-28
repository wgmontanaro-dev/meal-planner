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

/** Result of trying to pre-fill the Add Recipe form from a source URL. */
export type ImportRecipeState = {
  status: "idle" | "error" | "success";
  message?: string;
  /** The address that was submitted, echoed back so the field survives an error. */
  url?: string;
  /** Non-fatal notes about fields that could not be filled in. */
  warnings?: string[];
  /** Populated form values on success, ready to hand to the recipe form. */
  values?: RecipeFormValues;
  /** An image spotted on the source page, uploaded when the recipe is saved. */
  importedImageUrl?: string | null;
};

export const initialImportRecipeState: ImportRecipeState = { status: "idle" };
