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
import { MONTH_NAMES, formatMonthYear, getCurrentMonthInLondon, shiftMonth } from "@/lib/dates/calendar";

// No product-defined navigation limit in Stage 3 (SPEC.md section 15.2) —
// the retention boundary arrives in Stage 4.
const YEAR_RANGE = 10;

function buildYearOptions(selectedYear: number): number[] {
  const { year: currentYear } = getCurrentMonthInLondon();
  const start = Math.min(currentYear - YEAR_RANGE, selectedYear);
  const end = Math.max(currentYear + YEAR_RANGE, selectedYear);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export function MonthNavigation({ year, month }: { year: number; month: number }) {
  const router = useRouter();
  const { year: todayYear, month: todayMonth } = getCurrentMonthInLondon();
  const isCurrentMonth = year === todayYear && month === todayMonth;

  function go(nextYear: number, nextMonth: number) {
    router.push(`/calendar?year=${nextYear}&month=${nextMonth}`);
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
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="icon" aria-label="Previous month" onClick={goToPreviousMonth}>
        <ChevronLeftIcon aria-hidden="true" />
      </Button>
      <Button variant="outline" size="icon" aria-label="Next month" onClick={goToNextMonth}>
        <ChevronRightIcon aria-hidden="true" />
      </Button>
      <Button variant="outline" size="sm" onClick={goToToday} disabled={isCurrentMonth}>
        Today
      </Button>

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
            {buildYearOptions(year).map((optionYear) => (
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
