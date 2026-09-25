import { FiscalPeriod } from "../models/Types";

/** Dates are calendar dates; local construction prevents DateOnly values drifting by UTC offset. */
export function dateAtMidnight(year: number, monthIndex: number, day: number): Date {
  return new Date(year, monthIndex, day);
}

export function toDateOnly(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

export function getCurrentFiscalYear(today: Date = new Date(), startMonth = 4, startDay = 1): number {
  const startThisCalendarYear = dateAtMidnight(today.getFullYear(), startMonth - 1, startDay);
  return today >= startThisCalendarYear ? today.getFullYear() : today.getFullYear() - 1;
}

export function getFiscalYearStart(fiscalYear: number, startMonth = 4, startDay = 1): Date {
  return dateAtMidnight(fiscalYear, startMonth - 1, startDay);
}

export function getFiscalYearEnd(fiscalYear: number, startMonth = 4, startDay = 1): Date {
  return dateAtMidnight(fiscalYear + 1, startMonth - 1, startDay - 1);
}

export function getPreviousFiscalYear(currentFiscalYear: number): number {
  return currentFiscalYear - 1;
}

export function getFiscalDayNumber(today: Date = new Date(), startMonth = 4, startDay = 1): number {
  const start = getFiscalYearStart(getCurrentFiscalYear(today, startMonth, startDay), startMonth, startDay);
  return Math.floor((dateAtMidnight(today.getFullYear(), today.getMonth(), today.getDate()).getTime() - start.getTime()) / 86400000) + 1;
}

export function getFYTDStartDate(today = new Date(), startMonth = 4, startDay = 1): Date {
  return getFiscalYearStart(getCurrentFiscalYear(today, startMonth, startDay), startMonth, startDay);
}

export function getFYTDCurrentEndDate(today = new Date()): Date {
  return dateAtMidnight(today.getFullYear(), today.getMonth(), today.getDate());
}

export function getPreviousFYTDStartDate(today = new Date(), startMonth = 4, startDay = 1): Date {
  return getFiscalYearStart(getPreviousFiscalYear(getCurrentFiscalYear(today, startMonth, startDay)), startMonth, startDay);
}

export function getPreviousFYTDEndDate(today = new Date(), startMonth = 4, startDay = 1): Date {
  // Shift the calendar date one year, rather than adding elapsed days: this also
  // preserves Jan/Feb dates when the preceding fiscal period crosses a leap year.
  const targetYear = today.getFullYear() - 1;
  const month = today.getMonth();
  const lastDay = new Date(targetYear, month + 1, 0).getDate();
  return dateAtMidnight(targetYear, month, Math.min(today.getDate(), lastDay));
}

export function getFYTDPeriods(today = new Date(), startMonth = 4, startDay = 1): FiscalPeriod[] {
  const currentYear = getCurrentFiscalYear(today, startMonth, startDay);
  return [
    {
      key: "current",
      label: `FY${currentYear}`,
      fiscalYear: currentYear,
      start: getFYTDStartDate(today, startMonth, startDay),
      end: getFYTDCurrentEndDate(today)
    },
    {
      key: "previous",
      label: `FY${currentYear - 1}`,
      fiscalYear: currentYear - 1,
      start: getPreviousFYTDStartDate(today, startMonth, startDay),
      end: getPreviousFYTDEndDate(today, startMonth, startDay)
    }
  ];
}

/**
 * Returns Q1 boundary dates for a given fiscal year based on the organization's fiscal calendar config.
 * Q1 spans 3 calendar months from startMonth.
 * Example for April 1: April 1 to June 30.
 * Example for January 1: January 1 to March 31.
 */
export function getFiscalQ1Period(fiscalYear: number, startMonth = 4, startDay = 1): { start: Date; end: Date } {
  const start = dateAtMidnight(fiscalYear, startMonth - 1, startDay);
  // End date is 3 months later, minus 1 day (e.g. Month 4 Day 1 -> Month 7 Day 1 minus 1 day = June 30)
  const end = new Date(fiscalYear, startMonth - 1 + 3, startDay - 1);
  return { start, end };
}

/**
 * Returns both current FY Q1 and previous FY Q1 period definitions.
 */
export function getQ1ComparisonPeriods(today = new Date(), startMonth = 4, startDay = 1): FiscalPeriod[] {
  const currentYear = getCurrentFiscalYear(today, startMonth, startDay);
  const prevYear = currentYear - 1;

  const currentQ1 = getFiscalQ1Period(currentYear, startMonth, startDay);
  const prevQ1 = getFiscalQ1Period(prevYear, startMonth, startDay);

  return [
    {
      key: "current",
      label: `FY${currentYear} Q1`,
      fiscalYear: currentYear,
      start: currentQ1.start,
      end: currentQ1.end
    },
    {
      key: "previous",
      label: `FY${prevYear} Q1`,
      fiscalYear: prevYear,
      start: prevQ1.start,
      end: prevQ1.end
    }
  ];
}

export function fiscalMonthIndex(date: Date, startMonth = 4): number {
  return (date.getMonth() - (startMonth - 1) + 12) % 12;
}

export function fiscalMonthLabel(index: number, startMonth = 4): string {
  return new Date(2000, (startMonth - 1 + index) % 12, 1).toLocaleString(undefined, { month: "short" });
}
