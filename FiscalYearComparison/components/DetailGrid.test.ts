import { DetailGrid } from "./DetailGrid";

describe("DetailGrid totals", () => {
  test("sum aggregate includes all revenue values", () => {
    const rows = [
      { revenue: 100 },
      { revenue: 250 },
      { revenue: 50 }
    ] as Array<{ revenue: number }>;

    expect(DetailGrid.getAggregateValue(rows, "revenue", "sum")).toBe(400);
  });

  test("average aggregate computes the mean revenue", () => {
    const rows = [
      { revenue: 100 },
      { revenue: 200 },
      { revenue: 300 }
    ] as Array<{ revenue: number }>;

    expect(DetailGrid.getAggregateValue(rows, "revenue", "average")).toBe(200);
  });
});
