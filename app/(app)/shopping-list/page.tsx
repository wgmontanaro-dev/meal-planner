import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth/require-session";
import { generateShoppingList } from "@/lib/shopping-list/actions";
import {
  formatEntryDateRange,
  formatEntrySlotLabel,
  formatShoppingListText,
} from "@/lib/shopping-list/build";
import type { ShoppingListEntry } from "@/lib/shopping-list/types";
import { formatDateLong } from "@/lib/dates/calendar";
import { Button } from "@/components/ui/button";
import { ShoppingListOutputActions } from "@/components/shopping-list/output-actions";

export const metadata: Metadata = {
  title: "Shopping list — Meal Planner",
};

// A run of consecutive single-date entries shares one date heading; a
// consolidated entry (startDate !== endDate) gets its own section headed
// with the date range (SPEC.md section 20.4).
type Section =
  | { type: "date"; date: string; entries: ShoppingListEntry[] }
  | { type: "range"; entry: ShoppingListEntry };

function groupIntoSections(entries: ShoppingListEntry[]): Section[] {
  const sections: Section[] = [];
  for (const entry of entries) {
    if (entry.startDate !== entry.endDate) {
      sections.push({ type: "range", entry });
      continue;
    }
    const last = sections[sections.length - 1];
    if (last && last.type === "date" && last.date === entry.startDate) {
      last.entries.push(entry);
    } else {
      sections.push({ type: "date", date: entry.startDate, entries: [entry] });
    }
  }
  return sections;
}

function EntryBlock({ entry }: { entry: ShoppingListEntry }) {
  return (
    <div className="border-l-2 border-border pl-4">
      <h3 className="mb-2 text-base font-semibold text-foreground">
        {formatEntrySlotLabel(entry)}: {entry.title}
      </h3>

      {entry.kind === "manual" ? (
        <ul className="flex flex-col gap-2 text-sm">
          <li className="flex items-start gap-3">
            <span
              className="mt-0.5 size-4 shrink-0 rounded border border-border"
              aria-hidden="true"
            />
            <span className="text-muted-foreground">
              Ingredients for{" "}
              <span className="font-medium text-foreground">{entry.title}</span>
            </span>
          </li>
        </ul>
      ) : entry.ingredients.length > 0 ? (
        <ul className="flex flex-col gap-2 text-sm">
          {entry.ingredients.map((ingredient, ingredientIndex) => {
            const quantity = ingredient.quantity?.trim();
            return (
              <li key={ingredientIndex} className="flex items-start gap-3">
                <span
                  className="mt-0.5 size-4 shrink-0 rounded border border-border"
                  aria-hidden="true"
                />
                <span className="text-muted-foreground">
                  {quantity ? `${quantity} ` : ""}
                  <span className="font-medium text-foreground">{ingredient.name}</span>
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
  );
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
      ) : result.entries.length === 0 ? (
        <p className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
          No meals are planned between {formatDateLong(start)} and {formatDateLong(end)}.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          <p className="text-sm text-muted-foreground">
            {formatDateLong(result.startDate)} – {formatDateLong(result.endDate)}
          </p>

          <ShoppingListOutputActions text={formatShoppingListText(result.entries)} />

          <div className="flex flex-col gap-8">
            {groupIntoSections(result.entries).map((section) =>
              section.type === "date" ? (
                <section key={`date-${section.date}`} className="flex flex-col gap-4">
                  <h2 className="border-b border-border pb-2 font-heading text-sm font-semibold tracking-widest text-primary uppercase">
                    {formatDateLong(section.date)}
                  </h2>

                  {section.entries.map((entry, index) => (
                    <EntryBlock key={index} entry={entry} />
                  ))}
                </section>
              ) : (
                <section
                  key={`range-${section.entry.startDate}-${section.entry.endDate}-${section.entry.slots.join("")}-${section.entry.title}`}
                  className="flex flex-col gap-4"
                >
                  <h2 className="border-b border-border pb-2 font-heading text-sm font-semibold tracking-widest text-primary uppercase">
                    {formatEntryDateRange(section.entry)}
                  </h2>

                  <EntryBlock entry={section.entry} />
                </section>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
