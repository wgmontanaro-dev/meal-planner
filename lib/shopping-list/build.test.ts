import { describe, it, expect } from "vitest";
import {
  assembleShoppingList,
  formatEntryDateRange,
  formatEntrySlotLabel,
  formatIngredientLine,
  formatShoppingListText,
} from "./build";
import { shoppingListRangeSchema } from "@/lib/validation/shopping-list";

type Entry = Parameters<typeof assembleShoppingList>[0][number];

function recipeEntry(mealDate: string, slot: 1 | 2, recipeId: string): Entry {
  return { mealDate, slot, entryType: "recipe", recipeId, manualTitle: null };
}

function manualEntry(mealDate: string, slot: 1 | 2, manualTitle: string): Entry {
  return { mealDate, slot, entryType: "manual", recipeId: null, manualTitle };
}

const CURRY = "11111111-1111-1111-1111-111111111111";
const SOUP = "22222222-2222-2222-2222-222222222222";

const titles = new Map([
  [CURRY, "Vegetable Curry"],
  [SOUP, "Tomato Soup"],
]);

const ingredients = new Map<string, { name: string; quantity: string | null; sortOrder: number }[]>([
  [
    CURRY,
    [
      { name: "Chickpeas", quantity: "400g", sortOrder: 1 },
      { name: "Onions", quantity: "2", sortOrder: 0 },
      { name: "Fresh coriander", quantity: null, sortOrder: 2 },
    ],
  ],
  [SOUP, [{ name: "Tomatoes", quantity: "1kg", sortOrder: 0 }]],
]);

describe("assembleShoppingList (SPEC 20.3 / 20.4 / 20.6)", () => {
  it("emits one entry per recipe occurrence on non-consecutive dates", () => {
    const result = assembleShoppingList(
      [recipeEntry("2026-09-07", 1, CURRY), recipeEntry("2026-09-09", 2, CURRY)],
      titles,
      ingredients
    );
    expect(
      result.map((entry) => `${entry.startDate}..${entry.endDate}#${entry.slots.join("&")}`)
    ).toEqual(["2026-09-07..2026-09-07#1", "2026-09-09..2026-09-09#2"]);
    expect(result.every((entry) => entry.title === "Vegetable Curry")).toBe(true);
  });

  it("consolidates the same recipe on a run of consecutive dates into one ranged entry", () => {
    const result = assembleShoppingList(
      [
        recipeEntry("2026-08-28", 1, CURRY),
        recipeEntry("2026-08-29", 1, CURRY),
        recipeEntry("2026-08-30", 1, CURRY),
      ],
      titles,
      ingredients
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      kind: "recipe",
      startDate: "2026-08-28",
      endDate: "2026-08-30",
      slots: [1],
      title: "Vegetable Curry",
    });
    // Ingredients appear once, unchanged (no scaling / quantity maths).
    expect(result[0].ingredients).toEqual([
      { name: "Onions", quantity: "2" },
      { name: "Chickpeas", quantity: "400g" },
      { name: "Fresh coriander", quantity: null },
    ]);
  });

  it("records both slots on a consolidated run when they differ across dates", () => {
    const result = assembleShoppingList(
      [recipeEntry("2026-08-28", 2, CURRY), recipeEntry("2026-08-29", 1, CURRY)],
      titles,
      ingredients
    );
    expect(result).toHaveLength(1);
    expect(result[0].slots).toEqual([1, 2]);
    expect(result[0]).toMatchObject({ startDate: "2026-08-28", endDate: "2026-08-29" });
  });

  it("does not consolidate the same recipe in both slots on a single date", () => {
    const result = assembleShoppingList(
      [recipeEntry("2026-08-28", 1, CURRY), recipeEntry("2026-08-28", 2, CURRY)],
      titles,
      ingredients
    );
    expect(result).toHaveLength(2);
    expect(result.map((entry) => entry.slots)).toEqual([[1], [2]]);
    expect(result.every((entry) => entry.startDate === entry.endDate)).toBe(true);
  });

  it("breaks a run when a date is missing", () => {
    const result = assembleShoppingList(
      [
        recipeEntry("2026-08-28", 1, CURRY),
        recipeEntry("2026-08-29", 1, CURRY),
        recipeEntry("2026-08-31", 1, CURRY),
      ],
      titles,
      ingredients
    );
    expect(result.map((entry) => `${entry.startDate}..${entry.endDate}`)).toEqual([
      "2026-08-28..2026-08-29",
      "2026-08-31..2026-08-31",
    ]);
  });

  it("keeps different meals on the same consecutive run separate", () => {
    const result = assembleShoppingList(
      [
        recipeEntry("2026-08-28", 1, CURRY),
        recipeEntry("2026-08-29", 1, CURRY),
        recipeEntry("2026-08-29", 2, SOUP),
      ],
      titles,
      ingredients
    );
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      title: "Vegetable Curry",
      startDate: "2026-08-28",
      endDate: "2026-08-29",
    });
    expect(result[1]).toMatchObject({
      title: "Tomato Soup",
      startDate: "2026-08-29",
      endDate: "2026-08-29",
    });
  });

  it("includes manual meals as a titled entry with no ingredients", () => {
    const result = assembleShoppingList(
      [recipeEntry("2026-09-07", 1, CURRY), manualEntry("2026-09-07", 2, "Pizza")],
      titles,
      ingredients
    );
    expect(result).toHaveLength(2);
    expect(result[1]).toMatchObject({ kind: "manual", title: "Pizza", ingredients: [] });
  });

  it("consolidates the same manual meal across consecutive dates, ignoring case and spacing", () => {
    const result = assembleShoppingList(
      [manualEntry("2026-08-28", 1, "Pizza"), manualEntry("2026-08-29", 1, "  pizza ")],
      titles,
      ingredients
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      kind: "manual",
      title: "Pizza",
      startDate: "2026-08-28",
      endDate: "2026-08-29",
    });
  });

  it("skips manual meals with a blank title", () => {
    const result = assembleShoppingList([manualEntry("2026-09-07", 1, "   ")], titles, ingredients);
    expect(result).toEqual([]);
  });

  it("sorts entries by start date, then single-date before ranged, then slot", () => {
    const result = assembleShoppingList(
      [
        recipeEntry("2026-09-07", 1, CURRY),
        recipeEntry("2026-09-08", 1, CURRY),
        recipeEntry("2026-09-07", 2, SOUP),
      ],
      titles,
      ingredients
    );
    expect(
      result.map((entry) => `${entry.startDate}..${entry.endDate}#${entry.slots.join("&")}`)
    ).toEqual(["2026-09-07..2026-09-07#2", "2026-09-07..2026-09-08#1"]);
  });

  it("orders each entry's ingredients by stored sort order", () => {
    const [entry] = assembleShoppingList([recipeEntry("2026-09-07", 1, CURRY)], titles, ingredients);
    expect(entry.ingredients.map((ingredient) => ingredient.name)).toEqual([
      "Onions",
      "Chickpeas",
      "Fresh coriander",
    ]);
  });

  it("skips entries whose recipe is no longer present", () => {
    const result = assembleShoppingList(
      [recipeEntry("2026-09-07", 1, "deleted-recipe-id")],
      titles,
      ingredients
    );
    expect(result).toEqual([]);
  });

  it("returns an empty list for no entries", () => {
    expect(assembleShoppingList([], titles, ingredients)).toEqual([]);
  });
});

describe("formatIngredientLine (SPEC 20.5)", () => {
  it("prefixes the quantity when one exists", () => {
    expect(formatIngredientLine({ name: "Onions", quantity: "2" })).toBe("2 Onions");
  });

  it("is just the name when the quantity is missing or blank", () => {
    expect(formatIngredientLine({ name: "Fresh coriander", quantity: null })).toBe(
      "Fresh coriander"
    );
    expect(formatIngredientLine({ name: "Salt", quantity: "   " })).toBe("Salt");
  });
});

describe("formatEntryDateRange / formatEntrySlotLabel (SPEC 20.4)", () => {
  const [ranged] = assembleShoppingList(
    [recipeEntry("2026-08-28", 2, CURRY), recipeEntry("2026-08-29", 1, CURRY)],
    titles,
    ingredients
  );

  it("shows a single long date when start and end match", () => {
    const [single] = assembleShoppingList([recipeEntry("2026-08-28", 1, CURRY)], titles, ingredients);
    expect(formatEntryDateRange(single)).toBe("Friday, 28 August 2026");
  });

  it("shows start – end for a consolidated run", () => {
    expect(formatEntryDateRange(ranged)).toBe("Friday, 28 August 2026 – Saturday, 29 August 2026");
  });

  it("labels one or both meal slots", () => {
    expect(formatEntrySlotLabel(ranged)).toBe("Meals 1 & 2");
    const [single] = assembleShoppingList([recipeEntry("2026-08-28", 1, CURRY)], titles, ingredients);
    expect(formatEntrySlotLabel(single)).toBe("Meal 1");
  });
});

describe("formatShoppingListText (SPEC 20.4 / 20.8)", () => {
  it("renders entry blocks with date, slot, title and bullets", () => {
    const entries = assembleShoppingList(
      [recipeEntry("2026-09-07", 1, CURRY), recipeEntry("2026-09-09", 2, SOUP)],
      titles,
      ingredients
    );
    expect(formatShoppingListText(entries)).toBe(
      [
        "Monday, 7 September 2026",
        "Meal 1: Vegetable Curry",
        "",
        "• 2 Onions",
        "• 400g Chickpeas",
        "• Fresh coriander",
        "",
        "",
        "Wednesday, 9 September 2026",
        "Meal 2: Tomato Soup",
        "",
        "• 1kg Tomatoes",
      ].join("\n")
    );
  });

  it("renders a consolidated run with a date range and one ingredient list", () => {
    const entries = assembleShoppingList(
      [recipeEntry("2026-08-28", 1, SOUP), recipeEntry("2026-08-29", 1, SOUP)],
      titles,
      ingredients
    );
    expect(formatShoppingListText(entries)).toBe(
      [
        "Friday, 28 August 2026 – Saturday, 29 August 2026",
        "Meal 1: Tomato Soup",
        "",
        "• 1kg Tomatoes",
      ].join("\n")
    );
  });

  it("renders a manual meal as a single 'Ingredients for' bullet", () => {
    const entries = assembleShoppingList([manualEntry("2026-09-07", 1, "Pizza")], titles, ingredients);
    expect(formatShoppingListText(entries)).toBe(
      ["Monday, 7 September 2026", "Meal 1: Pizza", "", "• Ingredients for Pizza"].join("\n")
    );
  });

  it("returns an empty string for an empty list", () => {
    expect(formatShoppingListText([])).toBe("");
  });
});

describe("shoppingListRangeSchema (SPEC 20.2)", () => {
  it("accepts an equal start and end date (inclusive)", () => {
    expect(
      shoppingListRangeSchema.safeParse({ startDate: "2026-09-07", endDate: "2026-09-07" }).success
    ).toBe(true);
  });

  it("rejects a start date after the end date", () => {
    const parsed = shoppingListRangeSchema.safeParse({
      startDate: "2026-09-10",
      endDate: "2026-09-07",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a malformed date", () => {
    expect(
      shoppingListRangeSchema.safeParse({ startDate: "2026-13-01", endDate: "2026-09-07" }).success
    ).toBe(false);
  });
});
