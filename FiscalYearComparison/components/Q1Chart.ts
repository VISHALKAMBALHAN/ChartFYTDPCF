import { FiscalPeriod, RenewalLicenseComparison } from "../models/Types";

export class Q1ComparisonChart {
  public render(
    data: RenewalLicenseComparison[],
    periods: FiscalPeriod[]
  ): HTMLElement {
    const root = document.createElement("div");
    root.className = "chart-inner q1-chart-inner";

    // Fallback sample data if empty
    const displayData: RenewalLicenseComparison[] =
      data && data.length > 0
        ? data
        : [
            { category: "Renewal", currentFYQ1: 125, previousFYQ1: 98 },
            { category: "New Business", currentFYQ1: 210, previousFYQ1: 175 },
            { category: "Upsell", currentFYQ1: 85, previousFYQ1: 64 }
          ];

    const currentPeriod = periods.find(p => p.key === "current");
    const prevPeriod = periods.find(p => p.key === "previous");
    const currentLabel = currentPeriod ? currentPeriod.label : "Current FY Q1";
    const prevLabel = prevPeriod ? prevPeriod.label : "Previous FY Q1";

    // Determine scale ceiling
    const rawMax = Math.max(10, ...displayData.flatMap(d => [d.currentFYQ1, d.previousFYQ1]));
    const yMax = this.getYMax(rawMax);
    const ticks = [yMax, Math.round((yMax * 2) / 3), Math.round(yMax / 3), 0];

    // Main Chart Box
    const chartBody = document.createElement("div");
    chartBody.className = "chart-body";

    // Y-Axis Title
    const yAxisTitle = document.createElement("div");
    yAxisTitle.className = "y-axis-title";
    yAxisTitle.textContent = "Sum (No. of Users/Licenses)";
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
      tick.textContent = tickVal.toLocaleString();
      yAxisLabels.appendChild(tick);
    });
    plotWrapper.appendChild(yAxisLabels);

    // Bars Area with gridlines
    const plotArea = document.createElement("div");
    plotArea.className = "plot-area";

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
      group.className = "status-group renewal-group";

      const barsRow = document.createElement("div");
      barsRow.className = "bars-row";

      // Previous FY Q1 Column
      const prevCol = this.createColumn(
        "previous",
        item.previousFYQ1,
        yMax,
        prevLabel,
        item.category
      );

      // Current FY Q1 Column
      const currCol = this.createColumn(
        "current",
        item.currentFYQ1,
        yMax,
        currentLabel,
        item.category
      );

      barsRow.append(prevCol, currCol);
      group.appendChild(barsRow);

      // Category Label (new_newrenewal)
      const catLabel = document.createElement("div");
      catLabel.className = "category-label";
      catLabel.textContent = item.category;
      catLabel.title = item.category;
      group.appendChild(catLabel);

      groupsContainer.appendChild(group);
    });

    plotArea.appendChild(groupsContainer);
    plotWrapper.appendChild(plotArea);
    chartBody.appendChild(plotWrapper);
    root.appendChild(chartBody);

    // X-Axis Title
    const xAxisTitle = document.createElement("div");
    xAxisTitle.className = "x-axis-title";
    xAxisTitle.textContent = "New / Renewal";
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

  private createColumn(
    key: "previous" | "current",
    value: number,
    yMax: number,
    periodLabel: string,
    categoryLabel: string
  ): HTMLElement {
    const col = document.createElement("div");
    col.className = `bar-column ${key}`;

    // Value label displayed on top of the column (requirement 10: "Display the values on top of the columns")
    if (value > 0) {
      const valLabel = document.createElement("span");
      valLabel.className = "bar-value-label";
      valLabel.textContent = value.toLocaleString();
      col.appendChild(valLabel);
    }

    const bar = document.createElement("button");
    bar.type = "button";
    bar.className = `chart-bar ${key}`;
    const heightPercent = Math.min(100, Math.max(value > 0 ? (value / yMax) * 100 : 1.2, 1.2));
    bar.style.height = `${heightPercent}%`;
    bar.title = `${periodLabel} (${categoryLabel}): ${value.toLocaleString()} Licenses`;

    col.appendChild(bar);
    return col;
  }

  private getYMax(value: number): number {
    if (value <= 10) return 10;
    const power = Math.pow(10, Math.floor(Math.log10(value)));
    const leading = value / power;
    let roundLeading = 1;
    if (leading <= 1) roundLeading = 1.2;
    else if (leading <= 2) roundLeading = 2.5;
    else if (leading <= 5) roundLeading = 6;
    else roundLeading = 10;
    return Math.ceil(roundLeading * power);
  }
}
