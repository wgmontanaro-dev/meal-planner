"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/require-session";
import { getSupabaseClient } from "@/lib/database/client";
import {
  toMealPlanEntry,
  type MealPlanEntryRow,
  type MealPlanEntryWithRecipe,
} from "@/lib/database/types";
import {
  monthBounds,
  isValidYearMonth,
  getRetentionBoundaryDate,
  isExpiredDate,
} from "@/lib/dates/calendar";
import {
  setManualMealSchema,
  setRecipeMealSchema,
  removeMealSchema,
} from "@/lib/validation/meal-plan";
import type { MealSlotState } from "@/lib/meal-plans/types";

// Postgres error codes that indicate the slot changed under us between load
// and write (recipe deleted concurrently, or a conflicting shape) — see
// SPEC.md section 22.3.
const FOREIGN_KEY_VIOLATION = "23503";
const CHECK_VIOLATION = "23514";

const CONFLICT_MESSAGE =
  "The selected meal slot was changed elsewhere. The calendar has been refreshed.";
const GENERIC_MESSAGE = "The meal could not be saved. Try again.";
const EXPIRED_DATE_MESSAGE =
  "That date is outside the retained period — the current month and the previous three months — and can no longer be changed.";

/**
 * Retrieves every meal-plan entry for a calendar month (SPEC.md section
 * 24.4), joined in application code with the current title of each
 * referenced recipe so calendar displays always reflect edits made after
 * the meal was assigned (SPEC.md section 16.2).
 */
export async function getMealPlanForMonth(
  year: number,
  month: number
): Promise<MealPlanEntryWithRecipe[]> {
  await requireSession();

  if (!isValidYearMonth(year, month)) {
    throw new Error("Invalid year or month.");
  }

  const supabase = getSupabaseClient();
  const { start, end } = monthBounds(year, month);

  const { data: entryRows, error: entriesError } = await supabase
    .from("meal_plan_entries")
    .select("*")
    .gte("meal_date", start)
    .lte("meal_date", end);

  if (entriesError) {
    console.error("getMealPlanForMonth: meal_plan_entries query failed", entriesError);
    throw new Error("Could not load the meal plan.");
  }

  const entries = (entryRows as MealPlanEntryRow[]).map(toMealPlanEntry);
  const recipeIds = [...new Set(entries.map((entry) => entry.recipeId).filter((id) => id !== null))];

  let titlesById = new Map<string, string>();
  if (recipeIds.length > 0) {
    const { data: recipeRows, error: recipesError } = await supabase
      .from("recipes")
      .select("id, title")
      .in("id", recipeIds);

    if (recipesError) {
      throw new Error("Could not load the meal plan.");
    }

    titlesById = new Map((recipeRows as { id: string; title: string }[]).map((row) => [row.id, row.title]));
  }

  return entries.map((entry) => ({
    ...entry,
    recipeTitle: entry.recipeId ? (titlesById.get(entry.recipeId) ?? null) : null,
  }));
}

/**
 * Idempotently deletes meal-plan entries whose date is before the retention
 * boundary (SPEC.md sections 19.3–19.4). Recipes, ingredients and recipe
 * images are never touched. Invoked as a side effect of meal-plan mutations
 * and of the recipe-deletion path; failures are logged and swallowed so a
 * housekeeping error never surfaces to the user mid-action.
 */
export async function cleanupExpiredMealPlans(): Promise<void> {
  await requireSession();

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("meal_plan_entries")
    .delete()
    .lt("meal_date", getRetentionBoundaryDate());

  if (error) {
    console.error("cleanupExpiredMealPlans: delete failed", error);
  }
}

function readFieldsFromFormData(formData: FormData) {
  return {
    mealDate: String(formData.get("mealDate") ?? ""),
    slot: String(formData.get("slot") ?? ""),
  };
}

/** Sets or replaces a slot with a library recipe (SPEC.md sections 16.2, 24.4). */
export async function setRecipeMeal(
  _prevState: MealSlotState,
  formData: FormData
): Promise<MealSlotState> {
  await requireSession();

  const result = setRecipeMealSchema.safeParse({
    ...readFieldsFromFormData(formData),
    recipeId: String(formData.get("recipeId") ?? ""),
  });

  if (!result.success) {
    return { status: "error", message: "Choose a recipe to assign to this meal." };
  }

  if (isExpiredDate(result.data.mealDate)) {
    return { status: "error", message: EXPIRED_DATE_MESSAGE };
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase.from("meal_plan_entries").upsert(
    {
      meal_date: result.data.mealDate,
      slot: result.data.slot,
      entry_type: "recipe",
      recipe_id: result.data.recipeId,
      manual_title: null,
    },
    { onConflict: "meal_date,slot" }
  );

  if (error) {
    const message =
      error.code === FOREIGN_KEY_VIOLATION || error.code === CHECK_VIOLATION
        ? CONFLICT_MESSAGE
        : GENERIC_MESSAGE;
    return { status: "error", message };
  }

  await cleanupExpiredMealPlans();
  revalidatePath("/calendar");
  return { status: "success" };
}

/** Sets or replaces a slot with a manual meal title (SPEC.md sections 17, 24.4). */
export async function setManualMeal(
  _prevState: MealSlotState,
  formData: FormData
): Promise<MealSlotState> {
  await requireSession();

  const rawManualTitle = String(formData.get("manualTitle") ?? "");
  const result = setManualMealSchema.safeParse({
    ...readFieldsFromFormData(formData),
    manualTitle: rawManualTitle,
  });

  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const [first] = issue.path;
      if (first === "manualTitle") {
        fieldErrors.manualTitle ??= issue.message;
      }
    }
    return {
      status: "error",
      message: "The meal could not be saved. Check the highlighted field.",
      fieldErrors,
    };
  }

  if (isExpiredDate(result.data.mealDate)) {
    return { status: "error", message: EXPIRED_DATE_MESSAGE };
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase.from("meal_plan_entries").upsert(
    {
      meal_date: result.data.mealDate,
      slot: result.data.slot,
      entry_type: "manual",
      recipe_id: null,
      manual_title: result.data.manualTitle,
    },
    { onConflict: "meal_date,slot" }
  );

  if (error) {
    const message = error.code === CHECK_VIOLATION ? CONFLICT_MESSAGE : GENERIC_MESSAGE;
    return { status: "error", message };
  }

  await cleanupExpiredMealPlans();
  revalidatePath("/calendar");
  return { status: "success" };
}

/** Removes a meal-plan entry for a single date and slot (SPEC.md section 18.3). Never deletes a recipe. */
export async function removeMeal(
  _prevState: MealSlotState,
  formData: FormData
): Promise<MealSlotState> {
  await requireSession();

  const result = removeMealSchema.safeParse(readFieldsFromFormData(formData));
  if (!result.success) {
    return { status: "error", message: GENERIC_MESSAGE };
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("meal_plan_entries")
    .delete()
    .eq("meal_date", result.data.mealDate)
    .eq("slot", result.data.slot);

  if (error) {
    return { status: "error", message: GENERIC_MESSAGE };
  }

  await cleanupExpiredMealPlans();
  revalidatePath("/calendar");
  return { status: "success" };
}
