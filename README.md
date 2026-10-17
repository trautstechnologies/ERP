# TRAUTS ERP

## User guide

The plain-language guide covers every app page, ordinary-worker and manager permissions, daily tasks, payments including Mobile Money, batch/expiry controls, returns/refunds/voids, and common errors.

- [Printable PDF](public/user-guide.pdf)
- [Browser-readable guide](public/user-guide.html)
- [Editable guide source](docs/USER_GUIDE.md)

After deployment, open `/user-guide.html` on the Netlify site to read it or download the PDF. The app's footer also links to the guide. To rebuild the documents after editing the source, install `requirements-docs.txt` in a Python environment and run `python scripts/build_user_guide.py`. Netlify builds use the committed output and do not need Python or ReportLab.

This repository now includes the TRAUTS browser frontend adapted from the supplied `ERP.txt` export. It uses Vite and vanilla JavaScript ES modules, Supabase Auth/REST/RPC, decimal arithmetic, and packaged Lucide icons. The original navy/blue colors, left navigation, card layout and tables are retained. Legacy demo data and business-data localStorage are not used by the application. Supabase Auth still persists its session normally.

## Run the frontend

Requires Node.js 22.12+ (Node 24 recommended).

Open a terminal in the extracted folder that contains `package.json`, `index.html`, and `src/` together. GitHub ZIPs add a wrapper folder; do not run npm from the parent directory or from `reference/original/`. If npm reports `ENOENT ... package.json`, use `find . -name package.json -not -path "*/node_modules/*"` in Git Bash to locate the project root. The frontend package is named `trauts-erp`.

```bash
npm ci
cp .env.example .env
```

Edit `.env` with your project URL and **public anon key**, then:

```bash
npm run dev
```

Use the address printed by Vite. Do not open `index.html` directly from the filesystem. Never enter a service-role key in frontend configuration. Environment variables are compiled into the browser bundle; configure them before building and rebuild after changing them.

**VS Code Live Server is not the development server for this project.** It cannot resolve the source's npm imports or Vite environment variables. If the page remains on Loading, stop Live Server, open VS Code's terminal in the project folder, run the commands above, and use Vite's Local address (normally port 5173 rather than Live Server's port 5500). The updated entrypoint displays startup guidance for file opens, failed module imports, and stalled startup. Do not overwrite an existing `.env` when updating your checkout.

```bash
npm run build
npm run preview
```

Deploy the generated `dist/` directory to a static host over HTTPS. Routing uses URL hashes, so no server-side route rewrite is required. Old `dashboard.html`, `shopkeeper.html`, and `business-setup.html` bookmarks redirect to the shared app. Workers and managers use the same login and receive different navigation based on their verified profile. There is no public signup or browser business-creation workflow.

For Netlify, see [Netlify deployment instructions](docs/netlify-deployment.md). `netlify.toml` sets the build command, `dist` publish directory, and Node version for Git-connected builds. Manual uploads must contain an already-built `dist` folder, not the source ZIP.

## Folder structure

```text
index.html                    Application entry
src/bootstrap.js              Dependency-free startup/error guidance
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

The original uploaded JPEG was binary text inside a text file and could not be faithfully reconstructed. Login, setup and sidebar branding now share the image path `public/branding/trauts-logo.jpg`; upload the clean original JPG there to activate it everywhere. Until that file exists, the text TRAUTS mark remains visible. See [logo upload instructions](docs/branding.md). The original files are retained as reference and are not loaded as executable demo scripts or copied to `dist`.

## Verify the frontend

```bash
npm test
npx playwright install chromium
npm run test:browser
npm run test:production
```

If a system Chromium is already installed, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its full path rather than downloading another browser. Browser tests use a mock Supabase API and fake accounts, never real credentials or payments. Follow the hosted-project acceptance checklist before using live data.

Read [frontend implementation notes](docs/frontend-implementation.md) for prerequisites, feature mapping, and known integration boundaries.

Mobile Money is available in the payment selectors. Apply the [required SQL patch](database/patches/20261017_mobile_money.sql) to the hosted backend before using it; see [Mobile Money setup](docs/mobile-money.md).

Frontend integration documentation:

- [Backend handoff](docs/backend-integration.md): authentication, permissions, reads, writes, errors, and retries.
- [API payload examples](docs/api-payloads.json): RPC and worker-creation request bodies.
- [Frontend smoke tests](docs/frontend-smoke-tests.md): acceptance checks for the integrated application.
- [Deployed contract inspection](docs/verify-backend-contract.sql): read-only SQL to inspect the actual project's functions, columns, policies, and grants.

The handoff describes the implementation developed in this session. This checkout does not contain the project's complete migration history or deployed Edge Function source. Reconcile the documentation with the linked Supabase project before treating it as a versioned API release.
