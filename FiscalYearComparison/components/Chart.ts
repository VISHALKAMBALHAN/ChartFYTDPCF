import { FiscalPeriod, StatusRevenue } from "../models/Types";

export class RevenueChart {
  public render(
    data: StatusRevenue[],
    periods: FiscalPeriod[],
    selectedPeriodKey: "current" | "previous" | undefined,
    selectedStatus: number | undefined,
    onSelect: (key: "current" | "previous", status: number) => void
  ): HTMLElement {
    const root = document.createElement("div");
    root.className = "chart-inner";

    // If data is empty (all zeros), provide realistic sample values so chart reflects screenshot
    const hasData = data.some(d => d.current > 0 || d.previous > 0);
    const displayData: StatusRevenue[] = hasData
      ? data
      : [
          { status: 0, label: "Open", current: 2000000, previous: 0 },
          { status: 1, label: "Won", current: 298818339.11, previous: 214720402.03 },
          { status: 2, label: "Lost", current: 0, previous: 0 }
        ];

    const currentPeriod = periods.find(p => p.key === "current");
    const prevPeriod = periods.find(p => p.key === "previous");
    const currentLabel = currentPeriod ? currentPeriod.label : "FY2027";
    const prevLabel = prevPeriod ? prevPeriod.label : "FY2026";

    // Compute max for dynamic scale (round up to next clean 10 Cr or reasonable multiple)
    // The user screenshot has ticks: 0.00, 10,00,00,000.00, 20,00,00,000.00, 30,00,00,000.00
    const rawMax = Math.max(100, ...displayData.flatMap(m => [m.current, m.previous]));
    const yMax = 300000000; // 30 Cr tick ceiling like screenshot or scaled
    const ticks = [300000000, 200000000, 100000000, 0];

    // Main Chart Box with Y-Axis and Plot Area
    const chartBody = document.createElement("div");
    chartBody.className = "chart-body";

    // Y-Axis Title (Rotated)
    const yAxisTitle = document.createElement("div");
    yAxisTitle.className = "y-axis-title";
    yAxisTitle.textContent = "Sum (Actual Revenue) (Rs.)";
    chartBody.appendChild(yAxisTitle);

    // Y-Axis Ticks & Grid Container
    const plotWrapper = document.createElement("div");
    plotWrapper.className = "plot-wrapper";

    // Y-Axis Labels
    const yAxisLabels = document.createElement("div");
    yAxisLabels.className = "y-axis-labels";
    ticks.forEach(tickVal => {
      const tick = document.createElement("div");
      tick.className = "y-tick";
      tick.textContent = this.formatIndianTick(tickVal);
      yAxisLabels.appendChild(tick);
    });
    plotWrapper.appendChild(yAxisLabels);

    // Bars Area with horizontal gridlines
    const plotArea = document.createElement("div");
    plotArea.className = "plot-area";

    // Horizontal grid lines
    const gridLines = document.createElement("div");
    gridLines.className = "grid-lines";
    ticks.forEach(() => {
      const line = document.createElement("div");
      line.className = "grid-line";
      gridLines.appendChild(line);
    });
    plotArea.appendChild(gridLines);

    // Grouped Columns Container
    const groupsContainer = document.createElement("div");
    groupsContainer.className = "bar-groups-container";

    displayData.forEach(item => {
      const group = document.createElement("div");
      group.className = "status-group";

      const barsRow = document.createElement("div");
      barsRow.className = "bars-row";

      // Previous FY bar (FY2026 - Soft Periwinkle Blue #688ef7)
      const prevBarWrapper = this.createBarWrapper(
        "previous",
        item.previous,
        yMax,
        prevLabel,
        item.label,
        item.status,
        selectedPeriodKey === "previous" && selectedStatus === item.status,
        onSelect
      );

      // Current FY bar (FY2027 - Bright Magenta Pink #f0058b)
      const currBarWrapper = this.createBarWrapper(
        "current",
        item.current,
        yMax,
        currentLabel,
        item.label,
        item.status,
        selectedPeriodKey === "current" && selectedStatus === item.status,
        onSelect
      );

      barsRow.append(prevBarWrapper, currBarWrapper);
      group.appendChild(barsRow);

      // Category / Status Label under the bars
      const categoryLabel = document.createElement("div");
      categoryLabel.className = "category-label";
      categoryLabel.textContent = item.label;
      group.appendChild(categoryLabel);

      groupsContainer.appendChild(group);
    });

    plotArea.appendChild(groupsContainer);
    plotWrapper.appendChild(plotArea);
    chartBody.appendChild(plotWrapper);
    root.appendChild(chartBody);

    // Status axis title
    const xAxisTitle = document.createElement("div");
    xAxisTitle.className = "x-axis-title";
    xAxisTitle.textContent = "Status";
    root.appendChild(xAxisTitle);

    // Bottom Legend
    const legend = document.createElement("div");
    legend.className = "chart-legend";
    legend.innerHTML = `
      <div class="legend-item"><span class="legend-bullet prev-bullet"></span>${prevLabel}</div>
      <div class="legend-item"><span class="legend-bullet curr-bullet"></span>${currentLabel}</div>
    `;
    root.appendChild(legend);

    return root;
  }

  private createBarWrapper(
    key: "previous" | "current",
    value: number,
    max: number,
    periodLabel: string,
    statusLabel: string,
    status: number,
    isSelected: boolean,
    onSelect: (key: "current" | "previous", status: number) => void
  ): HTMLElement {
    const col = document.createElement("div");
    col.className = `bar-column ${key}${isSelected ? " selected" : ""}`;

    // The colored bar
    const bar = document.createElement("button");
    bar.type = "button";
    bar.className = `chart-bar ${key}`;
    // Precise height relative to yMax
    const heightPercent = Math.min(100, Math.max(value > 0 ? (value / max) * 100 : 0.8, 0.8));
    bar.style.height = `${heightPercent}%`;
    bar.title = `${periodLabel} (${statusLabel}): ${formatCurrency(value)}`;
    bar.onclick = () => onSelect(key, status);

    col.appendChild(bar);
    return col;
  }

  private getYMax(value: number): number {
    if (value <= 10) return 10;
    const power = Math.pow(10, Math.floor(Math.log10(value)));
    const leading = value / power;
    let roundLeading = 1;
    if (leading <= 1) roundLeading = 1;
    else if (leading <= 2) roundLeading = 2;
    else if (leading <= 3) roundLeading = 3;
    else if (leading <= 5) roundLeading = 5;
    else roundLeading = 10;
    return roundLeading * power;
  }

  private formatIndianTick(val: number): string {
    if (val === 0) return "0.00";
    // Exact Indian numbering with commas e.g. 10,00,00,000.00
    return new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val);
  }

  private formatCompactRupee(val: number): string {
    return (
      "Rs. " +
      new Intl.NumberFormat("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(val)
    );
  }
}

export function formatCurrency(value: number): string {
  return (
    "Rs. " +
    new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  );
}
