import { z } from "zod";
import {
  CUISINES,
  DIET_TYPES,
  PREPARATION_TYPES,
  PREP_TIME_CATEGORIES,
  STORAGE_TYPES,
  TERNARY_CATEGORIES,
} from "@/lib/constants/categories";
import { trimmedText, optionalTrimmedText } from "@/lib/validation/shared";

// Validation rules encoded here follow SPEC.md section 11. All fields are
// validated server-side regardless of any client-side validation, per
// implementation principle 5.

export const RECIPE_TITLE_MAX_LENGTH = 150;
export const RECIPE_SUMMARY_MAX_LENGTH = 500;
export const RECIPE_SOURCE_URL_MAX_LENGTH = 2000;
export const RECIPE_INSTRUCTIONS_MAX_LENGTH = 10000;
export const INGREDIENT_NAME_MAX_LENGTH = 150;
export const INGREDIENT_QUANTITY_MAX_LENGTH = 50;

function isAbsoluteHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export const titleSchema = trimmedText(
  RECIPE_TITLE_MAX_LENGTH,
  `Title must be ${RECIPE_TITLE_MAX_LENGTH} characters or fewer.`
).pipe(z.string().min(1, "Title is required."));

export const summaryDescriptionSchema = optionalTrimmedText(
  RECIPE_SUMMARY_MAX_LENGTH,
  `Summary must be ${RECIPE_SUMMARY_MAX_LENGTH} characters or fewer.`
);

export const sourceUrlSchema = optionalTrimmedText(
  RECIPE_SOURCE_URL_MAX_LENGTH,
  `Source URL must be ${RECIPE_SOURCE_URL_MAX_LENGTH} characters or fewer.`
).refine(
  (value) => value === null || isAbsoluteHttpUrl(value),
  "Enter a valid web address starting with http:// or https://."
);

export const instructionsSchema = optionalTrimmedText(
  RECIPE_INSTRUCTIONS_MAX_LENGTH,
  `Instructions must be ${RECIPE_INSTRUCTIONS_MAX_LENGTH} characters or fewer.`
);

export const ingredientInputSchema = z.object({
  name: trimmedText(
    INGREDIENT_NAME_MAX_LENGTH,
    `Ingredient name must be ${INGREDIENT_NAME_MAX_LENGTH} characters or fewer.`
  ).pipe(z.string().min(1, "Ingredient name is required.")),
  quantity: optionalTrimmedText(
    INGREDIENT_QUANTITY_MAX_LENGTH,
    `Quantity must be ${INGREDIENT_QUANTITY_MAX_LENGTH} characters or fewer.`
  ),
});

export type IngredientInput = z.infer<typeof ingredientInputSchema>;

export const recipeInputSchema = z.object({
  title: titleSchema,
  summaryDescription: summaryDescriptionSchema,
  sourceUrl: sourceUrlSchema,
  instructions: instructionsSchema,
  prepTimeCategory: z.enum(PREP_TIME_CATEGORIES, {
    message: "Choose a preparation time.",
  }),
  cuisine: z.enum(CUISINES, { message: "Choose a cuisine." }),
  storageType: z.enum(STORAGE_TYPES, { message: "Choose a storage type." }),
  dietType: z.enum(DIET_TYPES, { message: "Choose a diet type." }),
  childFriendly: z.enum(TERNARY_CATEGORIES, {
    message: "Choose a child-friendly value.",
  }),
  preparationType: z.enum(PREPARATION_TYPES, {
    message: "Choose a preparation type.",
  }),
  ingredients: z
    .array(ingredientInputSchema)
    .min(1, "At least one ingredient is required."),
});

export type RecipeInput = z.infer<typeof recipeInputSchema>;
