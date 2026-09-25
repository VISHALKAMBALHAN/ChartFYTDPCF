# Opportunity FYTD Comparison PCF

An interactive Power Apps Component Framework (PCF) dataset control for comparing Dataverse Opportunity performance across the current and previous fiscal years. It calculates fiscal year-to-date revenue by Opportunity status, compares Q1 renewal-license totals, and provides an accessible, paged drill-down grid.

The control queries Dataverse with server-side FetchXML filters, supports configurable fiscal-year boundaries and field names, and avoids unreliable Dynamics chart drill-through by querying the exact period selected by the user.

## Project layout

- `FiscalYearComparison/utils/FiscalDate.ts` — reusable April–March fiscal calculations.
- `FiscalYearComparison/services/DataverseService.ts` — aggregate and paged drill-down FetchXML queries.
- `FiscalYearComparison/components` — chart and accessible detail grid.
- `ControlManifest.Input.xml` — dataset binding and configurable fields.

## Build

```powershell
npm install
npm run build
```

Run the unit tests with `npm test`. The fiscal utility tests cover the requested April 1, June 30, September 16, and January crossover behavior.

For the local PCF harness, run `npm start` and browse to the localhost URL printed by BrowserSync (normally `http://localhost:8181`). This project declares both `pcf-scripts` and its matching `pcf-start` package explicitly; recent PCF tooling versions require that harness package to be installed separately. A post-install script corrects a `pcf-start` 1.51 static-route issue that otherwise returns 404 for `ControlManifest.xml` and leaves the harness blank.

## Create and package a Dataverse solution

Run these from the project parent. Replace `YOUR-PUBLISHER` and the environment URL.

```powershell
pac auth create --url https://YOURORG.crm.dynamics.com
mkdir OpportunityFYTDComparisonSolution
cd .\OpportunityFYTDComparisonSolution
pac solution init --publisher-name "Your Publisher" --publisher-prefix YOURPREFIX
pac solution add-reference --path ..\charPCF\OpportunityFYTDComparisonPCF.pcfproj
msbuild /t:build /restore
```

Import the resulting managed or unmanaged solution ZIP through Power Apps > Solutions > Import. For CI, use `pac solution import --path .\bin\Debug\YourSolution.zip`.

## Add to an Opportunity view

1. In a model-driven app, open the Opportunity table and select the target view.
2. Select **Components** / **Add control**, then choose **Opportunity FYTD Comparison**.
3. Bind the `opportunities` dataset to the Opportunity view. Include `name`, `actualclosedate`, and `actualvalue` in its columns; the control obtains the remaining drill-down fields through Web API.
4. Configure fiscal start month/day (defaults: 4/1), logical fields, and Won status value (default: 1). Publish the app.

The app user needs read access to Opportunity, Account, and User tables plus the configured columns. The component reads only required columns, aggregates revenue server-side, and retrieves drill-down rows in 25-row pages.

## Drill-down verification

With the device date set to 16 September 2026, select any **Previous FY** bar. Confirm the header is FY2025, 1 Apr 2025–16 Sep 2025, and every row has `statecode = 1` and an `actualclosedate` in that inclusive range. Selecting **Current FY** must instead return 1 Apr 2026–16 Sep 2026. Records after 16 September must not appear.

## Troubleshooting

- **Could not load comparison:** verify the manifest’s Web API feature and the user’s table/column permissions.
- **No data:** confirm Opportunities are Won (`statecode=1`), have an actual close date, and have a non-null revenue value in the selected period.
- **Date appears one day off:** configure `actualclosedate` as a Date Only field where possible. The control sends FetchXML date-only boundaries to avoid client timezone shifts.
- **Control missing from designer:** build the project, add it to a solution, import/publish the solution, then refresh the maker portal.
