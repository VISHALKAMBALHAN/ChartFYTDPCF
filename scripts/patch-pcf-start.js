/*
 * pcf-start 1.51.1 maps the `/` route directly to its package folder. That
 * intercepts ControlManifest.xml and bundle.js before BrowserSync can serve
 * the compiled control output. Serve both folders as static roots instead.
 */
const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "node_modules", "pcf-start", "bin", "pcf-start.js");
if (!fs.existsSync(file)) process.exit(0);
const original = fs.readFileSync(file, "utf8");
const fixed = `baseDir: [path.resolve(process.cwd(), codePath), path.join(__dirname, "../")],`;
if (original.includes(fixed)) process.exit(0);
const patched = original.replace(
  /baseDir: path\.resolve\(process\.cwd\(\), codePath\),\s*routes: \{\s*"\/": path\.join\(__dirname, "\.\.\/"\),\s*\},/m,
  fixed
);
if (patched === original) {
  console.warn("pcf-start layout changed; local harness patch was not applied.");
  process.exit(0);
}
fs.writeFileSync(file, patched);
console.log("Patched pcf-start static roots for the local PCF harness.");
