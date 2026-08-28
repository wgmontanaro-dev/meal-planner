import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth/require-session";
import { generateShoppingList } from "@/lib/shopping-list/actions";
import { formatShoppingListText } from "@/lib/shopping-list/build";
import type { ShoppingListOccurrence } from "@/lib/shopping-list/types";
import { formatDateLong } from "@/lib/dates/calendar";
import { Button } from "@/components/ui/button";
import { ShoppingListOutputActions } from "@/components/shopping-list/output-actions";

export const metadata: Metadata = {
  title: "Shopping list — Meal Planner",
};

type DateGroup = { mealDate: string; occurrences: ShoppingListOccurrence[] };

/** Groups the already-sorted occurrence list into consecutive runs by date. */
function groupByDate(occurrences: ShoppingListOccurrence[]): DateGroup[] {
  const groups: DateGroup[] = [];
  for (const occurrence of occurrences) {
    const last = groups[groups.length - 1];
    if (last && last.mealDate === occurrence.mealDate) {
      last.occurrences.push(occurrence);
    } else {
      groups.push({ mealDate: occurrence.mealDate, occurrences: [occurrence] });
    }
  }
  return groups;
}

export default async function ShoppingListPage(props: PageProps<"/shopping-list">) {
  await requireSession();

  const searchParams = await props.searchParams;
  const start = typeof searchParams.start === "string" ? searchParams.start : "";
  const end = typeof searchParams.end === "string" ? searchParams.end : "";

  if (!start || !end) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 sm:p-8">
        <h1 className="text-3xl font-bold tracking-tight">Shopping list</h1>
        <p className="text-sm text-muted-foreground">
          Choose a date range from the calendar to generate a shopping list.
        </p>
        <Button render={<Link href="/calendar" />} className="self-start">
          Back to calendar
        </Button>
      </div>
    );
  }

  const result = await generateShoppingList(start, end);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-8 print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-2" data-print-hidden>
        <h1 className="text-3xl font-bold tracking-tight">Shopping list</h1>
        <Button render={<Link href="/calendar" />} variant="outline" size="sm">
          Back to calendar
        </Button>
      </div>

      {result.status === "error" ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 p-4 text-sm text-destructive"
          data-print-hidden
        >
          {result.message}
        </p>
      ) : result.occurrences.length === 0 ? (
        <p className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
          No library recipes are planned between {formatDateLong(start)} and{" "}
          {formatDateLong(end)}. Manual meals don’t contribute ingredients to the shopping
          list.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          <p className="text-sm text-muted-foreground">
            {formatDateLong(result.startDate)} – {formatDateLong(result.endDate)}
          </p>

          <ShoppingListOutputActions text={formatShoppingListText(result.occurrences)} />

          <div className="flex flex-col gap-8">
            {groupByDate(result.occurrences).map((group) => (
              <section key={group.mealDate} className="flex flex-col gap-4">
                <h2 className="border-b border-border pb-2 font-heading text-sm font-semibold tracking-widest text-primary uppercase">
                  {formatDateLong(group.mealDate)}
                </h2>

                {group.occurrences.map((occurrence, index) => (
                  <div key={index} className="border-l-2 border-border pl-4">
                    <h3 className="mb-2 text-base font-semibold text-foreground">
                      Meal {occurrence.slot}: {occurrence.recipeTitle}
                    </h3>

                    {occurrence.ingredients.length > 0 ? (
                      <ul className="flex flex-col gap-2 text-sm">
                        {occurrence.ingredients.map((ingredient, ingredientIndex) => {
                          const quantity = ingredient.quantity?.trim();
                          return (
                            <li key={ingredientIndex} className="flex items-start gap-3">
                              <span
                                className="mt-0.5 size-4 shrink-0 rounded border border-border"
                                aria-hidden="true"
                              />
                              <span className="text-muted-foreground">
                                {quantity ? `${quantity} ` : ""}
                                <span className="font-medium text-foreground">
                                  {ingredient.name}
                                </span>
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No ingredients recorded for this recipe.
                      </p>
                    )}
                  </div>
                ))}
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
