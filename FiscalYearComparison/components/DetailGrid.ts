import { OpportunityRow } from "../models/Types";
import { formatCurrency } from "./Chart";

export type AggregateMode = "none" | "average" | "maximum" | "minimum" | "sum";

export class DetailGrid {
  private selectedIds: Set<string> = new Set();
  private sort?: { key: string; direction: 1 | -1 };
  private groupKey?: string;
  private columnFilters: Record<string, string> = {};
  private columnWidths: Record<string, number> = {};
  private columnOrder = ["name", "customer", "email", "status", "closeDate", "revenue"];
  private columnTotals: Record<string, AggregateMode> = {};
  private openMenu?: string;
  private scrollContainer?: HTMLElement;
  private savedScrollTop = 0;
  private preserveScrollTop = true;
  private loadTriggered = false;

  public static getAggregateValue<T extends object>(
    rows: T[],
    key: string,
    mode: AggregateMode
  ): number {
    const values = rows
      .map(row => Number((row as Record<string, unknown>)[key]))
      .filter(value => Number.isFinite(value));

    if (!values.length) {
      return 0;
    }

    switch (mode) {
      case "average":
        return values.reduce((sum, value) => sum + value, 0) / values.length;
      case "maximum":
        return Math.max(...values);
      case "minimum":
        return Math.min(...values);
      case "sum":
      default:
        return values.reduce((sum, value) => sum + value, 0);
    }
  }

  public resetScroll(): void {
    this.savedScrollTop = 0;
    this.preserveScrollTop = false;
  }

  public render(
    rows: OpportunityRow[],
    totalCount: number,
    more: boolean,
    loadingMore: boolean,
    loadingDetails: boolean,
    actions: {
      refresh(): void;
      loadMore(): Promise<void>;
      onRowSelect?(row: OpportunityRow): void;
      onGridChange?(): void;
    },
    hiddenColumns: Set<string> = new Set()
  ): HTMLElement {
    const root = document.createElement("div");
    root.className = "fluent-grid-container";

    const tableWrapper = document.createElement("div");
    tableWrapper.className = "fluent-table-wrapper";

    // One visible scrollbar. Dataverse paging happens behind the scenes.
    tableWrapper.style.height = "600px";
    tableWrapper.style.maxHeight = "65vh";
    tableWrapper.style.overflowY = "auto";
    tableWrapper.style.overflowX = "auto";
    tableWrapper.style.position = "relative";

    this.scrollContainer = tableWrapper;
    tableWrapper.addEventListener("scroll", () => {
      if (this.preserveScrollTop) {
        this.savedScrollTop = tableWrapper.scrollTop;
      }
    }, { passive: true });

    const table = document.createElement("table");
    table.className = "fluent-table";

    // Table Header
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    // Master Select Checkbox
    const thCheck = document.createElement("th");
    thCheck.className = "col-checkbox";
    thCheck.style.position = "sticky";
    thCheck.style.top = "0";
    thCheck.style.zIndex = "2";

    const masterCheck = document.createElement("input");
    masterCheck.type = "checkbox";
    masterCheck.className = "fluent-checkbox";
    masterCheck.setAttribute("aria-label", "Select all loaded records");
    masterCheck.checked =
      rows.length > 0 && rows.every(r => this.selectedIds.has(r.id));

    masterCheck.onchange = () => {
      if (masterCheck.checked) {
        rows.forEach(r => this.selectedIds.add(r.id));
      } else {
        rows.forEach(r => this.selectedIds.delete(r.id));
      }

      this.updateRowCheckboxes(table);
    };

    thCheck.appendChild(masterCheck);
    headerRow.appendChild(thCheck);

    const columns: Array<{ key: string; label: string; sortIcon?: boolean; hasFilter?: boolean; truncateLabel?: string }> = [
      { key: "name", label: "Topic", sortIcon: true, hasFilter: true },
      {
        key: "customer",
        label: "Potential Customer",
        sortIcon: false,
        hasFilter: true,
        truncateLabel: "Potenti..."
      },
      {
        key: "email",
        label: "Email Address",
        sortIcon: false,
        hasFilter: true,
        truncateLabel: "Email A..."
      },
      {
        key: "status",
        label: "Status",
        sortIcon: false,
        hasFilter: true
      },
      {
        key: "closeDate",
        label: "Actual Close Date",
        sortIcon: false,
        hasFilter: true,
        truncateLabel: "Actual ..."
      },
      {
        key: "revenue",
        label: "Actual Revenue",
        sortIcon: false,
        hasFilter: true,
        truncateLabel: "Actual R..."
      },
    ];

    columns.sort((a, b) => this.columnOrder.indexOf(a.key) - this.columnOrder.indexOf(b.key));
    const valueFor = (row: OpportunityRow, key: string): string => {
      const value = row[key as keyof OpportunityRow];
      if (value instanceof Date) return value.toLocaleDateString();
      if (value === null || value === undefined) return "";
      return String(value);
    };
    let displayRows = rows.filter(row => columns.every(col => {
      const filter = this.columnFilters[col.key]?.toLocaleLowerCase();
      return !filter || valueFor(row, col.key).toLocaleLowerCase().includes(filter);
    }));
    if (this.sort) {
      const { key, direction } = this.sort;
      displayRows = displayRows.slice().sort((a, b) => {
        const av = a[key as keyof OpportunityRow];
        const bv = b[key as keyof OpportunityRow];
        const cmp = av instanceof Date && bv instanceof Date ? av.getTime() - bv.getTime()
          : typeof av === "number" && typeof bv === "number" ? av - bv
          : valueFor(a, key).localeCompare(valueFor(b, key), undefined, { numeric: true, sensitivity: "base" });
        return cmp * direction;
      });
    }
    if (this.groupKey) {
      const groupKey = this.groupKey;
      displayRows = displayRows.slice().sort((a, b) =>
        valueFor(a, groupKey).localeCompare(valueFor(b, groupKey), undefined, { numeric: true, sensitivity: "base" })
      );
    }

    columns.forEach(col => {
      const th = document.createElement("th");
      th.className = `col-${col.key}`;
      th.hidden = hiddenColumns.has(col.key);
      th.style.position = "sticky";
      th.style.top = "0";
      th.style.zIndex = this.openMenu === col.key ? "20" : "2";
      th.style.width = this.columnWidths[col.key] ? `${this.columnWidths[col.key]}px` : "";

      const headerContent = document.createElement("div");
      headerContent.className = "th-content";

      const text = document.createElement("span");
      text.className = "th-label";
      text.textContent = col.truncateLabel || col.label;
      text.title = col.label;
      headerContent.appendChild(text);

      const menuButton = document.createElement("button");
      menuButton.type = "button";
      menuButton.className = "grid-column-menu-button";
      menuButton.setAttribute("aria-label", `${col.label} column options`);
      menuButton.setAttribute("aria-expanded", String(this.openMenu === col.key));
      menuButton.innerHTML = `<svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>`;
      menuButton.onclick = e => { e.stopPropagation(); this.openMenu = this.openMenu === col.key ? undefined : col.key; actions.onGridChange?.(); };
      headerContent.appendChild(menuButton);

      if (col.sortIcon) {
        const sort = document.createElement("span");
        sort.className = "th-sort";
        sort.innerHTML = `
          <svg width="10" height="12" viewBox="0 0 10 12" fill="none"
               stroke="#323130" stroke-width="1.3">
            <path d="M5 11V1M5 1L2 4M5 1L8 4"
                  stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        `;
        headerContent.appendChild(sort);
      }

      th.appendChild(headerContent);
      if (this.openMenu === col.key) {
        const menu = document.createElement("div");
        menu.className = "grid-column-menu";
        menu.setAttribute("role", "menu");
        const addItem = (label: string, action: () => void, icon: string) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "grid-column-menu-item";
          button.innerHTML = `<span aria-hidden="true">${icon}</span><span>${label}</span>`;
          button.onclick = e => { e.stopPropagation(); action(); this.openMenu = undefined; actions.onGridChange?.(); };
          menu.appendChild(button);
        };
        addItem("A to Z", () => { this.sort = { key: col.key, direction: 1 }; }, "↑");
        addItem("Z to A", () => { this.sort = { key: col.key, direction: -1 }; }, "↓");
        addItem(this.groupKey === col.key ? "Ungroup" : "Group by", () => { this.groupKey = this.groupKey === col.key ? undefined : col.key; }, "☷");
        const filterWrap = document.createElement("label");
        filterWrap.className = "grid-column-filter";
        filterWrap.innerHTML = `<span>Filter by</span>`;
        const filterInput = document.createElement("input");
        filterInput.type = "search";
        filterInput.placeholder = `Filter ${col.label}`;
        filterInput.value = this.columnFilters[col.key] || "";
        filterInput.setAttribute("aria-label", `Filter ${col.label}`);
        filterInput.onchange = () => { this.columnFilters[col.key] = filterInput.value; actions.onGridChange?.(); };
        filterWrap.appendChild(filterInput);
        menu.appendChild(filterWrap);
        const widthLabel = document.createElement("label");
        widthLabel.className = "grid-column-filter";
        widthLabel.textContent = "Column width";
        const widthInput = document.createElement("input");
        widthInput.type = "number"; widthInput.min = "70"; widthInput.max = "600";
        widthInput.value = String(this.columnWidths[col.key] || Math.round(th.getBoundingClientRect().width || 160));
        widthInput.setAttribute("aria-label", `${col.label} column width`);
        widthInput.onchange = () => { this.columnWidths[col.key] = Math.max(70, Math.min(600, Number(widthInput.value) || 160)); actions.onGridChange?.(); };
        widthLabel.appendChild(widthInput); menu.appendChild(widthLabel);

        if (col.key === "revenue") {
          const totalsHeader = document.createElement("div");
          totalsHeader.className = "grid-column-filter";
          totalsHeader.textContent = "Totals";
          menu.appendChild(totalsHeader);

          const totalOptions: Array<{ label: string; value: AggregateMode }> = [
            { label: "None", value: "none" },
            { label: "Average", value: "average" },
            { label: "Maximum", value: "maximum" },
            { label: "Minimum", value: "minimum" },
            { label: "Sum", value: "sum" }
          ];

          totalOptions.forEach(option => {
            const optionButton = document.createElement("button");
            optionButton.type = "button";
            optionButton.className = "grid-column-menu-item";
            optionButton.innerHTML = `<span aria-hidden="true">${this.columnTotals[col.key] === option.value ? "✓" : ""}</span><span>${option.label}</span>`;
            optionButton.onclick = e => {
              e.stopPropagation();
              this.columnTotals[col.key] = option.value;
              if (option.value === "none") {
                delete this.columnTotals[col.key];
              }
              actions.onGridChange?.();
            };
            menu.appendChild(optionButton);
          });
        }

        addItem("Move left", () => { this.moveColumn(col.key, -1); }, "←");
        addItem("Move right", () => { this.moveColumn(col.key, 1); }, "→");
        menu.onclick = e => e.stopPropagation();
        th.appendChild(menu);
      }
      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Table Body
    const tbody = document.createElement("tbody");

    if (!displayRows.length) {
      const emptyRow = document.createElement("tr");
      emptyRow.className = "empty-row";
      emptyRow.innerHTML =
        `<td colspan="7" class="empty-cell">${loadingDetails ? "Loading opportunities..." : "No opportunities found for the selected view."}</td>`;
      tbody.appendChild(emptyRow);
    } else {
      let previousGroup = "";
      displayRows.forEach(row => {
        if (this.groupKey) {
          const groupValue = valueFor(row, this.groupKey) || "(Blank)";
          if (groupValue !== previousGroup) {
            previousGroup = groupValue;
            const groupRow = document.createElement("tr");
            groupRow.className = "grid-group-row";
            const groupCell = document.createElement("td");
            groupCell.colSpan = columns.length + 1;
            groupCell.textContent = `${columns.find(c => c.key === this.groupKey)?.label}: ${groupValue}`;
            groupRow.appendChild(groupCell); tbody.appendChild(groupRow);
          }
        }
        const tr = document.createElement("tr");
        tr.className = "fluent-row";

        if (this.selectedIds.has(row.id)) {
          tr.classList.add("selected");
        }

        // Checkbox column
        const tdCheck = document.createElement("td");
        tdCheck.className = "col-checkbox";

        const rowCheck = document.createElement("input");
        rowCheck.type = "checkbox";
        rowCheck.className = "fluent-checkbox row-selector";
        rowCheck.checked = this.selectedIds.has(row.id);
        rowCheck.dataset.id = row.id;

        rowCheck.onchange = () => {
          if (rowCheck.checked) {
            this.selectedIds.add(row.id);
            tr.classList.add("selected");
          } else {
            this.selectedIds.delete(row.id);
            tr.classList.remove("selected");
          }

          masterCheck.checked =
            rows.length > 0 &&
            rows.every(r => this.selectedIds.has(r.id));
        };

        tdCheck.appendChild(rowCheck);
        tr.appendChild(tdCheck);

        // Topic
        const tdTopic = document.createElement("td");
        tdTopic.className = "col-topic";
        tdTopic.hidden = hiddenColumns.has("name");

        const topicLink = document.createElement("a");
        topicLink.className = "fluent-link";
        topicLink.textContent = row.name;
        topicLink.href = "#";
        topicLink.title = row.name;
        topicLink.onclick = e => {
          e.preventDefault();
          actions.onRowSelect?.(row);
        };

        tdTopic.appendChild(topicLink);
        tr.appendChild(tdTopic);

        // Potential Customer
        const tdCustomer = document.createElement("td");
        tdCustomer.className = "col-customer";
        tdCustomer.hidden = hiddenColumns.has("customer");

        if (row.customer && row.customer !== "—") {
          const custLink = document.createElement("a");
          custLink.className = "fluent-link";
          custLink.textContent = row.customer;
          custLink.href = "#";
          custLink.title = row.customer;
          custLink.onclick = e => {
            e.preventDefault();
            actions.onRowSelect?.(row);
          };
          tdCustomer.appendChild(custLink);
        }

        tr.appendChild(tdCustomer);

        // Email Address
        const tdEmail = document.createElement("td");
        tdEmail.className = "col-email";
        tdEmail.hidden = hiddenColumns.has("email");
        tdEmail.textContent = row.email || "";
        tr.appendChild(tdEmail);

        // Status
        const tdStatus = document.createElement("td");
        tdStatus.className = "col-status";
        tdStatus.hidden = hiddenColumns.has("status");
        tdStatus.textContent = row.status;
        tr.appendChild(tdStatus);

        // Actual Close Date
        const tdDate = document.createElement("td");
        tdDate.className = "col-date";
        tdDate.hidden = hiddenColumns.has("closeDate");
        tdDate.textContent = row.closeDate
          ? this.formatDate(row.closeDate)
          : "";
        tr.appendChild(tdDate);

        // Actual Revenue
        const tdRevenue = document.createElement("td");
        tdRevenue.className = "col-revenue";
        tdRevenue.hidden = hiddenColumns.has("revenue");
        tdRevenue.textContent =
          row.revenue > 0 ? formatCurrency(row.revenue) : "";
        tr.appendChild(tdRevenue);

        const cellClass: Record<string, string> = {
          name: "col-topic", customer: "col-customer", email: "col-email",
          status: "col-status", closeDate: "col-date", revenue: "col-revenue"
        };
        this.columnOrder.forEach(key => {
          const cell = tr.querySelector<HTMLElement>(`.${cellClass[key]}`);
          if (cell) {
            if (this.columnWidths[key]) cell.style.width = `${this.columnWidths[key]}px`;
            tr.appendChild(cell);
          }
        });

        tbody.appendChild(tr);
      });
    }

    const totalMode = this.columnTotals.revenue;
    if (totalMode && totalMode !== "none") {
      const totalRow = document.createElement("tr");
      totalRow.className = "grid-group-row";

      const totalLabel = document.createElement("td");
      totalLabel.colSpan = 1;
      totalLabel.textContent = "Total";
      totalRow.appendChild(totalLabel);

      for (let index = 1; index < columns.length + 1; index++) {
        const cell = document.createElement("td");
        cell.className = "grid-total-cell";

        if (index === columns.findIndex(c => c.key === "revenue") + 1) {
          const totalValue = DetailGrid.getAggregateValue(displayRows, "revenue", totalMode);
          cell.textContent = formatCurrency(totalValue);
          cell.style.fontWeight = "600";
        }

        totalRow.appendChild(cell);
      }

      tbody.appendChild(totalRow);
    }

    table.appendChild(tbody);
    tableWrapper.appendChild(table);

    const loadSentinel = document.createElement("div");
    loadSentinel.setAttribute("aria-hidden", "true");
    loadSentinel.style.height = "1px";
    tableWrapper.appendChild(loadSentinel);
    root.appendChild(tableWrapper);

    // Infinite-scroll trigger.
    // The user sees only the table's single scrollbar.
    let loadObserver: IntersectionObserver | undefined;

    const tryLoadMore = (): void => {
      if (this.loadTriggered || loadingMore || !more) {
        return;
      }

      const distanceFromBottom =
        tableWrapper.scrollHeight -
        tableWrapper.scrollTop -
        tableWrapper.clientHeight;

      if (distanceFromBottom <= 200) {
        this.loadTriggered = true;
        loadObserver?.disconnect();
        actions.loadMore().finally(() => {
          this.loadTriggered = false;
        });
      }
    };

    tableWrapper.addEventListener("scroll", tryLoadMore, { passive: true });

    // Also fill the viewport when a batch is too short to create a scrollbar.
    // The observer uses the table scroller as its root, so it cannot create a
    // second scrollbar or trigger while the sentinel is outside this grid.
    if (more && !loadingMore && !loadingDetails && "IntersectionObserver" in window) {
      loadObserver = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          tryLoadMore();
        }
      }, { root: tableWrapper, rootMargin: "0px 0px 200px 0px" });
      loadObserver.observe(loadSentinel);
    }

    // Footer: no page numbers/buttons.
    const footer = document.createElement("div");
    footer.className = "fluent-grid-footer";

    const rowsCount = document.createElement("div");
    rowsCount.className = "fluent-rows-count";
    rowsCount.textContent = more
      ? `Loaded: ${rows.length}`
      : `Rows: ${rows.length}`;

    footer.appendChild(rowsCount);

    const status = document.createElement("div");
    status.className = "fluent-scroll-status";

    if (loadingMore || loadingDetails) {
      const indicator = document.createElement("span");
      indicator.setAttribute("aria-hidden", "true");
      indicator.style.display = "inline-block";
      indicator.style.width = "10px";
      indicator.style.height = "10px";
      indicator.style.marginRight = "6px";
      indicator.style.border = "2px solid #c8c6c4";
      indicator.style.borderTopColor = "#0078d4";
      indicator.style.borderRadius = "50%";
      indicator.animate(
        [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }],
        { duration: 800, iterations: Infinity }
      );
      status.append(
        indicator,
        document.createTextNode(loadingMore ? "Loading more…" : "Loading opportunities…")
      );
    } else if (more) {
      status.textContent = "Scroll down to load more";
    } else {
      status.textContent = "All records loaded";
    }

    footer.appendChild(status);

    const refreshButton = document.createElement("button");
    refreshButton.type = "button";
    refreshButton.className = "command-btn";
    refreshButton.title = "Refresh opportunities";
    refreshButton.setAttribute("aria-label", "Refresh opportunities");
    refreshButton.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none"
           stroke="currentColor" stroke-width="1.3">
        <path d="M13 8A5 5 0 1 1 8 3" stroke-linecap="round"/>
        <path d="M13 3v3h-3" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    refreshButton.onclick = () => actions.refresh();
    footer.appendChild(refreshButton);

    root.appendChild(footer);

    // Restore scroll position after the new batch is rendered.
    const restoreScrollTop = this.preserveScrollTop
      ? this.savedScrollTop
      : 0;

    this.preserveScrollTop = true;

    requestAnimationFrame(() => {
      // Restore only this render's element. A later render may have already
      // replaced it while a page load was completing.
      tableWrapper.scrollTop = restoreScrollTop;
    });

    return root;
  }

  private updateRowCheckboxes(table: HTMLElement): void {
    const checkboxes =
      table.querySelectorAll<HTMLInputElement>(".row-selector");

    checkboxes.forEach(cb => {
      const id = cb.dataset.id;

      if (id) {
        cb.checked = this.selectedIds.has(id);

        const row = cb.closest("tr");

        if (row) {
          if (cb.checked) {
            row.classList.add("selected");
          } else {
            row.classList.remove("selected");
          }
        }
      }
    });
  }

  private moveColumn(key: string, offset: number): void {
    const index = this.columnOrder.indexOf(key);
    const target = index + offset;
    if (index < 0 || target < 0 || target >= this.columnOrder.length) return;
    this.columnOrder.splice(index, 1);
    this.columnOrder.splice(target, 0, key);
  }

  private formatDate(d: Date): string {
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();

    return `${day}-${month}-${year}`;
  }
}
