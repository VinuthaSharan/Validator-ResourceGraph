const fs = require("fs");
const path = require("path");

const appRoot = path.resolve(__dirname, "..");
const settingsPath = path.join(appRoot, "local.settings.json");

if (fs.existsSync(settingsPath)) {
  const { Values = {} } = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
  for (const [key, value] of Object.entries(Values)) {
    if (process.env[key] === undefined) {
      process.env[key] = String(value);
    }
  }
}

const { runComplianceScan } = require("../src/compliance/scanner");

runComplianceScan()
  .then((summary) => {
    console.log(JSON.stringify(summary, null, 2));
    process.exit(summary.failCount > 0 ? 2 : 0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
