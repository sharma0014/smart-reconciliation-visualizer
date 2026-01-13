# Smart Reconciliation Visualizer

Interactive dashboard for reconciling two financial datasets (e.g., purchase vs sales registers) with explainable differences and audit-friendly exports.

Upload or paste two datasets, configure matching rules, then explore:
- Which records match
- Which records mismatch (and why)
- Which records are missing from either dataset
- Search, filter, and drill down into raw rows

---

## Quickstart

### Prerequisites
- Node.js 18+ (recommended)

### Install & run
```bash
npm install
npm run dev
Open http://localhost:3000

Production build
bash
Copy code
npm run build
npm run start
How to use
Load data into Dataset A and Dataset B (upload a .csv / .json file, or paste text).

Select Key columns (used to pair rows across A and B).

Select Compare columns (fields checked for equality).

Use tabs (Overview / Mismatches / Missing / Matches / Invalid) and the global search box to explore results.

Export results for offline analysis if needed.

Export options
The dashboard provides two CSV export formats:

1) Summary export
Exports one row per reconciled record with its overall status.

2) Expanded mismatch export (audit-friendly)
Exports one row per differing field, including:

Record key

Field name

Mismatch reason

Value in Dataset A

Value in Dataset B

Source row indices

This format is ideal for Excel pivoting, filtering by field or reason, and audit/compliance workflows.

Supported input formats
CSV with headers

JSON array of objects
Example: [{"id":"1","amount":100}, ...]

JSON 2D array (first row treated as headers)

Reconciliation logic (approach)
This implementation is intentionally transparent and configurable.

1) Pairing rows (finding matches)
Build a composite key from the selected Key columns:

Each key part is normalized (trimmed; optional case-insensitive)

Composite key format: col1|col2|...

Index each dataset as key -> [rowIndex1, rowIndex2, ...]

For each key:

Pair rows deterministically in input order (first A with first B, etc.)

Extra rows are marked as Missing on the opposite side

2) Explaining mismatches (the “why”)
For each paired row, compare the selected Compare columns:

If both values are numeric, compare using Numeric tolerance

Example: tolerance 1 allows 100 vs 99.2 to still match

Otherwise, compare normalized strings (optional case-insensitive)

If any fields differ, the pair is classified as a Mismatch with a per-field diff list.

3) Invalid and duplicate handling
Invalid rows: rows missing one or more key values

Duplicate keys: keys appearing multiple times in a dataset

Reported explicitly

Pairing still proceeds in input order

UX decisions
Load sample buttons make the demo usable immediately.

Tabbed results + global search enable fast exploration.

Drill-down views expose raw A/B row JSON for auditability.

Clear visual status indicators highlight matches, mismatches, and missing records.

Architecture decisions
The solution is implemented as a client-side application.

Rationale:

The problem focuses on reconciliation logic and visualization

Immediate feedback improves usability

No persistence, authentication, or multi-user requirements were specified

The reconciliation logic is modular and can be moved to a backend service if scalability or persistence is required in the future.

Assumptions
The user can identify which columns form a stable key (invoice ID, transaction ID, etc.).

Date formats may vary by source; dates are treated as strings unless normalized upstream.

Currency/amount values are compared numerically where possible; other formats fall back to string comparison.

Tech choices
Next.js (App Router, client-side dashboard)

TypeScript with strict mode

Tailwind CSS v4

PapaParse for robust CSV ingestion

Quality checks
TypeScript strict mode enabled

Linting and production build verified (npm run lint, npm run build)

Tested with CSV and JSON inputs, including mismatches, missing rows, and duplicate keys

Deployment (Vercel)
Push this repository to GitHub

Import it into Vercel

Build command: npm run build

Output: Next.js default

Live demo
https://smart-reconciliation-visualizer-six.vercel.app/
