# TRAUTS ERP

This repository now includes the TRAUTS browser frontend adapted from the supplied `ERP.txt` export. It uses Vite and vanilla JavaScript ES modules, Supabase Auth/REST/RPC, decimal arithmetic, and packaged Lucide icons. The original navy/blue colors, left navigation, card layout and tables are retained. Legacy demo data and business-data localStorage are not used by the application. Supabase Auth still persists its session normally.

## Run the frontend

Requires Node.js 22.12+ (Node 24 recommended).

```bash
npm ci
cp .env.example .env
```

Edit `.env` with your project URL and **public anon key**, then:

```bash
npm run dev
```

Use the address printed by Vite. Do not open `index.html` directly from the filesystem. Never enter a service-role key in frontend configuration. Environment variables are compiled into the browser bundle; configure them before building and rebuild after changing them.

```bash
npm run build
npm run preview
```

Deploy the generated `dist/` directory to a static host over HTTPS. Routing uses URL hashes, so no server-side route rewrite is required. Old `dashboard.html`, `shopkeeper.html`, and `business-setup.html` bookmarks redirect to the shared app. Workers and managers use the same login and receive different navigation based on their verified profile. There is no public signup or browser business-creation workflow.

## Folder structure

```text
index.html                    Application entry
src/main.js                   Session gate, shell, role-aware hash routing
src/lib/client.js             Supabase configuration
src/lib/api.js                Queries, pagination, RPC and Edge Function calls
src/lib/domain.js             Quantity/decimal/date/return rules
src/lib/ui.js                 Safe rendering, dialogs, CSV and request identity
src/pages/catalog.js          Dashboard, products/variants, inventory
src/pages/operations.js       Sales, suppliers, purchases, expenses, workers
src/pages/stock.js            Batches, existing-stock migration, returns, audit
src/pages/reports.js          Reports, operating summary, store settings
src/pages/shared.js           Shared line/batch editors and page helpers
src/styles/original/          Preserved source CSS
src/styles/app.css            Shared components and responsive overrides
reference/original/           Extracted original demo files; not app entrypoints
tests/                        Domain tests and mocked browser integration tests
docs/                         Backend contracts and frontend implementation notes
```

The uploaded JPEG was binary text inside a text file and cannot be faithfully reconstructed. A text TRAUTS mark preserves the brand position and colors; replace it with a clean image asset if available. The original files are retained as reference and are not loaded as executable demo scripts or copied to `dist`.

## Verify the frontend

```bash
npm test
npx playwright install chromium
npm run test:browser
```

If a system Chromium is already installed, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its full path rather than downloading another browser. Browser tests use a mock Supabase API and fake accounts, never real credentials or payments. Follow the hosted-project acceptance checklist before using live data.

Read [frontend implementation notes](docs/frontend-implementation.md) for prerequisites, feature mapping, and known integration boundaries.

Frontend integration documentation:

- [Backend handoff](docs/backend-integration.md): authentication, permissions, reads, writes, errors, and retries.
- [API payload examples](docs/api-payloads.json): RPC and worker-creation request bodies.
- [Frontend smoke tests](docs/frontend-smoke-tests.md): acceptance checks for the integrated application.
- [Deployed contract inspection](docs/verify-backend-contract.sql): read-only SQL to inspect the actual project's functions, columns, policies, and grants.

The handoff describes the implementation developed in this session. This checkout does not contain the project's complete migration history or deployed Edge Function source. Reconcile the documentation with the linked Supabase project before treating it as a versioned API release.
