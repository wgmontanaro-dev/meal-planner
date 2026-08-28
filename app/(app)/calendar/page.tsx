import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/require-session";
import { getMealPlanForMonth } from "@/lib/meal-plans/actions";
import { listRecipes } from "@/lib/recipes/actions";
import { getCurrentMonthInLondon, formatMonthYear, isValidYearMonth } from "@/lib/dates/calendar";
import { MonthNavigation } from "@/components/calendar/month-navigation";
import { CalendarView } from "@/components/calendar/calendar-view";
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
    preparationType: recipe.preparationType,
  }));

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{formatMonthYear(year, month)}</h1>
      </div>

      <MonthNavigation year={year} month={month} />

      <CalendarView year={year} month={month} entries={entries} recipes={recipeSummaries} />
    </div>
  );
}
