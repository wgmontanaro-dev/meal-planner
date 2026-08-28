import { describe, it, expect, vi, beforeEach } from "vitest";
import { getRetentionBoundaryDate } from "@/lib/dates/calendar";

// Supabase query-builder stub: `from(table).delete().lt(col, value)` resolves
// to `{ error }`. `lt` is the leaf the cleanup awaits.
const lt = vi.fn<(column: string, value: string) => Promise<{ error: unknown }>>();
const del = vi.fn(() => ({ lt }));
const from = vi.fn(() => ({ delete: del }));

vi.mock("@/lib/database/client", () => ({
  getSupabaseClient: () => ({ from }),
}));
vi.mock("@/lib/auth/require-session", () => ({
  requireSession: vi.fn(async () => {}),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Imported after the mocks are registered.
const { cleanupExpiredMealPlans } = await import("./actions");

beforeEach(() => {
  from.mockClear();
  del.mockClear();
  lt.mockReset();
  lt.mockResolvedValue({ error: null });
});

describe("cleanupExpiredMealPlans (SPEC 19.3 / 19.4)", () => {
  it("deletes meal_plan_entries strictly before the retention boundary", async () => {
    await cleanupExpiredMealPlans();

    expect(from).toHaveBeenCalledWith("meal_plan_entries");
    expect(del).toHaveBeenCalledTimes(1);
    expect(lt).toHaveBeenCalledWith("meal_date", getRetentionBoundaryDate());
  });

  it("never touches recipes, ingredients or images", async () => {
    await cleanupExpiredMealPlans();

    expect(from).toHaveBeenCalledTimes(1);
    expect(from).not.toHaveBeenCalledWith("recipes");
    expect(from).not.toHaveBeenCalledWith("ingredients");
  });

  it("is idempotent — repeated calls issue the same bounded delete", async () => {
    await cleanupExpiredMealPlans();
    await cleanupExpiredMealPlans();

    expect(lt).toHaveBeenCalledTimes(2);
    expect(lt).toHaveBeenNthCalledWith(1, "meal_date", getRetentionBoundaryDate());
    expect(lt).toHaveBeenNthCalledWith(2, "meal_date", getRetentionBoundaryDate());
  });

  it("swallows a delete error instead of throwing", async () => {
    lt.mockResolvedValue({ error: { message: "db unavailable" } });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(cleanupExpiredMealPlans()).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});
