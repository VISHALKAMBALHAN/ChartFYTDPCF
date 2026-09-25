import { getCurrentFiscalYear, getFYTDPeriods, getPreviousFYTDEndDate, getFiscalQ1Period, getQ1ComparisonPeriods, toDateOnly } from "./FiscalDate";

describe("April 1 fiscal calendar", () => {
  test("September FYTD ends on same prior fiscal day", () => {
    const d = new Date(2026, 8, 16);
    const [current, previous] = getFYTDPeriods(d);
    expect(toDateOnly(current.start)).toBe("2026-04-01");
    expect(toDateOnly(current.end)).toBe("2026-09-16");
    expect(toDateOnly(previous.start)).toBe("2025-04-01");
    expect(toDateOnly(previous.end)).toBe("2025-09-16");
  });

  test("first day of FY remains first day in comparison", () => {
    const d = new Date(2026, 3, 1);
    expect(getCurrentFiscalYear(d)).toBe(2026);
    expect(toDateOnly(getPreviousFYTDEndDate(d))).toBe("2025-04-01");
  });

  test("June 30 has matching prior year month and day", () => {
    const [current, previous] = getFYTDPeriods(new Date(2026, 5, 30));
    expect(toDateOnly(current.end)).toBe("2026-06-30");
    expect(toDateOnly(previous.end)).toBe("2025-06-30");
  });

  test("January belongs to previous calendar year fiscal year even across a leap year", () => {
    const [current, previous] = getFYTDPeriods(new Date(2025, 0, 15));
    expect(toDateOnly(current.start)).toBe("2024-04-01");
    expect(toDateOnly(previous.end)).toBe("2024-01-15");
  });

  test("Q1 calculation for April 1 fiscal calendar spans April 1 to June 30", () => {
    const q1_2026 = getFiscalQ1Period(2026, 4, 1);
    expect(toDateOnly(q1_2026.start)).toBe("2026-04-01");
    expect(toDateOnly(q1_2026.end)).toBe("2026-06-30");

    const [currentQ1, prevQ1] = getQ1ComparisonPeriods(new Date(2026, 8, 24), 4, 1);
    expect(currentQ1.label).toBe("FY2026 Q1");
    expect(toDateOnly(currentQ1.start)).toBe("2026-04-01");
    expect(toDateOnly(currentQ1.end)).toBe("2026-06-30");

    expect(prevQ1.label).toBe("FY2025 Q1");
    expect(toDateOnly(prevQ1.start)).toBe("2025-04-01");
    expect(toDateOnly(prevQ1.end)).toBe("2025-06-30");
  });

  test("Q1 calculation respects dynamic fiscal year start (e.g. Jan 1)", () => {
    const [currentQ1, prevQ1] = getQ1ComparisonPeriods(new Date(2026, 8, 24), 1, 1);
    expect(currentQ1.label).toBe("FY2026 Q1");
    expect(toDateOnly(currentQ1.start)).toBe("2026-01-01");
    expect(toDateOnly(currentQ1.end)).toBe("2026-03-31");

    expect(prevQ1.label).toBe("FY2025 Q1");
    expect(toDateOnly(prevQ1.start)).toBe("2025-01-01");
    expect(toDateOnly(prevQ1.end)).toBe("2025-03-31");
  });
});
