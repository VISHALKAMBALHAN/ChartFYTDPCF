import { OpportunityRow } from "../models/Types";
import { formatCurrency } from "./Chart";

export class DetailGrid {
  private selectedIds: Set<string> = new Set();
  private scrollContainer?: HTMLElement;
  private savedScrollTop = 0;
  private preserveScrollTop = true;

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
    },
    hiddenColumns: Set<string> = new Set()
  ): HTMLElement {
    // Keep the current scroll position when another Dataverse batch is appended.
    if (this.scrollContainer && this.preserveScrollTop) {
      this.savedScrollTop = this.scrollContainer.scrollTop;
    }

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

    columns.forEach(col => {
      const th = document.createElement("th");
      th.className = `col-${col.key}`;
      th.hidden = hiddenColumns.has(col.key);
      th.style.position = "sticky";
      th.style.top = "0";
      th.style.zIndex = "2";

      const headerContent = document.createElement("div");
      headerContent.className = "th-content";

      const text = document.createElement("span");
      text.className = "th-label";
      text.textContent = col.truncateLabel || col.label;
      text.title = col.label;
      headerContent.appendChild(text);

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

      if (col.hasFilter) {
        const chevron = document.createElement("span");
        chevron.className = "th-chevron";
        chevron.innerHTML = `
          <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
            <path d="M2 3.5L5 6.5L8 3.5"
                  stroke="#605e5c" stroke-width="1.3"
                  stroke-linecap="round"/>
          </svg>
        `;
        headerContent.appendChild(chevron);
      }

      th.appendChild(headerContent);
      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Table Body
    const tbody = document.createElement("tbody");

    if (!rows.length) {
      const emptyRow = document.createElement("tr");
      emptyRow.className = "empty-row";
      emptyRow.innerHTML =
        `<td colspan="7" class="empty-cell">${loadingDetails ? "Loading opportunities..." : "No opportunities found for the selected view."}</td>`;
      tbody.appendChild(emptyRow);
    } else {
      rows.forEach(row => {
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

        tbody.appendChild(tr);
      });
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
    let loadTriggered = false;
    let loadObserver: IntersectionObserver | undefined;

    const tryLoadMore = (): void => {
      if (loadTriggered || loadingMore || !more) {
        return;
      }

      const distanceFromBottom =
        tableWrapper.scrollHeight -
        tableWrapper.scrollTop -
        tableWrapper.clientHeight;

      if (distanceFromBottom <= 200) {
        loadTriggered = true;
        loadObserver?.disconnect();
        actions.loadMore().finally(() => {
          loadTriggered = false;
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

  private formatDate(d: Date): string {
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();

    return `${day}-${month}-${year}`;
  }
}
