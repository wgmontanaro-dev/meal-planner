import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/require-session";
import { getMealPlanForMonth } from "@/lib/meal-plans/actions";
import { listRecipes } from "@/lib/recipes/actions";
import {
  getCurrentMonthInLondon,
  getRetentionBoundaryMonth,
  formatMonthYear,
  isValidYearMonth,
} from "@/lib/dates/calendar";
import { MonthNavigation } from "@/components/calendar/month-navigation";
import { CalendarView } from "@/components/calendar/calendar-view";
import { ShoppingListDialog } from "@/components/calendar/shopping-list-dialog";
import type { RecipeSummary } from "@/lib/meal-plans/types";

export const metadata: Metadata = {
  title: "Calendar — Meal Planner",
};

function readYearMonth(
  searchParams: Record<string, string | string[] | undefined>
): { year: number; month: number } {
  const yearParam = searchParams.year;
  const monthParam = searchParams.month;
  const year = typeof yearParam === "string" ? Number(yearParam) : NaN;
  const month = typeof monthParam === "string" ? Number(monthParam) : NaN;

  if (isValidYearMonth(year, month)) {
    return { year, month };
  }
  return getCurrentMonthInLondon();
}

export default async function CalendarPage(props: PageProps<"/calendar">) {
  await requireSession();

  const searchParams = await props.searchParams;
  const { year, month } = readYearMonth(searchParams);

  const boundary = getRetentionBoundaryMonth();
  const isExpiredMonth =
    year < boundary.year || (year === boundary.year && month < boundary.month);

  if (isExpiredMonth) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 sm:p-8">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-3xl font-bold tracking-tight">{formatMonthYear(year, month)}</h1>
        </div>

        <MonthNavigation year={year} month={month} />

        <p className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
          Meal history is retained for the current month and the previous
          three months only. This month is no longer available.
        </p>
      </div>
    );
  }

  const [entries, recipes] = await Promise.all([
    getMealPlanForMonth(year, month),
    listRecipes(),
  ]);

  const recipeSummaries: RecipeSummary[] = recipes.map((recipe) => ({
    id: recipe.id,
    title: recipe.title,
    prepTimeCategory: recipe.prepTimeCategory,
    cuisine: recipe.cuisine,
    storageType: recipe.storageType,
    dietType: recipe.dietType,
    childFriendly: recipe.childFriendly,
    weeknightFavourite: recipe.weeknightFavourite,
    preparationType: recipe.preparationType,
  }));

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl font-bold tracking-tight">{formatMonthYear(year, month)}</h1>
        <ShoppingListDialog />
      </div>

      <MonthNavigation year={year} month={month} />

      <CalendarView year={year} month={month} entries={entries} recipes={recipeSummaries} />
    </div>
  );
}
