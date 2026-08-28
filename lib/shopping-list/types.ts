// Shopping-list domain shapes (SPEC.md section 20). The list is grouped by
// planned recipe *occurrence*, never de-duplicated by recipe.

export type ShoppingListIngredient = {
  name: string;
  quantity: string | null;
};

export type ShoppingListOccurrence = {
  mealDate: string; // "YYYY-MM-DD"
  slot: 1 | 2;
  recipeTitle: string;
  ingredients: ShoppingListIngredient[];
};

export type ShoppingListResult =
  | {
      status: "ok";
      startDate: string;
      endDate: string;
      occurrences: ShoppingListOccurrence[];
    }
  | { status: "error"; message: string };
