import { OpportunityRow } from "../models/Types";
import { formatCurrency } from "./Chart";

export class DetailGrid {
  private selectedIds: Set<string> = new Set();

  public render(
    rows: OpportunityRow[],
    page: number,
    totalCount: number,
    more: boolean,
    actions: {
      refresh(): void;
      changePage(value: number): void;
      onRowSelect?(row: OpportunityRow): void;
    }
  ): HTMLElement {
    const root = document.createElement("div");
    root.className = "fluent-grid-container";

    const tableWrapper = document.createElement("div");
    tableWrapper.className = "fluent-table-wrapper";

    const table = document.createElement("table");
    table.className = "fluent-table";

    // Table Header
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    // Master Select Checkbox
    const thCheck = document.createElement("th");
    thCheck.className = "col-checkbox";
    const masterCheck = document.createElement("input");
    masterCheck.type = "checkbox";
    masterCheck.className = "fluent-checkbox";
    masterCheck.setAttribute("aria-label", "Select all records");
    masterCheck.checked = rows.length > 0 && rows.every(r => this.selectedIds.has(r.id));
    masterCheck.onchange = () => {
      if (masterCheck.checked) {
        rows.forEach(r => this.selectedIds.add(r.id));
      } else {
        this.selectedIds.clear();
      }
      this.updateRowCheckboxes(table);
    };
    thCheck.appendChild(masterCheck);
    headerRow.appendChild(thCheck);

    // Columns matching screenshot: Topic ↑⌵, Potential Customer ⌵, Email Address ⌵, Status ⌵, Actual Close Date ⌵, Actual Revenue ⌵
    const columns = [
      { key: "name", label: "Topic", sortIcon: true, hasFilter: true },
      { key: "customer", label: "Potential Customer", sortIcon: false, hasFilter: true, truncateLabel: "Potenti..." },
      { key: "email", label: "Email Address", sortIcon: false, hasFilter: true, truncateLabel: "Email A..." },
      { key: "status", label: "Status", sortIcon: false, hasFilter: true },
      { key: "closeDate", label: "Actual Close Date", sortIcon: false, hasFilter: true, truncateLabel: "Actual ..." },
      { key: "revenue", label: "Actual Revenue", sortIcon: false, hasFilter: true, truncateLabel: "Actual R..." }
    ];

    columns.forEach(col => {
      const th = document.createElement("th");
      th.className = `col-${col.key}`;
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
          <svg width="10" height="12" viewBox="0 0 10 12" fill="none" stroke="#323130" stroke-width="1.3">
            <path d="M5 11V1M5 1L2 4M5 1L8 4" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        `;
        headerContent.appendChild(sort);
      }

      if (col.hasFilter) {
        const chevron = document.createElement("span");
        chevron.className = "th-chevron";
        chevron.innerHTML = `
          <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
            <path d="M2 3.5L5 6.5L8 3.5" stroke="#605e5c" stroke-width="1.3" stroke-linecap="round"/>
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
      emptyRow.innerHTML = `<td colspan="7" class="empty-cell">No opportunities found for the selected view.</td>`;
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
          masterCheck.checked = rows.every(r => this.selectedIds.has(r.id));
        };
        tdCheck.appendChild(rowCheck);
        tr.appendChild(tdCheck);

        // Topic (Name) - Link
        const tdTopic = document.createElement("td");
        tdTopic.className = "col-topic";
        const topicLink = document.createElement("a");
        topicLink.className = "fluent-link";
        topicLink.textContent = row.name;
        topicLink.href = "javascript:void(0)";
        topicLink.title = row.name;
        tdTopic.appendChild(topicLink);
        tr.appendChild(tdTopic);

        // Potential Customer - Link
        const tdCustomer = document.createElement("td");
        tdCustomer.className = "col-customer";
        if (row.customer && row.customer !== "—") {
          const custLink = document.createElement("a");
          custLink.className = "fluent-link";
          custLink.textContent = row.customer;
          custLink.href = "javascript:void(0)";
          custLink.title = row.customer;
          tdCustomer.appendChild(custLink);
        } else {
          tdCustomer.textContent = "";
        }
        tr.appendChild(tdCustomer);

        // Email Address
        const tdEmail = document.createElement("td");
        tdEmail.className = "col-email";
        tdEmail.textContent = row.email || "";
        tr.appendChild(tdEmail);

        // Status
        const tdStatus = document.createElement("td");
        tdStatus.className = "col-status";
        tdStatus.textContent = row.status;
        tr.appendChild(tdStatus);

        // Actual Close Date
        const tdDate = document.createElement("td");
        tdDate.className = "col-date";
        tdDate.textContent = row.closeDate ? this.formatDate(row.closeDate) : "";
        tr.appendChild(tdDate);

        // Actual Revenue
        const tdRevenue = document.createElement("td");
        tdRevenue.className = "col-revenue";
        tdRevenue.textContent = row.revenue > 0 ? formatCurrency(row.revenue) : "";
        tr.appendChild(tdRevenue);

        tbody.appendChild(tr);
      });
    }

    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    root.appendChild(tableWrapper);

    // Footer Bar with "Rows: 5000+" and Pagination
    const footer = document.createElement("div");
    footer.className = "fluent-grid-footer";

    const rowsCount = document.createElement("div");
    rowsCount.className = "fluent-rows-count";
    rowsCount.textContent = totalCount >= 5000 ? "Rows: 5000+" : `Rows: ${rows.length}`;
    footer.appendChild(rowsCount);

    const pager = document.createElement("div");
    pager.className = "fluent-pager";

    const prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.className = "pager-button";
    prevBtn.textContent = "‹";
    prevBtn.title = "Previous page";
    prevBtn.disabled = page <= 1;
    prevBtn.onclick = () => actions.changePage(page - 1);

    const pageIndicator = document.createElement("span");
    pageIndicator.className = "pager-indicator";
    pageIndicator.textContent = `Page ${page}`;

    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.className = "pager-button";
    nextBtn.textContent = "›";
    nextBtn.title = "Next page";
    nextBtn.disabled = !more;
    nextBtn.onclick = () => actions.changePage(page + 1);

    pager.append(prevBtn, pageIndicator, nextBtn);
    footer.appendChild(pager);

    root.appendChild(footer);
    return root;
  }

  private updateRowCheckboxes(table: HTMLElement): void {
    const checkboxes = table.querySelectorAll<HTMLInputElement>(".row-selector");
    checkboxes.forEach(cb => {
      const id = cb.dataset.id;
      if (id) {
        cb.checked = this.selectedIds.has(id);
        const row = cb.closest("tr");
        if (row) {
          if (cb.checked) row.classList.add("selected");
          else row.classList.remove("selected");
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
