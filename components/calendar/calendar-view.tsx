"use client";

import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
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
  const captionColor = slot === 1 ? "text-primary" : "text-terracotta";
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
      className={cn(
        "group/slot flex w-full flex-col gap-0.5 rounded-lg px-2 py-1.5 text-left transition-colors",
        isEmpty
          ? "border-2 border-dashed border-border hover:border-primary"
          : "border border-border bg-card hover:border-primary"
      )}
      title={isEmpty ? undefined : entryLabel(entry)}
    >
      <span className={cn("text-[0.6rem] font-semibold tracking-wide uppercase", captionColor)}>
        {label}
      </span>
      {isEmpty ? (
        <span className="flex items-center gap-1 text-xs text-muted-foreground group-hover/slot:text-primary">
          <Plus className="size-3" aria-hidden="true" />
          Add meal
        </span>
      ) : (
        <span className="line-clamp-2 text-xs font-semibold text-foreground group-hover/slot:text-primary">
          {entryLabel(entry)}
        </span>
      )}
    </button>
  );
}

function AgendaRow({
  mealDate,
  isToday,
  entryFor,
  onSelect,
  rowRef,
}: {
  mealDate: string;
  isToday: boolean;
  entryFor: (slot: 1 | 2) => MealPlanEntryWithRecipe | undefined;
  onSelect: (selected: SelectedSlot) => void;
  rowRef?: React.Ref<HTMLLIElement>;
}) {
  return (
    <li
      ref={rowRef}
      className={cn(
        "flex scroll-mt-4 flex-col gap-2 rounded-xl border bg-background p-3",
        isToday ? "border-2 border-primary" : "border-border"
      )}
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
      className={cn(
        "flex min-h-32 flex-col gap-1.5 rounded-xl border bg-background p-2.5",
        isToday ? "border-2 border-primary" : "border-border"
      )}
    >
      <div className="flex items-center justify-between">
        <span className={cn("text-sm font-medium", !isToday && "text-muted-foreground")}>
          {dayNumber}
        </span>
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
  const todayRowRef = useRef<HTMLLIElement>(null);

  // On the mobile agenda, land on today's row rather than the 1st when the
  // month being shown is the one that contains today (SPEC.md section 15.5).
  // The ref is only attached to that row, so it is null in any other month.
  useEffect(() => {
    const row = todayRowRef.current;
    if (!row || !window.matchMedia("(max-width: 639px)").matches) return;
    row.scrollIntoView({ block: "start" });
  }, [year, month]);

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
            rowRef={mealDate === today ? todayRowRef : undefined}
          />
        ))}
      </ul>

      {/* Tablet and desktop: seven-column Monday-first grid. */}
      <div className="hidden sm:block">
        <div className="grid grid-cols-7 gap-3">
          {WEEKDAY_HEADINGS.map((heading) => (
            <div
              key={heading}
              className="text-center text-xs font-semibold tracking-wide text-muted-foreground uppercase"
            >
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
