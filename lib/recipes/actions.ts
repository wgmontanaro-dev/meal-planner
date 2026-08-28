"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/require-session";
import { getSupabaseClient } from "@/lib/database/client";
import { cleanupExpiredMealPlans } from "@/lib/meal-plans/actions";
import {
  deleteRecipeImageObject,
  removeRecipeImage,
  replaceRecipeImage,
  uploadRecipeImage,
  uploadRecipeImageFromUrl,
} from "@/lib/images/actions";
import { importRecipeFromUrl, type ScrapedRecipe } from "@/lib/recipes/import";
import { signRecipeImageUrls } from "@/lib/images/urls";
import type { RecipeImageUrls } from "@/lib/images/types";
import {
  toIngredient,
  toRecipe,
  type IngredientRow,
  type Recipe,
  type RecipeRow,
  type RecipeWithIngredients,
} from "@/lib/database/types";
import { recipeInputSchema, type IngredientInput } from "@/lib/validation/recipe";
import { validateImageFile } from "@/lib/validation/image";
import type {
  RecipeFilters,
  RecipeFormState,
  RecipeFormValues,
  DeleteRecipeState,
  ImportRecipeState,
} from "@/lib/recipes/types";

// Postgres foreign-key-violation error code. Returned when a recipe delete
// is blocked by a meal-plan entry referencing it (on delete restrict).
const FOREIGN_KEY_VIOLATION = "23503";

/**
 * Lists recipes, most recently created first, optionally narrowed by the
 * six controlled-category filters from SPEC.md section 12.6. Every
 * supplied dimension is applied with AND logic.
 */
export async function listRecipes(filters?: RecipeFilters): Promise<Recipe[]> {
  await requireSession();

  const supabase = getSupabaseClient();
  let query = supabase.from("recipes").select("*").order("created_at", { ascending: false });

  if (filters?.prepTimeCategory) {
    query = query.eq("prep_time_category", filters.prepTimeCategory);
  }
  if (filters?.cuisine) {
    query = query.eq("cuisine", filters.cuisine);
  }
  if (filters?.storageType) {
    query = query.eq("storage_type", filters.storageType);
  }
  if (filters?.dietType) {
    query = query.eq("diet_type", filters.dietType);
  }
  if (filters?.childFriendly) {
    query = query.eq("child_friendly", filters.childFriendly);
  }
  if (filters?.preparationType) {
    query = query.eq("preparation_type", filters.preparationType);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error("Could not load recipes.");
  }

  return (data as RecipeRow[]).map(toRecipe);
}

/**
 * Fetches a recipe plus signed image URLs for the calendar's quick-view
 * modal (SPEC.md sections 16.2, 12.8). Returns null if the recipe is gone.
 */
export async function getRecipeForModal(recipeId: string): Promise<{
  recipe: RecipeWithIngredients;
  imageUrls: RecipeImageUrls | null;
} | null> {
  const recipe = await getRecipe(recipeId);
  if (!recipe) {
    return null;
  }
  return { recipe, imageUrls: await signRecipeImageUrls(recipe.imageStoragePath) };
}

/** Fetches a single recipe with its ingredients in stored order, or null if it does not exist. */
export async function getRecipe(recipeId: string): Promise<RecipeWithIngredients | null> {
  await requireSession();

  const supabase = getSupabaseClient();
  const { data: recipeRow, error: recipeError } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", recipeId)
    .maybeSingle();

  if (recipeError) {
    throw new Error("Could not load the recipe.");
  }
  if (!recipeRow) {
    return null;
  }

  const { data: ingredientRows, error: ingredientsError } = await supabase
    .from("ingredients")
    .select("*")
    .eq("recipe_id", recipeId)
    .order("sort_order", { ascending: true });

  if (ingredientsError) {
    throw new Error("Could not load the recipe's ingredients.");
  }

  return {
    ...toRecipe(recipeRow as RecipeRow),
    ingredients: (ingredientRows as IngredientRow[]).map(toIngredient),
  };
}

/**
 * Returns whether a recipe is currently assigned to any meal-plan entry.
 * Used to give an eager "this recipe is in use" message before a delete
 * is attempted. The database foreign key is the authoritative guard;
 * see deleteRecipe below for how the race in SPEC.md section 14.4 is
 * handled when an assignment is created after this check runs.
 */
export async function getRecipeUsage(recipeId: string): Promise<{ isUsed: boolean }> {
  await requireSession();

  // Expired meal-plan entries must not count as "in use" (SPEC.md section
  // 19.3); clear them before checking.
  await cleanupExpiredMealPlans();

  const supabase = getSupabaseClient();
  const { count, error } = await supabase
    .from("meal_plan_entries")
    .select("id", { count: "exact", head: true })
    .eq("recipe_id", recipeId);

  if (error) {
    throw new Error("Could not check whether the recipe is in use.");
  }

  return { isUsed: (count ?? 0) > 0 };
}

function readIngredientRows(formData: FormData): { name: string; quantity: string }[] {
  const names = formData.getAll("ingredientName").map((value) => String(value));
  const quantities = formData.getAll("ingredientQuantity").map((value) => String(value));
  return names.map((name, index) => ({
    name,
    quantity: quantities[index] ?? "",
  }));
}

function readFormValues(formData: FormData): RecipeFormValues {
  return {
    title: String(formData.get("title") ?? ""),
    summaryDescription: String(formData.get("summaryDescription") ?? ""),
    sourceUrl: String(formData.get("sourceUrl") ?? ""),
    instructions: String(formData.get("instructions") ?? ""),
    prepTimeCategory: String(formData.get("prepTimeCategory") ?? ""),
    cuisine: String(formData.get("cuisine") ?? ""),
    storageType: String(formData.get("storageType") ?? ""),
    dietType: String(formData.get("dietType") ?? ""),
    childFriendly: String(formData.get("childFriendly") ?? ""),
    preparationType: String(formData.get("preparationType") ?? ""),
    ingredients: readIngredientRows(formData),
  };
}

function parseRecipeForm(formData: FormData) {
  const values = readFormValues(formData);

  // A recipe may have no ingredients at all; the editor still always renders
  // one empty row, so drop rows the user left completely blank before
  // validating. A row with a quantity but no name is kept so it still errors.
  const ingredients = values.ingredients.filter(
    (row) => row.name.trim() !== "" || row.quantity.trim() !== ""
  );

  return {
    values,
    result: recipeInputSchema.safeParse({
      title: values.title,
      summaryDescription: values.summaryDescription,
      sourceUrl: values.sourceUrl,
      instructions: values.instructions,
      prepTimeCategory: values.prepTimeCategory,
      cuisine: values.cuisine,
      storageType: values.storageType,
      dietType: values.dietType,
      childFriendly: values.childFriendly,
      preparationType: values.preparationType,
      ingredients,
    }),
  };
}

/** Splits Zod issues into top-level field errors and per-row ingredient errors. */
function collectFieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {};
  const ingredientErrors: Record<number, string> = {};

  for (const issue of issues) {
    const [first, second] = issue.path;
    if (first === "ingredients") {
      if (typeof second === "number" && !(second in ingredientErrors)) {
        ingredientErrors[second] = issue.message;
      } else if (second === undefined) {
        fieldErrors.ingredients ??= issue.message;
      }
      continue;
    }
    const key = typeof first === "string" ? first : "form";
    fieldErrors[key] ??= issue.message;
  }

  return { fieldErrors, ingredientErrors };
}

function toIngredientPayload(ingredients: IngredientInput[]) {
  return ingredients.map((ingredient) => ({
    name: ingredient.name,
    quantity: ingredient.quantity,
  }));
}

/** A newly selected image file on the form, or null if none was chosen. */
function readNewImageFile(formData: FormData): File | null {
  const value = formData.get("image");
  return value instanceof File && value.size > 0 ? value : null;
}

/**
 * Validates a newly chosen image before the recipe transaction runs, so an
 * unsupported or oversized file blocks the whole save and nothing is
 * persisted (SPEC.md section 13.5). Returns a field error keyed as "image".
 */
function checkImageBeforeSave(formData: FormData): { image?: string } {
  const file = readNewImageFile(formData);
  if (!file) return {};
  const validation = validateImageFile({ type: file.type, size: file.size });
  return validation.ok ? {} : { image: validation.message };
}

export async function createRecipe(
  _prevState: RecipeFormState,
  formData: FormData
): Promise<RecipeFormState> {
  await requireSession();

  const { values, result } = parseRecipeForm(formData);
  const imageError = checkImageBeforeSave(formData);

  if (!result.success || imageError.image) {
    const { fieldErrors, ingredientErrors } = result.success
      ? { fieldErrors: {} as Record<string, string>, ingredientErrors: {} as Record<number, string> }
      : collectFieldErrors(result.error.issues);
    return {
      status: "error",
      message: "The recipe could not be saved. Check the highlighted fields.",
      fieldErrors: { ...fieldErrors, ...imageError },
      ingredientErrors,
      values,
    };
  }

  const supabase = getSupabaseClient();
  const { data: newRecipeId, error } = await supabase.rpc("create_recipe_with_ingredients", {
    recipe: {
      title: result.data.title,
      summaryDescription: result.data.summaryDescription,
      sourceUrl: result.data.sourceUrl,
      prepTimeCategory: result.data.prepTimeCategory,
      cuisine: result.data.cuisine,
      storageType: result.data.storageType,
      dietType: result.data.dietType,
      childFriendly: result.data.childFriendly,
      preparationType: result.data.preparationType,
      instructions: result.data.instructions,
    },
    ingredients: toIngredientPayload(result.data.ingredients),
  });

  if (error || !newRecipeId) {
    return {
      status: "error",
      message: "The recipe could not be saved. Try again.",
      values,
    };
  }

  const createdRecipeId = newRecipeId as string;

  // The recipe transaction has committed; an optional image failure here
  // must not undo it (SPEC.md section 11.7 — the image is optional). The
  // helpers log their own errors. A file the user chose wins over an image
  // discovered by the "import from URL" flow.
  if (readNewImageFile(formData)) {
    await uploadRecipeImage(createdRecipeId, formData);
  } else {
    const importedImageUrl = String(formData.get("importedImageUrl") ?? "").trim();
    if (importedImageUrl) {
      await uploadRecipeImageFromUrl(createdRecipeId, importedImageUrl);
    }
  }

  revalidatePath("/recipes");
  redirect(`/recipes/${createdRecipeId}`);
}

/** Maps a scraped recipe onto the shape the Add Recipe form expects. */
function scrapedToFormValues(recipe: ScrapedRecipe): RecipeFormValues {
  return {
    title: recipe.title ?? "",
    summaryDescription: recipe.summaryDescription ?? "",
    sourceUrl: recipe.sourceUrl,
    instructions: recipe.instructions ?? "",
    prepTimeCategory: recipe.prepTimeCategory ?? "",
    cuisine: recipe.cuisine ?? "",
    storageType: "",
    dietType: recipe.dietType ?? "",
    childFriendly: "",
    preparationType: "",
    ingredients:
      recipe.ingredients.length > 0
        ? recipe.ingredients.map((ingredient) => ({
            name: ingredient.name,
            quantity: ingredient.quantity ?? "",
          }))
        : [{ name: "", quantity: "" }],
  };
}

/**
 * Fetches a recipe web page and returns form values to pre-fill the Add
 * Recipe form. Never writes anything: the user reviews the result and submits
 * the normal create form. On failure the caller falls back to manual entry.
 */
export async function importRecipeFromUrlAction(
  _prevState: ImportRecipeState,
  formData: FormData
): Promise<ImportRecipeState> {
  await requireSession();

  const url = String(formData.get("url") ?? "").trim();
  if (!url) {
    return { status: "error", message: "Enter the address of a recipe page." };
  }

  const outcome = await importRecipeFromUrl(url);
  if (!outcome.ok) {
    return { status: "error", message: outcome.reason, url };
  }

  return {
    status: "success",
    values: scrapedToFormValues(outcome.recipe),
    importedImageUrl: outcome.recipe.imageUrl,
    warnings: outcome.warnings,
  };
}

export async function updateRecipe(
  recipeId: string,
  _prevState: RecipeFormState,
  formData: FormData
): Promise<RecipeFormState> {
  await requireSession();

  const { values, result } = parseRecipeForm(formData);
  const imageError = checkImageBeforeSave(formData);

  if (!result.success || imageError.image) {
    const { fieldErrors, ingredientErrors } = result.success
      ? { fieldErrors: {} as Record<string, string>, ingredientErrors: {} as Record<number, string> }
      : collectFieldErrors(result.error.issues);
    return {
      status: "error",
      message: "The recipe could not be saved. Check the highlighted fields.",
      fieldErrors: { ...fieldErrors, ...imageError },
      ingredientErrors,
      values,
    };
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc("update_recipe_with_ingredients", {
    target_recipe_id: recipeId,
    recipe: {
      title: result.data.title,
      summaryDescription: result.data.summaryDescription,
      sourceUrl: result.data.sourceUrl,
      prepTimeCategory: result.data.prepTimeCategory,
      cuisine: result.data.cuisine,
      storageType: result.data.storageType,
      dietType: result.data.dietType,
      childFriendly: result.data.childFriendly,
      preparationType: result.data.preparationType,
      instructions: result.data.instructions,
    },
    ingredients: toIngredientPayload(result.data.ingredients),
  });

  if (error) {
    return {
      status: "error",
      message: "The recipe could not be saved. Try again.",
      values,
    };
  }

  // Apply the image change after the recipe transaction commits (SPEC.md
  // sections 21.2, 21.3). "Remove" wins over a newly chosen file.
  if (formData.get("removeImage") === "on") {
    await removeRecipeImage(recipeId);
  } else if (readNewImageFile(formData)) {
    await replaceRecipeImage(recipeId, formData);
  }

  // No redirect: the edit form runs both from the detail page and from a
  // modal on the recipe list. Callers close the dialog on "success" and the
  // revalidated route (list or detail) re-renders with the new data.
  revalidatePath("/recipes");
  revalidatePath(`/recipes/${recipeId}`);
  return { status: "success" };
}

/**
 * Deletes an eligible recipe (SPEC.md section 14.2). Ingredients cascade
 * automatically. If a meal-plan entry references the recipe, the foreign
 * key rejects the delete with a 23503 error — this is treated as the
 * authoritative "in use" signal rather than only trusting a prior
 * getRecipeUsage check, which closes the race described in section 14.4.
 */
export async function deleteRecipe(
  _prevState: DeleteRecipeState,
  formData: FormData
): Promise<DeleteRecipeState> {
  await requireSession();

  const recipeId = String(formData.get("recipeId") ?? "");
  if (!recipeId) {
    return { status: "error", message: "The recipe could not be deleted. Try again." };
  }

  // Expired meal-plan entries must never block a delete (SPEC.md section
  // 19.3). Clearing them first also narrows the section 14.4 race window.
  await cleanupExpiredMealPlans();

  const supabase = getSupabaseClient();

  // Capture the image path before the row goes, so its storage object can
  // be cleaned up afterwards (SPEC.md section 21.4).
  const { data: existing } = await supabase
    .from("recipes")
    .select("image_storage_path")
    .eq("id", recipeId)
    .maybeSingle();

  const { error } = await supabase.from("recipes").delete().eq("id", recipeId);

  if (error) {
    if (error.code === FOREIGN_KEY_VIOLATION) {
      return {
        status: "error",
        message:
          "This recipe cannot be deleted because it is used in the meal calendar. Remove it from all planned dates before deleting it.",
      };
    }
    return { status: "error", message: "The recipe could not be deleted. Try again." };
  }

  await deleteRecipeImageObject(
    (existing as { image_storage_path: string | null } | null)?.image_storage_path ?? null
  );

  revalidatePath("/recipes");
  redirect("/recipes");
}
