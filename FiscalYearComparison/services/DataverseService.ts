// import { FiscalConfig, FiscalPeriod, OpportunityRow, RenewalLicenseComparison, StatusRevenue } from "../models/Types";
// import { toDateOnly } from "../utils/FiscalDate";

// type WebApi = ComponentFramework.WebApi;

// const escapeXml = (text: string) =>
//   text.replace(/[<>&'"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c] as string));

// const fetch = (xml: string) => `?fetchXml=${encodeURIComponent(xml)}`;

// const getFormatted = (row: Record<string, unknown>, logical: string): string =>
//   String(row[`_${logical}_value@OData.Community.Display.V1.FormattedValue`] || row[`${logical}@OData.Community.Display.V1.FormattedValue`] || "");

// export class OpportunityService {
//   public constructor(private readonly api: WebApi, private readonly config: FiscalConfig) {}

//   /**
//    * Safe check for WebAPI retrieveMultipleRecords support.
//    * In the local PCF test harness (pcf-start), WebApi methods are stubbed and throw "Method not implemented".
//    */
//   private isWebApiAvailable(): boolean {
//     return Boolean(this.api && typeof this.api.retrieveMultipleRecords === "function");
//   }

//   /**
//    * Retrieves the Organization's fiscal calendar configuration from Dataverse.
//    * If fiscalcalendarstart is set, returns startMonth and startDay.
//    * Falls back to undefined if in test harness or permission is lacking.
//    */
//   public async getOrgFiscalSettings(): Promise<{ startMonth: number; startDay: number } | undefined> {
//     if (!this.isWebApiAvailable()) return undefined;
//     try {
//       const result = await this.api.retrieveMultipleRecords(
//         "organization",
//         "?$select=fiscalcalendarstart,fiscalsettingsupdated"
//       );
//       if (result && result.entities && result.entities.length > 0) {
//         const org = result.entities[0];
//         if (org.fiscalcalendarstart) {
//           const date = new Date(String(org.fiscalcalendarstart));
//           if (!isNaN(date.getTime())) {
//             return {
//               startMonth: date.getUTCMonth() + 1,
//               startDay: date.getUTCDate()
//             };
//           }
//         }
//       }
//     } catch {
//       // In offline harness or restricted permissions, continue with manifest/configured defaults
//     }
//     return undefined;
//   }

//   private filter(period?: FiscalPeriod, status?: number): string {
//     const conditions: string[] = [];
//     if (status !== undefined) {
//       conditions.push(`<condition attribute='${escapeXml(this.config.statusField)}' operator='eq' value='${status}'/>`);
//     }
//     if (period) {
//       conditions.push(`<condition attribute='${escapeXml(this.config.closeDateField)}' operator='on-or-after' value='${toDateOnly(period.start)}'/>`);
//       conditions.push(`<condition attribute='${escapeXml(this.config.closeDateField)}' operator='on-or-before' value='${toDateOnly(period.end)}'/>`);
//     }
//     return conditions.length ? `<filter type='and'>${conditions.join("")}</filter>` : "";
//   }

//   public async getStatusRevenue(periods: FiscalPeriod[]): Promise<StatusRevenue[]> {
//     const statuses = [
//       { status: 0, label: "Open" },
//       { status: this.config.wonStatus, label: "Won" },
//       { status: 2, label: "Lost" }
//     ].map(item => ({ ...item, current: 0, previous: 0 }));

//     if (!this.isWebApiAvailable()) {
//       return statuses;
//     }

//     try {
//       for (const period of periods) {
//         for (const item of statuses) {
//           try {
//             const xml = `<fetch aggregate='true'><entity name='opportunity'><attribute name='${escapeXml(this.config.revenueField)}' alias='revenue' aggregate='sum'/>${this.filter(period, item.status)}</entity></fetch>`;
//             const result = await this.api.retrieveMultipleRecords("opportunity", fetch(xml));
//             item[period.key] = Number(result?.entities?.[0]?.revenue || 0);
//           } catch {
//             item[period.key] = 0;
//           }
//         }
//       }
//       return statuses;
//     } catch {
//       return statuses;
//     }
//   }

//   /**
//    * Retrieves aggregated license count grouped by renewal type for Current FY Q1 vs Previous FY Q1.
//    * Faithful reproduction of Dynamics 365 visualization:
//    * Entity: opportunity
//    * Measure: SUM(new_noofusers1licences)
//    * Groupby: new_newrenewal
//    * Date grouping: actualclosedate in fiscal Q1
//    */
//   public async getRenewalLicenseComparison(q1Periods: FiscalPeriod[]): Promise<RenewalLicenseComparison[]> {
//     if (!this.isWebApiAvailable()) {
//       return this.getMockRenewalComparison();
//     }

//     const currentQ1 = q1Periods.find(p => p.key === "current");
//     const prevQ1 = q1Periods.find(p => p.key === "previous");

//     const categoryMap = new Map<string, { currentFYQ1: number; previousFYQ1: number }>();

//     const queryPeriod = async (period: FiscalPeriod, prop: "currentFYQ1" | "previousFYQ1") => {
//       const xml = `<fetch aggregate='true'>
//         <entity name='opportunity'>
//           <attribute name='new_noofusers1licences' aggregate='sum' alias='total_licences'/>
//           <attribute name='new_newrenewal' groupby='true' alias='renewal_category'/>
//           <filter type='and'>
//             <condition attribute='actualclosedate' operator='on-or-after' value='${toDateOnly(period.start)}'/>
//             <condition attribute='actualclosedate' operator='on-or-before' value='${toDateOnly(period.end)}'/>
//           </filter>
//         </entity>
//       </fetch>`;

//       const result = await this.api.retrieveMultipleRecords("opportunity", fetch(xml));
//       if (result && result.entities && result.entities.length > 0) {
//         for (const entity of result.entities) {
//           const categoryRaw = entity["renewal_category@OData.Community.Display.V1.FormattedValue"] ||
//             entity["renewal_category"] ||
//             "Unspecified";
//           const category = String(categoryRaw).trim() || "Unspecified";
//           const sumVal = Number(entity["total_licences"] || 0);

//           if (!categoryMap.has(category)) {
//             categoryMap.set(category, { currentFYQ1: 0, previousFYQ1: 0 });
//           }
//           const item = categoryMap.get(category)!;
//           item[prop] = sumVal;
//         }
//       }
//     };

//     try {
//       if (currentQ1) await queryPeriod(currentQ1, "currentFYQ1");
//       if (prevQ1) await queryPeriod(prevQ1, "previousFYQ1");

//       const rows: RenewalLicenseComparison[] = [];
//       for (const [category, values] of categoryMap.entries()) {
//         rows.push({
//           category,
//           currentFYQ1: values.currentFYQ1,
//           previousFYQ1: values.previousFYQ1
//         });
//       }

//       if (rows.length > 0) {
//         return rows;
//       }
//       return this.getMockRenewalComparison();
//     } catch {
//       // Fallback sample mock data if running in test harness / offline
//       return this.getMockRenewalComparison();
//     }
//   }

//   private getMockRenewalComparison(): RenewalLicenseComparison[] {
//     return [
//       { category: "Renewal", currentFYQ1: 125, previousFYQ1: 98 },
//       { category: "New Business", currentFYQ1: 210, previousFYQ1: 175 },
//       { category: "Upsell", currentFYQ1: 85, previousFYQ1: 64 }
//     ];
//   }

//   public async getDetails(
//     period: FiscalPeriod | undefined,
//     status: number | undefined,
//     page: number,
//     pageSize: number,
//     search: string
//   ): Promise<{ rows: OpportunityRow[]; totalCountEstimate: number; more: boolean }> {
//     if (!this.isWebApiAvailable()) {
//       return this.getMockRows(search);
//     }

//     const safeSearch = search
//       ? `<filter type='or'><condition attribute='name' operator='like' value='%${escapeXml(search)}%'/><condition attribute='customerid' operator='like' value='%${escapeXml(search)}%'/></filter>`
//       : "";

//     const xml = `<fetch page='${page}' count='${pageSize}'>
//       <entity name='opportunity'>
//         <attribute name='opportunityid'/>
//         <attribute name='name'/>
//         <attribute name='${escapeXml(this.config.closeDateField)}'/>
//         <attribute name='${escapeXml(this.config.revenueField)}'/>
//         <attribute name='ownerid'/>
//         <attribute name='parentaccountid'/>
//         <attribute name='customerid'/>
//         <attribute name='emailaddress'/>
//         <attribute name='${escapeXml(this.config.statusField)}'/>
//         <order attribute='${escapeXml(this.config.closeDateField)}' descending='true'/>
//         ${this.filter(period, status)}
//         ${safeSearch}
//       </entity>
//     </fetch>`;

//     try {
//       const result = await this.api.retrieveMultipleRecords("opportunity", fetch(xml));
//       const rows: OpportunityRow[] = result.entities.map((x: Record<string, unknown>) => {
//         const customerName =
//           getFormatted(x, "customerid") ||
//           getFormatted(x, "parentaccountid") ||
//           String(x["customerid_account"] || x["parentaccountid"] || "—");

//         const statusRaw = x[this.config.statusField];
//         let statusStr = getFormatted(x, this.config.statusField);
//         if (!statusStr || statusStr === "—") {
//           statusStr = statusRaw === 1 || statusRaw === this.config.wonStatus ? "Won" : statusRaw === 2 ? "Lost" : "Open";
//         }

//         return {
//           id: String(x.opportunityid || ""),
//           name: String(x.name || "Untitled"),
//           customer: customerName,
//           email: String(x.emailaddress || x["parentcontactid_contact.emailaddress1"] || ""),
//           closeDate: x[this.config.closeDateField] ? new Date(String(x[this.config.closeDateField])) : null,
//           revenue: Number(x[this.config.revenueField] || 0),
//           owner: getFormatted(x, "ownerid") || "System",
//           status: statusStr,
//           statusValue: typeof statusRaw === "number" ? statusRaw : undefined
//         };
//       });

//       return {
//         rows,
//         totalCountEstimate: 5000,
//         more: result.nextLink !== undefined
//       };
//     } catch {
//       // Fallback sample mock data if running in test harness / offline without Dataverse connection
//       return this.getMockRows(search);
//     }
//   }

//   private getMockRows(search: string): { rows: OpportunityRow[]; totalCountEstimate: number; more: boolean } {
//     const mockRows: OpportunityRow[] = [
//       { id: "1", name: "Commissioner of ...", customer: "Commissi...", email: "", closeDate: new Date("2020-04-27"), revenue: 10000000, owner: "Admin", status: "Won", statusValue: 1 },
//       { id: "2", name: "High Court of Cal...", customer: "High Cou...", email: "", closeDate: new Date("2019-12-16"), revenue: 825000, owner: "Admin", status: "Won", statusValue: 1 },
//       { id: "3", name: "Ministry of Law &...", customer: "Ministry o...", email: "", closeDate: new Date("2019-12-23"), revenue: 55000, owner: "Admin", status: "Won", statusValue: 1 },
//       { id: "4", name: "S.K. Singhi & Co (...", customer: "S.K. Singh...", email: "", closeDate: new Date("2020-04-20"), revenue: 150000, owner: "Admin", status: "Won", statusValue: 1 },
//       { id: "5", name: "Srenik Singhvi, Ko...", customer: "Srenik Sin...", email: "", closeDate: new Date("2019-12-31"), revenue: 1267000, owner: "Admin", status: "Won", statusValue: 1 },
//       { id: "6", name: "Syamaprosad Sar...", customer: "Syamapro...", email: "", closeDate: new Date("2019-12-31"), revenue: 1267000, owner: "Admin", status: "Won", statusValue: 1 },
//       { id: "7", name: "Anis Raja, Lucknow", customer: "Anis Raja,...", email: "", closeDate: null, revenue: 0, owner: "Admin", status: "Open", statusValue: 0 }
//     ];

//     const filtered = search
//       ? mockRows.filter(r => r.name.toLowerCase().includes(search.toLowerCase()) || r.customer.toLowerCase().includes(search.toLowerCase()))
//       : mockRows;

//     return {
//       rows: filtered,
//       totalCountEstimate: 5000,
//       more: false
//     };
//   }
// }

import {
  FiscalConfig,
  FiscalPeriod,
  OpportunityRow,
  RenewalLicenseComparison,
  StatusRevenue
} from "../models/Types";

import { toDateOnly } from "../utils/FiscalDate";

type WebApi = ComponentFramework.WebApi;

const escapeXml = (text: string) =>
  text.replace(
    /[<>&'"]/g,
    c =>
    ({
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      "'": "&apos;",
      '"': "&quot;"
    }[c] as string)
  );

const fetch = (xml: string) =>
  `?fetchXml=${encodeURIComponent(xml)}`;

const decodeXmlEntities = (text: string): string =>
  text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

const getFormatted = (
  row: Record<string, unknown>,
  logical: string
): string =>
  String(
    row[`_${logical}_value@OData.Community.Display.V1.FormattedValue`] ||
    row[`${logical}@OData.Community.Display.V1.FormattedValue`] ||
    ""
  );

export class OpportunityService {
  public constructor(
    private readonly api: WebApi,
    private readonly config: FiscalConfig
  ) { }

  /**
   * Checks whether Dataverse Web API is available.
   */
  private isWebApiAvailable(): boolean {
    return Boolean(
      this.api &&
      typeof this.api.retrieveMultipleRecords === "function"
    );
  }

  /**
   * Gets the organization's fiscal year start date.
   */
  public async getOrgFiscalSettings(): Promise<
    { startMonth: number; startDay: number } | undefined
  > {
    if (!this.isWebApiAvailable()) {
      return undefined;
    }

    try {
      const result = await this.api.retrieveMultipleRecords(
        "organization",
        "?$select=fiscalcalendarstart,fiscalsettingsupdated"
      );

      if (
        result &&
        result.entities &&
        result.entities.length > 0
      ) {
        const org = result.entities[0];

        if (org.fiscalcalendarstart) {
          const date = new Date(
            String(org.fiscalcalendarstart)
          );

          if (!isNaN(date.getTime())) {
            return {
              startMonth: date.getUTCMonth() + 1,
              startDay: date.getUTCDate()
            };
          }
        }
      }
    } catch (error) {
      console.warn(
        "Unable to retrieve organization fiscal settings. Using configured defaults.",
        error
      );
    }

    return undefined;
  }

  /**
   * Builds the date/status filter used by BOTH:
   * 1. Revenue aggregation
   * 2. Detail grid
   *
   * This is important because both must use exactly the same
   * FiscalPeriod boundaries.
   */
  private filter(
    period?: FiscalPeriod,
    status?: number
  ): string {
    const conditions: string[] = [];

    // Status filter
    if (status !== undefined) {
      conditions.push(
        `<condition attribute='${escapeXml(
          this.config.statusField
        )}' operator='eq' value='${status}'/>`
      );
    }

    // Exact FYTD date range
    if (period) {
      const startDate = toDateOnly(period.start);
      const endDate = toDateOnly(period.end);

      console.log("=== FYTD FILTER ===");
      console.log("Period Key:", period.key);
      console.log("Fiscal Year:", period.fiscalYear);
      console.log("Start Date:", startDate);
      console.log("End Date:", endDate);
      console.log("Status:", status);

      conditions.push(
        `<condition attribute='${escapeXml(
          this.config.closeDateField
        )}' operator='on-or-after' value='${startDate}'/>`
      );

      conditions.push(
        `<condition attribute='${escapeXml(
          this.config.closeDateField
        )}' operator='on-or-before' value='${endDate}'/>`
      );
    }

    if (!conditions.length) {
      return "";
    }

    return `<filter type='and'>${conditions.join("")}</filter>`;
  }

  /**
   * Gets revenue totals for Current FYTD and Previous FYTD.
   */
  public async getStatusRevenue(
    periods: FiscalPeriod[]
  ): Promise<StatusRevenue[]> {
    const statuses = [
      {
        status: 0,
        label: "Open"
      },
      {
        status: this.config.wonStatus,
        label: "Won"
      },
      {
        status: 2,
        label: "Lost"
      }
    ].map(item => ({
      ...item,
      current: 0,
      previous: 0
    }));

    if (!this.isWebApiAvailable()) {
      return statuses;
    }

    try {
      for (const period of periods) {
        for (const item of statuses) {
          const xml = `
            <fetch aggregate='true'>
              <entity name='opportunity'>

                <attribute
                  name='${escapeXml(
            this.config.revenueField
          )}'
                  alias='revenue'
                  aggregate='sum'
                />

                ${this.filter(period, item.status)}

              </entity>
            </fetch>
          `;

          console.log(
            "=== REVENUE QUERY ===",
            period.key,
            item.label
          );

          console.log(xml);

          try {
            const result =
              await this.api.retrieveMultipleRecords(
                "opportunity",
                fetch(xml)
              );

            const revenue = Number(
              result?.entities?.[0]?.revenue || 0
            );

            item[period.key] = revenue;

            console.log(
              `${period.key} ${item.label} revenue:`,
              revenue
            );
          } catch (error) {
            console.error(
              `Revenue query failed for ${period.key} / ${item.label}`,
              error
            );

            throw error;
          }
        }
      }

      return statuses;
    } catch (error) {
      console.error(
        "getStatusRevenue failed:",
        error
      );

      throw error;
    }
  }

  /**
   * Retrieves aggregated license count grouped by renewal type
   * for Current FY Q1 vs Previous FY Q1.
   */
  public async getRenewalLicenseComparison(
    q1Periods: FiscalPeriod[]
  ): Promise<RenewalLicenseComparison[]> {
    if (!this.isWebApiAvailable()) {
      return this.getMockRenewalComparison();
    }

    const currentQ1 = q1Periods.find(
      p => p.key === "current"
    );

    const prevQ1 = q1Periods.find(
      p => p.key === "previous"
    );

    const categoryMap = new Map<
      string,
      {
        currentFYQ1: number;
        previousFYQ1: number;
      }
    >();

    const queryPeriod = async (
      period: FiscalPeriod,
      prop: "currentFYQ1" | "previousFYQ1"
    ) => {
      const startDate = toDateOnly(period.start);
      const endDate = toDateOnly(period.end);

      const xml = `
        <fetch aggregate='true'>
          <entity name='opportunity'>

            <attribute
              name='new_noofusers1licences'
              aggregate='sum'
              alias='total_licences'
            />

            <attribute
              name='new_newrenewal'
              groupby='true'
              alias='renewal_category'
            />

            <filter type='and'>

              <condition
                attribute='actualclosedate'
                operator='on-or-after'
                value='${startDate}'
              />

              <condition
                attribute='actualclosedate'
                operator='on-or-before'
                value='${endDate}'
              />

            </filter>

          </entity>
        </fetch>
      `;

      console.log(
        "=== RENEWAL LICENSE QUERY ==="
      );

      console.log(
        "Period:",
        period.key,
        startDate,
        endDate
      );

      console.log(xml);

      const result =
        await this.api.retrieveMultipleRecords(
          "opportunity",
          fetch(xml)
        );

      if (
        result &&
        result.entities &&
        result.entities.length > 0
      ) {
        for (const entity of result.entities) {
          const categoryRaw =
            entity[
            "renewal_category@OData.Community.Display.V1.FormattedValue"
            ] ||
            entity["renewal_category"] ||
            "Unspecified";

          const category =
            String(categoryRaw).trim() ||
            "Unspecified";

          const sumVal = Number(
            entity["total_licences"] || 0
          );

          if (!categoryMap.has(category)) {
            categoryMap.set(category, {
              currentFYQ1: 0,
              previousFYQ1: 0
            });
          }

          const item =
            categoryMap.get(category)!;

          item[prop] = sumVal;
        }
      }
    };

    try {
      if (currentQ1) {
        await queryPeriod(
          currentQ1,
          "currentFYQ1"
        );
      }

      if (prevQ1) {
        await queryPeriod(
          prevQ1,
          "previousFYQ1"
        );
      }

      const rows: RenewalLicenseComparison[] =
        [];

      for (const [
        category,
        values
      ] of categoryMap.entries()) {
        rows.push({
          category,
          currentFYQ1:
            values.currentFYQ1,
          previousFYQ1:
            values.previousFYQ1
        });
      }

      if (rows.length > 0) {
        return rows;
      }

      return this.getMockRenewalComparison();
    } catch (error) {
      console.error(
        "getRenewalLicenseComparison failed:",
        error
      );

      throw error;
    }
  }

  private getMockRenewalComparison(): RenewalLicenseComparison[] {
    return [
      {
        category: "Renewal",
        currentFYQ1: 125,
        previousFYQ1: 98
      },
      {
        category: "New Business",
        currentFYQ1: 210,
        previousFYQ1: 175
      },
      {
        category: "Upsell",
        currentFYQ1: 85,
        previousFYQ1: 64
      }
    ];
  }

  /**
   * Retrieves Opportunity detail records for the selected
   * FYTD period and status.
   */
  public async getDetails(
    period: FiscalPeriod | undefined,
    status: number | undefined,
    page: number,
    pageSize: number,
    search: string,
    pagingCookie?: string
  ): Promise<{
    rows: OpportunityRow[];
    totalCountEstimate: number;
    more: boolean;
    pagingCookie?: string;
  }> {
    if (!this.isWebApiAvailable()) {
      return this.getMockRows(search);
    }

    const safeSearch = search
      ? `
        <filter type='or'>
          <condition
            attribute='name'
            operator='like'
            value='%${escapeXml(search)}%'
          />

          <condition
            attribute='customerid'
            operator='like'
            value='%${escapeXml(search)}%'
          />
        </filter>
      `
      : "";

    /*
     * IMPORTANT:
     * The selected FiscalPeriod is passed directly into filter().
     *
     * Example:
     *
     * Current FYTD
     * 01-Apr-2025 -> 25-Sep-2026
     *
     * The resulting query will contain:
     *
     * actualclosedate >= 2025-04-01
     * actualclosedate <= 2026-09-25
     *
     * It will NOT use "in-fiscal-year".
     *
     * PAGING:
     * Dataverse FetchXML paging requires a paging-cookie obtained
     * from the PREVIOUS page response.  Without the cookie, every
     * page > 1 silently re-returns the same first page of records.
     *
     * The cookie is URL-decoded before embedding in FetchXML
     * (Dataverse returns it percent-encoded inside the @odata.nextLink
     * annotation, but the raw entity bag exposes it decoded via
     * result.fetchXmlPagingCookie if the SDK sets it, otherwise we
     * parse it from nextLink ourselves in the response handler below).
     */

    // Build the optional paging-cookie attribute.
    // encodeURIComponent is NOT applied here – FetchXML expects the
    // raw XML-attribute-escaped value that Dataverse gave us.
    const cookieAttr = pagingCookie
      ? ` paging-cookie='${escapeXml(decodeXmlEntities(pagingCookie))}'`
      : "";

    const xml = `
      <fetch
        page='${page}'
        count='${pageSize}'${cookieAttr}
      >
        <entity name='opportunity'>

          <attribute name='opportunityid'/>
          <attribute name='name'/>

          <attribute
            name='${escapeXml(
      this.config.closeDateField
    )}'
          />

          <attribute
            name='${escapeXml(
      this.config.revenueField
    )}'
          />

          <attribute name='ownerid'/>
          <attribute name='parentaccountid'/>
          <attribute name='customerid'/>
          <attribute name='emailaddress'/>

          <attribute
            name='${escapeXml(
      this.config.statusField
    )}'
          />

          <order
            attribute='${escapeXml(
      this.config.closeDateField
    )}'
            descending='true'
          />

          ${this.filter(period, status)}

          ${safeSearch}

        </entity>
      </fetch>
    `;

    console.log(
      "========================================"
    );

    console.log(
      "=== DETAIL GRID REQUEST ==="
    );

    console.log(
      "Selected Period:",
      period
        ? {
          key: period.key,
          fiscalYear: period.fiscalYear,
          start: toDateOnly(period.start),
          end: toDateOnly(period.end)
        }
        : undefined
    );

    console.log(
      "Selected Status:",
      status
    );

    console.log(
      "Page:",
      page
    );

    console.log(
      "Page Size:",
      pageSize
    );

    console.log(
      "Search:",
      search
    );

    console.log(
      "Generated FetchXML:"
    );

    console.log(xml);

    console.log(
      "========================================"
    );

    try {
      const result =
        await this.api.retrieveMultipleRecords(
          "opportunity",
          fetch(xml)
        );

      console.log(
        "=== DETAIL GRID RESPONSE ==="
      );

      console.log(
        "Returned records:",
        result.entities.length
      );

      console.log(
        "Has next page:",
        result.nextLink !== undefined
      );

      const rows: OpportunityRow[] =
        result.entities.map(
          (x: Record<string, unknown>) => {
            const customerName =
              getFormatted(
                x,
                "customerid"
              ) ||
              getFormatted(
                x,
                "parentaccountid"
              ) ||
              String(
                x["customerid_account"] ||
                x["parentaccountid"] ||
                "—"
              );

            const statusRaw =
              x[this.config.statusField];

            let statusStr =
              getFormatted(
                x,
                this.config.statusField
              );

            if (
              !statusStr ||
              statusStr === "—"
            ) {
              statusStr =
                statusRaw === 1 ||
                  statusRaw ===
                  this.config.wonStatus
                  ? "Won"
                  : statusRaw === 2
                    ? "Lost"
                    : "Open";
            }

            return {
              id: String(
                x.opportunityid || ""
              ),

              name: String(
                x.name || "Untitled"
              ),

              customer: customerName,

              email: String(
                x.emailaddress ||
                x[
                "parentcontactid_contact.emailaddress1"
                ] ||
                ""
              ),

              closeDate:
                x[
                  this.config.closeDateField
                ]
                  ? new Date(
                    String(
                      x[
                      this.config
                        .closeDateField
                      ]
                    )
                  )
                  : null,

              revenue: Number(
                x[
                this.config.revenueField
                ] || 0
              ),

              owner:
                getFormatted(
                  x,
                  "ownerid"
                ) || "System",

              status: statusStr,

              statusValue:
                typeof statusRaw ===
                  "number"
                  ? statusRaw
                  : undefined
            };
          }
        );

      console.log(
        "Mapped grid rows:",
        rows.length
      );

      /*
       * Extract the paging-cookie from the nextLink so the caller
       * can pass it back on the next page request.
       *
       * Dataverse embeds the cookie as a percent-encoded query
       * parameter inside the @odata.nextLink URL:
       *   ...&$skiptoken=<encoded-paging-cookie>
       *
       * We decode it and hand it back as a plain string. The caller
       * stores it and passes it as `pagingCookie` on the next call.
       */
      let nextCookie: string | undefined;

      if (result.nextLink) {
        try {
          const url = new URL(
            result.nextLink.startsWith("http")
              ? result.nextLink
              : `https://placeholder${result.nextLink}`
          );

          // The SDK may surface the cookie directly on the result object.
          // Fall back to parsing from the nextLink URL.
          const rawCookie =
            (result as unknown as Record<string, unknown>)[
              "@Microsoft.Dynamics.CRM.fetchxmlpagingcookie"
            ] as string | undefined;

          if (rawCookie) {
            nextCookie = decodeXmlEntities(rawCookie);
          } else {
            // The skiptoken parameter contains the percent-encoded cookie.
            const skipToken = url.searchParams.get("$skiptoken");
            if (skipToken) {
              nextCookie = decodeURIComponent(skipToken);
            }
          }
        } catch {
          // If URL parsing fails, pagination will restart from page 1
          // (safe degradation — user just won't advance beyond page 1).
          console.warn(
            "Could not parse paging cookie from nextLink:",
            result.nextLink
          );
        }
      }

      console.log(
        "Next paging cookie:",
        nextCookie ? "[present]" : "[none]"
      );

      return {
        rows,
        totalCountEstimate:
          result.entities.length,
        more: Boolean(result.nextLink && nextCookie),
        pagingCookie: nextCookie
      };
    } catch (error) {
      console.error(
        "========================================"
      );

      console.error(
        "=== DETAIL GRID QUERY FAILED ==="
      );

      console.error(
        error
      );

      console.error(
        "FetchXML that failed:"
      );

      console.error(
        xml
      );

      console.error(
        "========================================"
      );

      /*
       * IMPORTANT:
       * Do NOT silently return mock data here.
       *
       * If Dataverse rejects the query, we want the actual
       * error to be visible so we can fix the real problem.
       */
      throw error;
    }
  }

  /**
   * Mock data is retained only for local PCF test harness
   * scenarios where Web API is unavailable.
   */
  private getMockRows(
    search: string
  ): {
    rows: OpportunityRow[];
    totalCountEstimate: number;
    more: boolean;
  } {
    const mockRows: OpportunityRow[] = [
      {
        id: "1",
        name: "Commissioner of ...",
        customer: "Commissi...",
        email: "",
        closeDate: new Date("2020-04-27"),
        revenue: 10000000,
        owner: "Admin",
        status: "Won",
        statusValue: 1
      },
      {
        id: "2",
        name: "High Court of Cal...",
        customer: "High Cou...",
        email: "",
        closeDate: new Date("2019-12-16"),
        revenue: 825000,
        owner: "Admin",
        status: "Won",
        statusValue: 1
      },
      {
        id: "3",
        name: "Ministry of Law &...",
        customer: "Ministry o...",
        email: "",
        closeDate: new Date("2019-12-23"),
        revenue: 55000,
        owner: "Admin",
        status: "Won",
        statusValue: 1
      },
      {
        id: "4",
        name: "S.K. Singhi & Co (...)",
        customer: "S.K. Singh...",
        email: "",
        closeDate: new Date("2020-04-20"),
        revenue: 150000,
        owner: "Admin",
        status: "Won",
        statusValue: 1
      },
      {
        id: "5",
        name: "Srenik Singhvi, Ko...",
        customer: "Srenik Sin...",
        email: "",
        closeDate: new Date("2019-12-31"),
        revenue: 1267000,
        owner: "Admin",
        status: "Won",
        statusValue: 1
      },
      {
        id: "6",
        name: "Syamaprosad Sar...",
        customer: "Syamapro...",
        email: "",
        closeDate: new Date("2019-12-31"),
        revenue: 1267000,
        owner: "Admin",
        status: "Won",
        statusValue: 1
      },
      {
        id: "7",
        name: "Anis Raja, Lucknow",
        customer: "Anis Raja,...",
        email: "",
        closeDate: null,
        revenue: 0,
        owner: "Admin",
        status: "Open",
        statusValue: 0
      }
    ];

    const filtered = search
      ? mockRows.filter(
        r =>
          r.name
            .toLowerCase()
            .includes(
              search.toLowerCase()
            ) ||
          r.customer
            .toLowerCase()
            .includes(
              search.toLowerCase()
            )
      )
      : mockRows;

    return {
      rows: filtered,
      totalCountEstimate:
        filtered.length,
      more: false
    };
  }
}