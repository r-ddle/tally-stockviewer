Local web app to import a Tally “Godown Summary” export (XLSX or XML), sync stock into a local SQLite database, and browse products with search/filters plus DB-backed dealer prices.

## Getting Started

Install deps and run the dev server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Daily use

- Open `/` (Dashboard). The app checks the default export path and auto-loads if the file is newer than your last load.
- Click **Load latest export (default path)** to force a refresh, or **Upload file (.xlsx/.xml)** to import any file.
- Use `/products` to search, filter by brand/availability, and edit **Dealer price** (stored locally and never overwritten by imports).

## Sample fixture

- `public/fixtures/GdwnSum.xml` can be imported via **Load sample XML**.
- `public/fixtures/GdwnSum.xlsx` can be imported via **Load sample XLSX**.

## Notes
- Stock quantities come from the export; prices do not.
- If `Dealer price` exists: retail = dealer / 0.75, daraz = dealer / 0.6, customer = retail * 0.90, institution = retail * 0.85.
- Configure `DEFAULT_EXPORT_PATH` and `DATABASE_URL` via `.env.local` (see `.env.example`).
