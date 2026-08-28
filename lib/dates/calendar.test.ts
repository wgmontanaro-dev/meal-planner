import { describe, it, expect } from "vitest";
import {
  getRetentionBoundaryDate,
  getRetentionBoundaryMonth,
  isExpiredDate,
} from "./calendar";

// A fixed instant safely inside a given day, away from DST edges, used to
// drive the injectable clock (SPEC.md section 30.5).
function noonUtc(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

describe("retention boundary (SPEC 19.2)", () => {
  it("is the first day of the current month minus three calendar months", () => {
    expect(getRetentionBoundaryDate(noonUtc(2026, 8, 15))).toBe("2026-05-01");
    expect(getRetentionBoundaryMonth(noonUtc(2026, 8, 15))).toEqual({ year: 2026, month: 5 });
  });

  it("crosses the year boundary when the current month is January", () => {
    expect(getRetentionBoundaryDate(noonUtc(2026, 1, 10))).toBe("2025-10-01");
    expect(getRetentionBoundaryMonth(noonUtc(2026, 1, 10))).toEqual({ year: 2025, month: 10 });
  });

  it("crosses the year boundary for February and March", () => {
    expect(getRetentionBoundaryDate(noonUtc(2026, 2, 1))).toBe("2025-11-01");
    expect(getRetentionBoundaryDate(noonUtc(2026, 3, 31))).toBe("2025-12-01");
  });

  it("stays within the year from April onward", () => {
    expect(getRetentionBoundaryDate(noonUtc(2026, 4, 1))).toBe("2026-01-01");
  });

  it("resolves the current month using the Europe/London calendar date, not UTC", () => {
    // 23:30 UTC on 31 July is 00:30 on 1 August in London (BST, UTC+1), so
    // the current month is August and the boundary is 1 May — not April.
    expect(getRetentionBoundaryDate(new Date("2026-07-31T23:30:00Z"))).toBe("2026-05-01");
    // 23:30 UTC on 31 December is still 31 December in London (GMT), so the
    // current month is December and the boundary is 1 September.
    expect(getRetentionBoundaryDate(new Date("2026-12-31T23:30:00Z"))).toBe("2026-09-01");
  });
});

describe("isExpiredDate (SPEC 19.3 / 19.5 / 30.5)", () => {
  const now = noonUtc(2026, 8, 15); // retention boundary: 2026-05-01

  it("keeps an entry exactly on the boundary", () => {
    expect(isExpiredDate("2026-05-01", now)).toBe(false);
  });

  it("expires an entry one day before the boundary", () => {
    expect(isExpiredDate("2026-04-30", now)).toBe(true);
  });

  it("keeps entries later in the retained window", () => {
    expect(isExpiredDate("2026-08-15", now)).toBe(false);
  });

  it("keeps far-future entries", () => {
    expect(isExpiredDate("2030-01-01", now)).toBe(false);
  });

  it("handles the January year-boundary case", () => {
    const january = noonUtc(2026, 1, 10); // boundary: 2025-10-01
    expect(isExpiredDate("2025-10-01", january)).toBe(false);
    expect(isExpiredDate("2025-09-30", january)).toBe(true);
  });
});
