import { describe, it, expect } from "vitest";
import {
  STOCK_IMAGE_IDS,
  pickStockImageId,
  stockImageSrc,
  stockImageFor,
  type RecipeImageContext,
} from "./stock-image";

function recipe(overrides: Partial<RecipeImageContext>): RecipeImageContext {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    title: "",
    cuisine: "OTHER",
    dietType: "FLEXIBLE",
    ...overrides,
  };
}

describe("pickStockImageId", () => {
  it("matches on a title keyword ahead of the cuisine fallback", () => {
    // Cuisine THAI would fall back to "stir-fry", but the title wins.
    expect(pickStockImageId(recipe({ title: "Thai Green Curry", cuisine: "THAI" }))).toBe("curry");
    expect(pickStockImageId(recipe({ title: "Spaghetti Bolognese", cuisine: "OTHER" }))).toBe(
      "pasta"
    );
    expect(pickStockImageId(recipe({ title: "Grilled halloumi skewers" }))).toBe("grill");
  });

  it("falls back to a cuisine-appropriate image when the title has no signal", () => {
    expect(pickStockImageId(recipe({ title: "Nonna's Sunday special", cuisine: "ITALIAN" }))).toBe(
      "pasta"
    );
    expect(pickStockImageId(recipe({ title: "House bowl", cuisine: "INDIAN" }))).toBe("curry");
    expect(pickStockImageId(recipe({ title: "Sharing platter", cuisine: "MEXICAN" }))).toBe("tacos");
  });

  it("returns a stable, valid image for a recipe with no usable signal", () => {
    const r = recipe({ title: "Mystery dish", cuisine: "OTHER", id: "abc-123" });
    const first = pickStockImageId(r);
    expect(STOCK_IMAGE_IDS).toContain(first);
    expect(pickStockImageId(r)).toBe(first);
  });

  it("spreads no-signal recipes across the library rather than always the same one", () => {
    const picks = new Set(
      Array.from({ length: 40 }, (_, i) =>
        pickStockImageId(recipe({ id: `recipe-${i}`, title: "x", cuisine: "OTHER" }))
      )
    );
    expect(picks.size).toBeGreaterThan(5);
  });

  it("handles a recipe with no cuisine or diet set", () => {
    const id = pickStockImageId(
      recipe({ title: "Mystery dish", cuisine: null, dietType: null })
    );
    expect(STOCK_IMAGE_IDS).toContain(id);
  });

  it("only ever returns ids that have a matching file", () => {
    for (const cuisine of ["INDIAN", "ITALIAN", "JAPANESE", "OTHER", "FRENCH"] as const) {
      const id = pickStockImageId(recipe({ cuisine, title: "" }));
      expect(STOCK_IMAGE_IDS).toContain(id);
    }
  });
});

describe("stockImageSrc / stockImageFor", () => {
  it("builds a /public path", () => {
    expect(stockImageSrc("curry")).toBe("/stock/curry.svg");
  });

  it("produces a src and descriptive alt", () => {
    const result = stockImageFor(recipe({ title: "Lentil Dhal", cuisine: "INDIAN" }));
    expect(result.src).toBe("/stock/curry.svg");
    expect(result.alt).toContain("Lentil Dhal");
  });
});
