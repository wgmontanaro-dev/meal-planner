import { describe, it, expect } from "vitest";
import {
  assembleShoppingList,
  formatIngredientLine,
  formatShoppingListText,
} from "./build";
import { shoppingListRangeSchema } from "@/lib/validation/shopping-list";

type Entry = Parameters<typeof assembleShoppingList>[0][number];

function recipeEntry(mealDate: string, slot: 1 | 2, recipeId: string): Entry {
  return { mealDate, slot, entryType: "recipe", recipeId };
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
  it("ignores manual meals and keeps only recipe entries", () => {
    const result = assembleShoppingList(
      [
        recipeEntry("2026-09-07", 1, CURRY),
        { mealDate: "2026-09-07", slot: 2, entryType: "manual", recipeId: null },
      ],
      titles,
      ingredients
    );
    expect(result).toHaveLength(1);
    expect(result[0].recipeTitle).toBe("Vegetable Curry");
  });

  it("emits one occurrence per entry — the same recipe on two dates appears twice", () => {
    const result = assembleShoppingList(
      [recipeEntry("2026-09-07", 1, CURRY), recipeEntry("2026-09-09", 2, CURRY)],
      titles,
      ingredients
    );
    expect(result.map((occurrence) => `${occurrence.mealDate}#${occurrence.slot}`)).toEqual([
      "2026-09-07#1",
      "2026-09-09#2",
    ]);
    expect(result.every((occurrence) => occurrence.recipeTitle === "Vegetable Curry")).toBe(true);
  });

  it("sorts occurrences by meal date then slot", () => {
    const result = assembleShoppingList(
      [
        recipeEntry("2026-09-09", 1, SOUP),
        recipeEntry("2026-09-07", 2, CURRY),
        recipeEntry("2026-09-07", 1, SOUP),
      ],
      titles,
      ingredients
    );
    expect(result.map((occurrence) => `${occurrence.mealDate}#${occurrence.slot}`)).toEqual([
      "2026-09-07#1",
      "2026-09-07#2",
      "2026-09-09#1",
    ]);
  });

  it("orders each occurrence's ingredients by stored sort order", () => {
    const [occurrence] = assembleShoppingList(
      [recipeEntry("2026-09-07", 1, CURRY)],
      titles,
      ingredients
    );
    expect(occurrence.ingredients.map((ingredient) => ingredient.name)).toEqual([
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

describe("formatShoppingListText (SPEC 20.4 / 20.8)", () => {
  it("renders occurrence blocks with date, slot, title and bullets", () => {
    const [curry, soup] = assembleShoppingList(
      [recipeEntry("2026-09-07", 1, CURRY), recipeEntry("2026-09-09", 2, SOUP)],
      titles,
      ingredients
    );
    expect(formatShoppingListText([curry, soup])).toBe(
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
