# Smart Reconciliation Visualizer

Interactive dashboard to reconcile two financial datasets (e.g., purchase vs sales register) with explainable differences and audit-friendly exports.


- Which records match
- Which records mismatch (and why)
- Which records are missing from either dataset
- Search/filter through results and drill into raw rows

## Quickstart

### Prerequisites

- Node.js 18+ (recommended)

### Install & run

```bash
npm install
npm run dev
```

Open http://localhost:3000

### Production build

```bash
npm run build
npm run start
```

## How to use

1. Load data into **Dataset A** and **Dataset B** (upload a `.csv` / `.json` file, or paste text).
2. Pick **Key columns** (used to pair rows across A and B).
3. Pick **Compare columns** (fields to check for equality).
4. Use tabs (**Overview / Mismatches / Missing / Matches / Invalid**) and the search box to explore.

### Supported input formats

- **CSV** with headers
- **JSON** array of objects, e.g. `[{"id":"1","amount":100}, ...]`
- **JSON** 2D array (first row headers)

## Matching logic (approach)

This implementation is intentionally transparent and configurable.

### 1) Pairing rows (finding “matches”)

- Build a composite key from the selected **Key columns**:
	- Each key part is normalized (trim; optional case-insensitive)
	- Key = `col1|col2|...`
- Index each dataset as `key -> [rowIndex1, rowIndex2, ...]`
- For each key:
	- Pair rows in input order (first A with first B, etc.)
	- Extra rows become **Missing** on the other side

### 2) Explaining mismatches (“and why”)

For each paired row, compare the selected **Compare columns**:

- If both sides look numeric, compare using **Numeric tolerance** (e.g., tolerance 1 allows 100 vs 99.2 to still match)
- Otherwise compare as normalized strings (optional case-insensitive)

If any fields differ, the pair is classified as a **Mismatch** with a per-field diff list.

### 3) Invalid and duplicate handling

- **Invalid rows**: rows missing one or more key values
- **Duplicate keys**: when a key occurs multiple times in a dataset (reported; pairing still proceeds in input order)

## UX decisions

- “Load sample” buttons make the demo usable immediately.
- Tabbed results + global search provide fast exploration.
- “View rows” drill-down shows raw A/B row JSON for auditability.

## Assumptions

- The user can identify which columns form a stable key (invoice id, transaction id, etc.).
- Date normalization can vary by source; this version treats dates as strings unless the user normalizes upstream.
- Currency/amount strings are compared numerically where possible; other formats are compared as strings.

## Tech choices

- Next.js App Router (client-side dashboard)
- TypeScript + strict mode
- Tailwind CSS v4
- PapaParse for robust CSV ingestion

## Deployment (Vercel)

1. Push this repo to GitHub.
2. Import it into Vercel.
3. Build command: `npm run build`
4. Output: Next.js default

## Live demo URL

Add your deployment URL here after shipping.
