"use server";

import { requireSession } from "@/lib/auth/require-session";
import { getSupabaseClient } from "@/lib/database/client";
import { isExpiredDate } from "@/lib/dates/calendar";
import type { IngredientRow, MealPlanEntryRow } from "@/lib/database/types";
import { shoppingListRangeSchema } from "@/lib/validation/shopping-list";
import { assembleShoppingList } from "@/lib/shopping-list/build";
import type { ShoppingListResult } from "@/lib/shopping-list/types";

const GENERIC_MESSAGE = "The shopping list could not be generated. Try again.";

/**
 * Derives an occurrence-grouped shopping list for an inclusive date range
 * (SPEC.md section 24.5). All grouping and ordering is done server-side from
 * stored meal-plan and recipe data; nothing client-supplied beyond the two
 * dates is trusted.
 */
export async function generateShoppingList(
  startDate: string,
  endDate: string
): Promise<ShoppingListResult> {
  await requireSession();

  const parsed = shoppingListRangeSchema.safeParse({ startDate, endDate });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? GENERIC_MESSAGE };
  }

  if (isExpiredDate(parsed.data.startDate)) {
    return {
      status: "error",
      message:
        "The start date is outside the retained period — the current month and the previous three months.",
    };
  }

  const supabase = getSupabaseClient();

  const { data: entryRows, error: entriesError } = await supabase
    .from("meal_plan_entries")
    .select("meal_date, slot, entry_type, recipe_id")
    .eq("entry_type", "recipe")
    .gte("meal_date", parsed.data.startDate)
    .lte("meal_date", parsed.data.endDate)
    .order("meal_date", { ascending: true })
    .order("slot", { ascending: true });

  if (entriesError) {
    return { status: "error", message: GENERIC_MESSAGE };
  }

  const entries = (
    entryRows as Pick<MealPlanEntryRow, "meal_date" | "slot" | "entry_type" | "recipe_id">[]
  ).map((row) => ({
    mealDate: row.meal_date,
    slot: row.slot,
    entryType: row.entry_type,
    recipeId: row.recipe_id,
  }));

  const recipeIds = [
    ...new Set(entries.map((entry) => entry.recipeId).filter((id): id is string => id !== null)),
  ];

  const recipeTitlesById = new Map<string, string>();
  const ingredientsByRecipeId = new Map<
    string,
    { name: string; quantity: string | null; sortOrder: number }[]
  >();

  if (recipeIds.length > 0) {
    const [recipesResponse, ingredientsResponse] = await Promise.all([
      supabase.from("recipes").select("id, title").in("id", recipeIds),
      supabase
        .from("ingredients")
        .select("recipe_id, name, quantity, sort_order")
        .in("recipe_id", recipeIds),
    ]);

    if (recipesResponse.error || ingredientsResponse.error) {
      return { status: "error", message: GENERIC_MESSAGE };
    }

    for (const row of recipesResponse.data as { id: string; title: string }[]) {
      recipeTitlesById.set(row.id, row.title);
    }
    for (const row of ingredientsResponse.data as Pick<
      IngredientRow,
      "recipe_id" | "name" | "quantity" | "sort_order"
    >[]) {
      const list = ingredientsByRecipeId.get(row.recipe_id) ?? [];
      list.push({ name: row.name, quantity: row.quantity, sortOrder: row.sort_order });
      ingredientsByRecipeId.set(row.recipe_id, list);
    }
  }

  return {
    status: "ok",
    startDate: parsed.data.startDate,
    endDate: parsed.data.endDate,
    occurrences: assembleShoppingList(entries, recipeTitlesById, ingredientsByRecipeId),
  };
}
