"use client";

import { useRouter } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MONTH_NAMES,
  formatMonthYear,
  getCurrentMonthInLondon,
  getRetentionBoundaryMonth,
  shiftMonth,
} from "@/lib/dates/calendar";

const YEAR_RANGE = 10;

/** True when {year, month} is strictly before the retention boundary month. */
function isBeforeMonth(year: number, month: number, boundary: { year: number; month: number }): boolean {
  return year < boundary.year || (year === boundary.year && month < boundary.month);
}

function buildYearOptions(selectedYear: number, boundaryYear: number): number[] {
  const { year: currentYear } = getCurrentMonthInLondon();
  // Never offer a year wholly before the retention boundary (SPEC.md
  // section 19.5); still include selectedYear if a stale URL lands earlier.
  const start = Math.min(Math.max(currentYear - YEAR_RANGE, boundaryYear), selectedYear);
  const end = Math.max(currentYear + YEAR_RANGE, selectedYear);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export function MonthNavigation({ year, month }: { year: number; month: number }) {
  const router = useRouter();
  const { year: todayYear, month: todayMonth } = getCurrentMonthInLondon();
  const isCurrentMonth = year === todayYear && month === todayMonth;

  const boundary = getRetentionBoundaryMonth();
  const previous = shiftMonth(year, month, -1);
  // Backward navigation stops once the previous month would fall into
  // expired history (SPEC.md section 19.5).
  const backwardDisabled = isBeforeMonth(previous.year, previous.month, boundary);

  // Clamp any navigation target to the retention boundary (SPEC.md section
  // 19.5) so the month/year selects can't jump into expired history.
  function go(nextYear: number, nextMonth: number) {
    let targetYear = nextYear;
    let targetMonth = nextMonth;
    if (isBeforeMonth(targetYear, targetMonth, boundary)) {
      targetYear = boundary.year;
      targetMonth = boundary.month;
    }
    router.push(`/calendar?year=${targetYear}&month=${targetMonth}`);
  }

  function goToPreviousMonth() {
    const next = shiftMonth(year, month, -1);
    go(next.year, next.month);
  }

  function goToNextMonth() {
    const next = shiftMonth(year, month, 1);
    go(next.year, next.month);
  }

  function goToToday() {
    go(todayYear, todayMonth);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1 rounded-full border border-border bg-muted p-1">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Previous month"
          onClick={goToPreviousMonth}
          disabled={backwardDisabled}
          title={
            backwardDisabled
              ? "Meal history is kept for the current month and the previous three months."
              : undefined
          }
        >
          <ChevronLeftIcon aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={goToToday}
          disabled={isCurrentMonth}
          className="px-3"
        >
          Today
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label="Next month" onClick={goToNextMonth}>
          <ChevronRightIcon aria-hidden="true" />
        </Button>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Select
          value={String(month)}
          onValueChange={(value) => go(year, Number(value))}
        >
          <SelectTrigger aria-label="Month" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTH_NAMES.map((name, index) => (
              <SelectItem key={name} value={String(index + 1)}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={(value) => go(Number(value), month)}>
          <SelectTrigger aria-label="Year" className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {buildYearOptions(year, boundary.year).map((optionYear) => (
              <SelectItem key={optionYear} value={String(optionYear)}>
                {optionYear}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <span className="sr-only" aria-live="polite">
        {formatMonthYear(year, month)}
      </span>
    </div>
  );
}
