import { IInputs, IOutputs } from "../generated/ManifestTypes";
import { RevenueChart } from "./components/Chart";
import { Q1ComparisonChart } from "./components/Q1Chart";
import { DetailGrid } from "./components/DetailGrid";
import { FiscalConfig, FiscalPeriod, OpportunityRow, RenewalLicenseComparison, StatusRevenue, ChartOption } from "./models/Types";
import { getFYTDPeriods, getQ1ComparisonPeriods } from "./utils/FiscalDate";
import { OpportunityService } from "./services/DataverseService";

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export class OpportunityFYTDComparison implements ComponentFramework.StandardControl<IInputs, IOutputs> {
  private context!: ComponentFramework.Context<IInputs>;
  private container!: HTMLDivElement;
  private config!: FiscalConfig;

  // Chart Selection
  private availableCharts: ChartOption[] = [
    { id: "compare-last-year-full", name: "Compare To Last Year - Full" },
    { id: "compare-last-year-q1-count", name: "Compare to Last Year Q1 - Count" },
    { id: "compare-three-years-full", name: "Compare Three Years - Full" },
    { id: "compare-three-years-revenue-owner", name: "Compare Three Years - Revenue by Owner" },
    { id: "compare-three-years-count", name: "Compare Three Years (Full) - Count" },
    { id: "compare-three-years-mkt", name: "Compare Three Years (Full) - MKT Segment" },
    { id: "compare-three-years-renewals-rep", name: "Compare Three Years (Full) - Renewals by Support Rep" },
    { id: "compare-three-years-team", name: "Compare Three Years (Full) - Revenue by Team" },
    { id: "compare-three-years-new-renew", name: "Compare Three Years (Full) - Revenue New/Renew" },
    { id: "compare-last-year", name: "Compare To Last Year" },
    { id: "compare-last-year-count", name: "Compare to Last Year - Count" },
    { id: "compare-last-year-monthly", name: "Compare To Last Year - Monthly" },
    { id: "compare-last-year-teamwise", name: "Compare To Last Year - New Orders Teamwise" },
    { id: "compare-last-year-renewals-rep", name: "Compare to Last Year - Renewals by Support Rep" },
    { id: "compare-last-year-mkt", name: "Compare to Last Year - Revenue by MKT Segment" },
    { id: "compare-last-year-owner", name: "Compare to Last Year - Revenue by Owner" },
    { id: "compare-last-year-team", name: "Compare to Last Year - Revenue by Team" },
    { id: "compare-last-year-new-renew", name: "Compare to Last Year - Revenue New/Renew" }
  ];
  private selectedChartId = "compare-last-year-full";
  private isChartDropdownOpen = false;
  private isChartActionsMenuOpen = false;
  private isChartPanelHidden = false;

  // FYTD Revenue Chart Data
  private periods: FiscalPeriod[] = [];
  private data: StatusRevenue[] = [];
  private selectedPeriodKey?: "current" | "previous" = "current";
  private selectedStatus?: number = 1; // Default Won

  // Q1 License Count Comparison Chart Data
  private q1Periods: FiscalPeriod[] = [];
  private q1Data: RenewalLicenseComparison[] = [];

  // Detail Grid Data
  private detailRows: OpportunityRow[] = [];
  private totalCountEstimate = 5000;
  private page = 1;
  private more = false;
  private search = "";
  private service?: OpportunityService;
  private destroyed = false;

  public init(
    context: ComponentFramework.Context<IInputs>,
    _notifyOutputChanged: () => void,
    _state: ComponentFramework.Dictionary,
    container: HTMLDivElement
  ): void {
    this.context = context;
    this.container = container;
    this.loadChart();
  }

  public updateView(context: ComponentFramework.Context<IInputs>): void {
    this.context = context;
    const cfg = this.readConfig();
    if (JSON.stringify(cfg) !== JSON.stringify(this.config)) {
      this.loadChart();
    }
  }

  public getOutputs(): IOutputs {
    return {};
  }

  public destroy(): void {
    this.destroyed = true;
    this.container.replaceChildren();
  }

  private readConfig(): FiscalConfig {
    const p = this.context.parameters;
    return {
      startMonth: Number(p.fiscalYearStartMonth?.raw) || 4,
      startDay: Number(p.fiscalYearStartDay?.raw) || 1,
      revenueField: p.revenueField?.raw || "actualvalue",
      closeDateField: p.closeDateField?.raw || "actualclosedate",
      statusField: p.statusField?.raw || "statecode",
      wonStatus: Number(p.wonStatusValue?.raw) || 1
    };
  }

  private async loadChart(): Promise<void> {
    this.config = this.readConfig();
    this.service = new OpportunityService(this.context.webAPI, this.config);

    // Dynamic fiscal calendar detection from Dynamics 365 Organization settings
    const orgSettings = await this.service.getOrgFiscalSettings();
    if (orgSettings) {
      this.config.startMonth = orgSettings.startMonth;
      this.config.startDay = orgSettings.startDay;
    }

    const today = new Date();
    this.periods = getFYTDPeriods(today, this.config.startMonth, this.config.startDay);
    this.q1Periods = getQ1ComparisonPeriods(today, this.config.startMonth, this.config.startDay);

    this.selectedPeriodKey = "current";
    this.selectedStatus = this.config.wonStatus;

    this.renderLoading("Loading comparison charts…");
    try {
      // Parallel loading of both charts
      const [fytdData, q1Data] = await Promise.all([
        this.service.getStatusRevenue(this.periods),
        this.service.getRenewalLicenseComparison(this.q1Periods)
      ]);

      this.data = fytdData;
      this.q1Data = q1Data;
      this.page = 1;
      this.search = "";
      await this.loadDetails();
    } catch (error) {
      this.renderError(error);
    }
  }

  private async loadDetails(): Promise<void> {
    if (!this.service) return;
    const selectedPeriod = this.periods.find(p => p.key === this.selectedPeriodKey);
    try {
      const result = await this.service.getDetails(
        selectedPeriod,
        this.selectedStatus,
        this.page,
        25,
        this.search
      );
      this.detailRows = result.rows;
      this.totalCountEstimate = result.totalCountEstimate;
      this.more = result.more;
      if (!this.destroyed) {
        this.render();
      }
    } catch (error) {
      this.renderError(error);
    }
  }

  private selectFilter(key: "current" | "previous", status: number): void {
    if (this.selectedPeriodKey === key && this.selectedStatus === status) {
      this.selectedPeriodKey = undefined;
      this.selectedStatus = undefined;
    } else {
      this.selectedPeriodKey = key;
      this.selectedStatus = status;
    }
    this.page = 1;
    this.loadDetails();
  }

  private render(): void {
    this.container.replaceChildren();

    const root = document.createElement("main");
    root.className = "fytd-control";

    // 1. Top Header Bar
    const topbar = document.createElement("header");
    topbar.className = "topbar";

    const titleGroup = document.createElement("div");
    titleGroup.className = "view-title-group";
    titleGroup.innerHTML = `
      <span class="view-title">All Opportunities</span>
      <span class="title-chevron">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2.5 4.5L6 8L9.5 4.5" stroke="#605e5c" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>
    `;

    const commands = document.createElement("div");
    commands.className = "topbar-commands";

    // Edit columns button
    const editColsBtn = document.createElement("button");
    editColsBtn.type = "button";
    editColsBtn.className = "command-btn";
    editColsBtn.innerHTML = `
      <span class="cmd-icon">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M2 3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3zm1 0v4h4V3H3zm5 0v4h5V3H8zm5 5H8v5h5V8zm-6 5V8H3v5h4z" fill="#0078d4"/>
        </svg>
      </span>
      <span>Edit columns</span>
    `;

    // Edit filters button
    const editFiltersBtn = document.createElement("button");
    editFiltersBtn.type = "button";
    editFiltersBtn.className = "command-btn";
    editFiltersBtn.innerHTML = `
      <span class="cmd-icon">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#0078d4" stroke-width="1.2">
          <path d="M2 3h12l-4.5 5.5v4.5l-3-1.5V8.5L2 3z" stroke-linejoin="round"/>
        </svg>
      </span>
      <span>Edit filters</span>
    `;

    // Search Box
    const searchWrapper = document.createElement("div");
    searchWrapper.className = "search-box-wrapper";
    const searchIcon = document.createElement("span");
    searchIcon.className = "search-icon";
    searchIcon.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#605e5c" stroke-width="1.3">
        <circle cx="6.5" cy="6.5" r="4.5"/>
        <path d="M10 10l4 4" stroke-linecap="round"/>
      </svg>
    `;

    const keywordInput = document.createElement("input");
    keywordInput.type = "search";
    keywordInput.className = "keyword-search";
    keywordInput.placeholder = "Filter by keyword";
    keywordInput.value = this.search;
    keywordInput.setAttribute("aria-label", "Filter by keyword");
    keywordInput.onkeydown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        this.search = keywordInput.value.trim();
        this.page = 1;
        this.loadDetails();
      }
    };
    keywordInput.onchange = () => {
      this.search = keywordInput.value.trim();
      this.page = 1;
      this.loadDetails();
    };

    searchWrapper.append(searchIcon, keywordInput);
    commands.append(editColsBtn, editFiltersBtn, searchWrapper);
    topbar.append(titleGroup, commands);
    root.appendChild(topbar);

    // 2. Split Comparison Layout
    const comparison = document.createElement("div");
    comparison.className = "comparison-layout";

    // Left Pane: Chart Pane
    const chartPane = document.createElement("section");
    chartPane.className = "chart-pane";

    // Chart Header with Dynamics 365 Chart Dropdown Selector
    const chartHeader = document.createElement("div");
    chartHeader.className = "chart-header";

    const dropdownWrapper = document.createElement("div");
    dropdownWrapper.className = "chart-selector-wrapper";

    const currentChart = this.availableCharts.find(c => c.id === this.selectedChartId) || this.availableCharts[0];

    const dropdownBtn = document.createElement("button");
    dropdownBtn.type = "button";
    dropdownBtn.className = "chart-selector-btn";
    dropdownBtn.setAttribute("aria-expanded", String(this.isChartDropdownOpen));
    dropdownBtn.innerHTML = `
      <span class="chart-selector-title">${escapeXml(currentChart.name)}</span>
      <svg class="chart-selector-chevron" width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M2 3.5L5 6.5L8 3.5" stroke="#323130" stroke-width="1.2" stroke-linecap="round"/>
      </svg>
    `;

    dropdownBtn.onclick = (e) => {
      e.stopPropagation();
      this.isChartDropdownOpen = !this.isChartDropdownOpen;
      this.render();
    };

    dropdownWrapper.appendChild(dropdownBtn);

    // Render dropdown menu if open
    if (this.isChartDropdownOpen) {
      const menu = document.createElement("div");
      menu.className = "chart-dropdown-menu";

      this.availableCharts.forEach(opt => {
        const item = document.createElement("div");
        item.className = `chart-dropdown-item ${opt.id === this.selectedChartId ? "selected" : ""}`;
        item.textContent = opt.name;
        item.onclick = (e) => {
          e.stopPropagation();
          this.selectedChartId = opt.id;
          this.isChartDropdownOpen = false;
          this.render();
        };
        menu.appendChild(item);
      });

      dropdownWrapper.appendChild(menu);

      // Close dropdown when clicking outside
      const onDocClick = () => {
        if (this.isChartDropdownOpen) {
          this.isChartDropdownOpen = false;
          document.removeEventListener("click", onDocClick);
          this.render();
        }
      };
      setTimeout(() => document.addEventListener("click", onDocClick), 0);
    }

    const chartActions = document.createElement("div");
    chartActions.className = "chart-actions";

    // ── More options (⋮) ───────────────────────────────────────────────────
    const moreBtn = document.createElement("button");
    moreBtn.type = "button";
    moreBtn.className = "chart-action-btn";
    moreBtn.title = "More options";
    moreBtn.setAttribute("aria-haspopup", "true");
    moreBtn.setAttribute("aria-expanded", String(this.isChartActionsMenuOpen));
    moreBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="#605e5c"><circle cx="8" cy="3" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="8" cy="13" r="1.5"/></svg>`;
    moreBtn.onclick = (e) => {
      e.stopPropagation();
      this.isChartDropdownOpen = false;
      this.isChartActionsMenuOpen = !this.isChartActionsMenuOpen;
      this.render();
    };
    chartActions.appendChild(moreBtn);

    // Context menu
    if (this.isChartActionsMenuOpen) {
      const ctxMenu = document.createElement("div");
      ctxMenu.className = "chart-context-menu";

      const menuItems: { icon: string; label: string; action: () => void }[] = [
        {
          icon: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M13 8A5 5 0 1 1 8 3" stroke-linecap="round"/><path d="M13 3v3h-3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
          label: "Refresh",
          action: () => { this.isChartActionsMenuOpen = false; this.loadChart(); }
        },
        {
          icon: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M2 12v2h12v-2M8 2v9M5 8l3 3 3-3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
          label: "Save As",
          action: () => { this.isChartActionsMenuOpen = false; alert("Save As: feature requires Dynamics 365 context."); }
        },
        {
          icon: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M8 2v12M2 8h12" stroke-linecap="round"/></svg>`,
          label: "New",
          action: () => { this.isChartActionsMenuOpen = false; alert("New: feature requires Dynamics 365 context."); }
        },
        {
          icon: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M2 4v8h12V4M5 4V2h6v2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
          label: "Import",
          action: () => { this.isChartActionsMenuOpen = false; alert("Import: feature requires Dynamics 365 context."); }
        },
        {
          icon: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M2 4v8h12V4M2 8h12" stroke-linecap="round"/></svg>`,
          label: "Export",
          action: () => { this.isChartActionsMenuOpen = false; alert("Export: feature requires Dynamics 365 context."); }
        },
        {
          icon: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M10 3l5 5-5 5M2 8h13" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
          label: "Move right",
          action: () => {
            this.isChartActionsMenuOpen = false;
            const pane = this.container.querySelector(".chart-pane") as HTMLElement | null;
            const records = this.container.querySelector(".records-pane") as HTMLElement | null;
            if (pane && records) {
              const layout = pane.parentElement;
              if (layout) { layout.appendChild(pane); }
            }
            this.render();
          }
        }
      ];

      menuItems.forEach(item => {
        const mi = document.createElement("button");
        mi.type = "button";
        mi.className = "chart-ctx-item";
        mi.innerHTML = `<span class="ctx-item-icon">${item.icon}</span><span>${item.label}</span>`;
        mi.onclick = (e) => { e.stopPropagation(); item.action(); };
        ctxMenu.appendChild(mi);
      });

      chartActions.appendChild(ctxMenu);

      const closeCtx = () => {
        if (this.isChartActionsMenuOpen) {
          this.isChartActionsMenuOpen = false;
          document.removeEventListener("click", closeCtx);
          this.render();
        }
      };
      setTimeout(() => document.addEventListener("click", closeCtx), 0);
    }

    // ── Edit / pencil — focuses the chart selector ─────────────────────────
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "chart-action-btn";
    editBtn.title = "Edit chart";
    editBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#605e5c" stroke-width="1.2"><path d="M11 2l3 3-8 8H3v-3l8-8z" stroke-linejoin="round"/><path d="M9 4l3 3" stroke-linecap="round"/></svg>`;
    editBtn.onclick = () => {
      this.isChartDropdownOpen = true;
      this.isChartActionsMenuOpen = false;
      this.render();
    };
    chartActions.appendChild(editBtn);

    // ── Close (X) — hides / restores chart pane ────────────────────────────
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "chart-action-btn";
    closeBtn.title = this.isChartPanelHidden ? "Show chart" : "Close chart";
    closeBtn.innerHTML = this.isChartPanelHidden
      ? `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#605e5c" stroke-width="1.2"><rect x="2" y="2" width="12" height="12" rx="1"/><path d="M5 8h6M8 5v6" stroke-linecap="round"/></svg>`
      : `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#605e5c" stroke-width="1.2"><path d="M3 3l10 10M13 3L3 13" stroke-linecap="round"/></svg>`;
    closeBtn.onclick = () => {
      this.isChartPanelHidden = !this.isChartPanelHidden;
      this.render();
    };
    chartActions.appendChild(closeBtn);

    chartHeader.append(dropdownWrapper, chartActions);
    chartPane.appendChild(chartHeader);

    // Render selected chart (unless panel is hidden)
    if (!this.isChartPanelHidden) {
      const chartsWrapper = document.createElement("div");
      chartsWrapper.className = "charts-content-wrapper";

      if (this.selectedChartId === "compare-last-year-q1-count") {
        const q1ChartComponent = new Q1ComparisonChart();
        const renderedQ1Chart = q1ChartComponent.render(
          this.q1Data,
          this.q1Periods
        );
        chartsWrapper.appendChild(renderedQ1Chart);
      } else {
        // Default to FYTD Revenue comparison chart ("Compare To Last Year - Full")
        const chartComponent = new RevenueChart();
        const renderedChart = chartComponent.render(
          this.data,
          this.periods,
          this.selectedPeriodKey,
          this.selectedStatus,
          (key, status) => this.selectFilter(key, status)
        );
        chartsWrapper.appendChild(renderedChart);
      }

      chartPane.appendChild(chartsWrapper);
    }

    // Right Pane: Records Grid
    const recordsPane = document.createElement("section");
    recordsPane.className = "records-pane";

    const detailGridComponent = new DetailGrid();
    const renderedGrid = detailGridComponent.render(
      this.detailRows,
      this.page,
      this.totalCountEstimate,
      this.more,
      {
        refresh: () => this.loadDetails(),
        changePage: (newPage: number) => {
          this.page = newPage;
          this.loadDetails();
        }
      }
    );

    recordsPane.appendChild(renderedGrid);

    comparison.append(chartPane, recordsPane);
    root.appendChild(comparison);

    this.container.appendChild(root);
  }

  private renderLoading(message: string): void {
    this.container.innerHTML = `<div class='fytd-control message' role='status'>${message}</div>`;
  }

  private renderError(error: unknown): void {
    const message = error instanceof Error ? error.message : "Unable to load Opportunity data.";
    this.container.innerHTML = `<div class='fytd-control error' role='alert'><strong>Could not load comparison view:</strong> ${message}</div>`;
  }
}
