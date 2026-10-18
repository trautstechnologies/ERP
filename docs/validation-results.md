# Frontend validation results

Validated in the cloud workspace on 16 October 2026, with startup regression checks added on 17 October 2026 and usability checks on 18 October 2026, using Node 24, npm, and the installed Chromium.

| Check | Result |
| --- | --- |
| Frozen-lockfile install (`npm ci`, writable npm cache) | Passed |
| Vite production build | Passed |
| Domain tests | 6 passed |
| Mocked browser integration tests | 16 passed |
| Built-production startup with external fonts blocked | 1 passed |
| JavaScript syntax checks | Passed |
| Documentation relative links and payload JSON | Passed |
| Startup without Supabase configuration | Setup instructions rendered; no runtime errors |
| Desktop/mobile screenshot inspection | Navy/blue shell and responsive tables reviewed |
| Hosted Supabase authentication/RLS/RPC acceptance | Not run in this task; no project credentials supplied |
| Revised create-worker deployment | Not verified in this task |

Browser cases cover every manager route, worker route restrictions, stable sale request payloads after a failed response, active-only pending refunds, worker creation payload/response handling, original-sale-item return creation, mobile navigation, scoped product creation without direct inventory writes, and tracked purchase batch payloads.

Additional startup cases verify that raw/unbundled source imports produce Vite guidance and that missing startup execution replaces the loading message after a timeout. Direct file-URL navigation is blocked by the workspace browser's administrator policy, so the file-protocol-specific hint was not verified by a file navigation here. Development uses the HTTP Vite server.

Production regression: the earlier active CSS imported Google Fonts, and a blocked font request caused the production CSS preload to reject before login rendered. Removing the external import fixed the reproduced failure. `npm run test:production` builds with fake public project configuration, serves `dist`, blocks external font hosts, and verifies successful styled login startup. This checks the built files, not the user's live Netlify deployment.

The mocked API does not substitute for a deployed backend. Run the hosted acceptance checklist after configuring the real project. Expense cancellation remains disabled pending signature verification; the text-corrupted source logo is represented by a brand text mark. No remote database, deployment, or Git remote was modified by this frontend task.

The browser download host returned a network denial; the already-installed Chromium was used successfully instead. Package installation uses `/tmp/erp-npm-cache` in this cloud environment because the default home cache is not writable. Standard local development may use npm's default cache.

Usability checks on 18 October verify readable transaction and audit tables, hidden support references, product-based return selection with correct UUID payloads, readable report CSV exports, removal of Refresh controls, direct dashboard sale forms for both roles, and chart dates in the store timezone. Domain tests (6), browser tests (16), and built-production startup (1) passed. These checks use mocked APIs; live Supabase was not tested.
