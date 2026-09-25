export interface FiscalConfig {
  startMonth: number;
  startDay: number;
  revenueField: string;
  closeDateField: string;
  statusField: string;
  wonStatus: number;
}

export interface FiscalPeriod {
  key: "current" | "previous";
  label: string;
  start: Date;
  end: Date;
  fiscalYear: number;
}

export interface StatusRevenue {
  status: number;
  label: string;
  current: number;
  previous: number;
}

export interface OpportunityRow {
  id: string;
  name: string;
  customer: string;
  email: string;
  closeDate: Date | null;
  revenue: number;
  owner: string;
  status: string;
  statusValue?: number;
}

/**
 * Data structure representing a category row for the Q1 License Count Comparison chart.
 * Replicates Dynamics 365 visualization XML:
 * Grouped by: new_newrenewal (category)
 * Aggregated measure: SUM(new_noofusers1licences)
 */
export interface RenewalLicenseComparison {
  category: string;
  currentFYQ1: number;
  previousFYQ1: number;
}

export interface ChartOption {
  id: string;
  name: string;
}
