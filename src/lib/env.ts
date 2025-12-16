export function applyEnvDefaults() {
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = "file:./data/tally-stockviewer.db";
  }
  if (!process.env.DEFAULT_EXPORT_PATH) {
    process.env.DEFAULT_EXPORT_PATH = "C:\\Tally.ERP9\\Export\\GdwnSum.xlsx";
  }
}
