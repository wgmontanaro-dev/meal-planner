import { describe, it, expect, vi, beforeEach } from "vitest";

// A chainable Supabase query-builder stub. Every filter/order method returns
// the same builder; awaiting it resolves to the queued response for its table.
const calls: { table: string; method: string; args: unknown[] }[] = [];
const responseByTable: Record<string, { data: unknown; error: unknown }> = {};

function makeBuilder(table: string) {
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "gte", "lte", "order", "in"]) {
    builder[method] = (...args: unknown[]) => {
      calls.push({ table, method, args });
      return builder;
    };
  }
  builder.then = (resolve: (value: unknown) => unknown) =>
    resolve(responseByTable[table] ?? { data: [], error: null });
  return builder;
}

const from = vi.fn((table: string) => makeBuilder(table));

vi.mock("@/lib/database/client", () => ({ getSupabaseClient: () => ({ from }) }));
vi.mock("@/lib/auth/require-session", () => ({ requireSession: vi.fn(async () => {}) }));

const { generateShoppingList } = await import("./actions");

const CURRY = "11111111-1111-1111-1111-111111111111";

beforeEach(() => {
  calls.length = 0;
  from.mockClear();
  for (const key of Object.keys(responseByTable)) delete responseByTable[key];
});

describe("generateShoppingList (SPEC 20.2 / 20.3 / 24.5)", () => {
  it("queries the range with inclusive bounds and does not filter out manual entries", async () => {
    await generateShoppingList("2026-09-01", "2026-09-30");

    const mealPlanCalls = calls.filter((call) => call.table === "meal_plan_entries");
    expect(mealPlanCalls).not.toContainEqual({
      table: "meal_plan_entries",
      method: "eq",
      args: ["entry_type", "recipe"],
    });
    expect(mealPlanCalls).toContainEqual({
      table: "meal_plan_entries",
      method: "gte",
      args: ["meal_date", "2026-09-01"],
    });
    expect(mealPlanCalls).toContainEqual({
      table: "meal_plan_entries",
      method: "lte",
      args: ["meal_date", "2026-09-30"],
    });
  });

  it("assembles entries joined with recipe titles and ordered ingredients", async () => {
    responseByTable.meal_plan_entries = {
      data: [
        { meal_date: "2026-09-09", slot: 2, entry_type: "recipe", recipe_id: CURRY, manual_title: null },
        { meal_date: "2026-09-07", slot: 1, entry_type: "recipe", recipe_id: CURRY, manual_title: null },
        { meal_date: "2026-09-07", slot: 2, entry_type: "manual", recipe_id: null, manual_title: "Pizza" },
      ],
      error: null,
    };
    responseByTable.recipes = { data: [{ id: CURRY, title: "Vegetable Curry" }], error: null };
    responseByTable.ingredients = {
      data: [
        { recipe_id: CURRY, name: "Chickpeas", quantity: "400g", sort_order: 1 },
        { recipe_id: CURRY, name: "Onions", quantity: "2", sort_order: 0 },
      ],
      error: null,
    };

    const result = await generateShoppingList("2026-09-01", "2026-09-30");

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.entries.map((e) => `${e.startDate}#${e.slots.join("&")}#${e.title}`)).toEqual([
      "2026-09-07#1#Vegetable Curry",
      "2026-09-07#2#Pizza",
      "2026-09-09#2#Vegetable Curry",
    ]);
    expect(result.entries[0].ingredients.map((i) => i.name)).toEqual(["Onions", "Chickpeas"]);
    expect(result.entries[1]).toMatchObject({ kind: "manual", ingredients: [] });
  });

  it("rejects a start date before the retention boundary without querying", async () => {
    const result = await generateShoppingList("2020-01-01", "2026-09-30");
    expect(result.status).toBe("error");
    expect(from).not.toHaveBeenCalled();
  });

  it("rejects a start date after the end date", async () => {
    const result = await generateShoppingList("2026-09-30", "2026-09-01");
    expect(result.status).toBe("error");
    expect(from).not.toHaveBeenCalled();
  });
});
