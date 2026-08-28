// Calendar-month helpers for the meal-plan calendar (SPEC.md section 15).
// Meal dates are stored and passed as date-only "YYYY-MM-DD" strings
// throughout the application — never as Date objects — to avoid the UTC
// conversion drift the spec warns against (SPEC.md section 15.3).
//
// "Today" is resolved in the Europe/London timezone (SPEC.md section 15.1).
// All other date math (building a month grid, formatting a given date) is
// pure calendar arithmetic with no real-world timezone meaning, so it uses
// Date.UTC()/getUTCDate() purely as a deterministic day-counting mechanism,
// formatted with timeZone: "UTC" to match.

const LONDON_TIME_ZONE = "Europe/London";

export type YearMonth = { year: number; month: number };

export function getTodayIsoDateLondon(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: LONDON_TIME_ZONE }).format(new Date());
}

export function getCurrentMonthInLondon(): YearMonth {
  const [year, month] = getTodayIsoDateLondon().split("-").map(Number);
  return { year, month };
}

export function shiftMonth(year: number, month: number, delta: number): YearMonth {
  const zeroBased = month - 1 + delta;
  const newYear = year + Math.floor(zeroBased / 12);
  const newMonth = (((zeroBased % 12) + 12) % 12) + 1;
  return { year: newYear, month: newMonth };
}

export function isValidYearMonth(year: number, month: number): boolean {
  return (
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    month >= 1 &&
    month <= 12 &&
    year >= 1970 &&
    year <= 9999
  );
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function monthBounds(year: number, month: number): { start: string; end: string } {
  return { start: toIsoDate(year, month, 1), end: toIsoDate(year, month, daysInMonth(year, month)) };
}

export function listDatesInMonth(year: number, month: number): string[] {
  const total = daysInMonth(year, month);
  return Array.from({ length: total }, (_, index) => toIsoDate(year, month, index + 1));
}

/** Number of empty leading cells before day 1 in a Monday-first week grid. */
export function mondayFirstLeadingBlanks(year: number, month: number): number {
  const jsWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); // 0 = Sunday
  return (jsWeekday + 6) % 7; // 0 = Monday
}

function parseIsoDateAsUtc(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatMonthYear(year: number, month: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

/** e.g. "Mon 3 Sep" — used in the mobile agenda. */
export function formatAgendaDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(parseIsoDateAsUtc(isoDate));
}

/** e.g. "Monday, 3 September 2026" — used in dialog titles and aria-labels. */
export function formatDateLong(isoDate: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(parseIsoDateAsUtc(isoDate));
}

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;
