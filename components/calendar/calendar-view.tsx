"use client";

import { useState } from "react";
import {
  formatAgendaDate,
  getTodayIsoDateLondon,
  listDatesInMonth,
  mondayFirstLeadingBlanks,
} from "@/lib/dates/calendar";
import { MealSlotDialog, type SelectedSlot } from "@/components/calendar/meal-slot-dialog";
import type { MealPlanEntryWithRecipe } from "@/lib/database/types";
import type { RecipeSummary } from "@/lib/meal-plans/types";

const WEEKDAY_HEADINGS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function entryLabel(entry: MealPlanEntryWithRecipe | undefined): string {
  if (!entry) return "";
  if (entry.entryType === "recipe") {
    return entry.recipeTitle ?? "";
  }
  return entry.manualTitle ?? "";
}

function buildEntryMap(
  entries: MealPlanEntryWithRecipe[]
): Map<string, MealPlanEntryWithRecipe> {
  return new Map(entries.map((entry) => [`${entry.mealDate}-${entry.slot}`, entry]));
}

function SlotButton({
  mealDate,
  slot,
  entry,
  onSelect,
}: {
  mealDate: string;
  slot: 1 | 2;
  entry: MealPlanEntryWithRecipe | undefined;
  onSelect: (selected: SelectedSlot) => void;
}) {
  const label = slot === 1 ? "Meal 1" : "Meal 2";
  const isEmpty = !entry;

  return (
    <button
      type="button"
      onClick={() => onSelect({ mealDate, slot, entry: entry ?? null })}
      aria-label={
        isEmpty
          ? `${label}, empty — add a meal`
          : `${label}, ${entryLabel(entry)} — view or change`
      }
      className={
        isEmpty
          ? "w-full truncate rounded-md border border-dashed border-border px-2 py-1 text-left text-xs text-muted-foreground hover:border-foreground/40 hover:text-foreground"
          : "w-full truncate rounded-md border border-border bg-muted px-2 py-1 text-left text-xs font-medium hover:bg-muted/70"
      }
      title={isEmpty ? undefined : entryLabel(entry)}
    >
      <span className="block text-[0.65rem] font-normal text-muted-foreground">{label}</span>
      {isEmpty ? "Add meal" : <span className="truncate">{entryLabel(entry)}</span>}
    </button>
  );
}

function AgendaRow({
  mealDate,
  isToday,
  entryFor,
  onSelect,
}: {
  mealDate: string;
  isToday: boolean;
  entryFor: (slot: 1 | 2) => MealPlanEntryWithRecipe | undefined;
  onSelect: (selected: SelectedSlot) => void;
}) {
  return (
    <li
      className={
        isToday
          ? "flex flex-col gap-2 rounded-lg border-2 border-primary p-3"
          : "flex flex-col gap-2 rounded-lg border border-border p-3"
      }
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{formatAgendaDate(mealDate)}</span>
        {isToday ? (
          <span className="rounded-full bg-primary px-2 py-0.5 text-[0.65rem] font-medium text-primary-foreground">
            Today
          </span>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <SlotButton mealDate={mealDate} slot={1} entry={entryFor(1)} onSelect={onSelect} />
        <SlotButton mealDate={mealDate} slot={2} entry={entryFor(2)} onSelect={onSelect} />
      </div>
    </li>
  );
}

function GridCell({
  mealDate,
  dayNumber,
  isToday,
  entryFor,
  onSelect,
}: {
  mealDate: string;
  dayNumber: number;
  isToday: boolean;
  entryFor: (slot: 1 | 2) => MealPlanEntryWithRecipe | undefined;
  onSelect: (selected: SelectedSlot) => void;
}) {
  return (
    <div
      className={
        isToday
          ? "flex min-h-28 flex-col gap-1 rounded-lg border-2 border-primary p-2"
          : "flex min-h-28 flex-col gap-1 rounded-lg border border-border p-2"
      }
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{dayNumber}</span>
        {isToday ? (
          <span className="rounded-full bg-primary px-1.5 py-0.5 text-[0.6rem] font-medium text-primary-foreground">
            Today
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <SlotButton mealDate={mealDate} slot={1} entry={entryFor(1)} onSelect={onSelect} />
        <SlotButton mealDate={mealDate} slot={2} entry={entryFor(2)} onSelect={onSelect} />
      </div>
    </div>
  );
}

export function CalendarView({
  year,
  month,
  entries,
  recipes,
}: {
  year: number;
  month: number;
  entries: MealPlanEntryWithRecipe[];
  recipes: RecipeSummary[];
}) {
  const [selected, setSelected] = useState<SelectedSlot | null>(null);
  const dates = listDatesInMonth(year, month);
  const entryMap = buildEntryMap(entries);
  const today = getTodayIsoDateLondon();
  const leadingBlanks = mondayFirstLeadingBlanks(year, month);

  function entryFor(mealDate: string, slot: 1 | 2) {
    return entryMap.get(`${mealDate}-${slot}`);
  }

  // Keep the open dialogue's entry in sync after a successful mutation
  // revalidates this page's data, rather than closing and reopening it.
  const liveSelected: SelectedSlot | null = selected
    ? { ...selected, entry: entryFor(selected.mealDate, selected.slot) ?? null }
    : null;

  return (
    <>
      {/* Mobile: vertical agenda, every date in the month. */}
      <ul className="flex flex-col gap-2 sm:hidden">
        {dates.map((mealDate) => (
          <AgendaRow
            key={mealDate}
            mealDate={mealDate}
            isToday={mealDate === today}
            entryFor={(slot) => entryFor(mealDate, slot)}
            onSelect={setSelected}
          />
        ))}
      </ul>

      {/* Tablet and desktop: seven-column Monday-first grid. */}
      <div className="hidden sm:block">
        <div className="grid grid-cols-7 gap-2">
          {WEEKDAY_HEADINGS.map((heading) => (
            <div key={heading} className="text-center text-xs font-medium text-muted-foreground">
              {heading}
            </div>
          ))}
          {Array.from({ length: leadingBlanks }, (_, index) => (
            <div key={`blank-${index}`} aria-hidden="true" />
          ))}
          {dates.map((mealDate, index) => (
            <GridCell
              key={mealDate}
              mealDate={mealDate}
              dayNumber={index + 1}
              isToday={mealDate === today}
              entryFor={(slot) => entryFor(mealDate, slot)}
              onSelect={setSelected}
            />
          ))}
        </div>
      </div>

      <MealSlotDialog
        selected={liveSelected}
        recipes={recipes}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </>
  );
}
