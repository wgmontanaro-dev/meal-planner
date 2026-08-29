// Shopping-list domain shapes (SPEC.md section 20). The list is grouped by
// planned meal *entry*: one entry per planned recipe or manual occurrence,
// except that the same meal on a run of consecutive dates is consolidated
// into a single entry spanning that inclusive date range.

export type ShoppingListIngredient = {
  name: string;
  quantity: string | null;
};

export type ShoppingListEntry = {
  kind: "recipe" | "manual";
  // Inclusive date range the entry covers. `startDate === endDate` unless
  // the entry was consolidated across consecutive dates.
  startDate: string; // "YYYY-MM-DD"
  endDate: string; // "YYYY-MM-DD"
  // Meal slots the entry occupied across its range, ascending and de-duped.
  slots: (1 | 2)[];
  title: string; // recipe title, or the manual meal title
  // Recipe ingredients in stored order. Always empty for a manual entry,
  // which is rendered as a single "Ingredients for <title>" line instead.
  ingredients: ShoppingListIngredient[];
};

export type ShoppingListResult =
  | {
      status: "ok";
      startDate: string;
      endDate: string;
      entries: ShoppingListEntry[];
    }
  | { status: "error"; message: string };
