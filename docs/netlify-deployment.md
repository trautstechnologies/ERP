# Deploy TRAUTS to Netlify

## Git-connected deployment

1. Import `trautstechnologies/ERP` and choose `frontend/supabase-integration-20261017` as the production branch (or the branch containing the frontend after a future merge).
2. Leave Base directory empty: `package.json` and `netlify.toml` are at the repository root. Leave Package directory unset unless your Netlify project requires an explicit root selection.
3. Use build command `npm run build` and publish directory `dist`. The committed `netlify.toml` specifies these and Node 24. Do not publish the repository root or `src`.
4. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Netlify environment variables for the Build scope and the deployment context you use (Production and/or Deploy Previews). Use the public anon key only. Never upload or enter a service-role key in a frontend build.
5. Trigger a new deployment after changing variables. They are compiled into the browser files; changing runtime settings without rebuilding cannot update them.
6. Inspect the build log: Vite must complete and produce `dist/index.html` and `dist/assets/`. Deploy the new commit, rather than retrying an old commit that predates `netlify.toml`.

Configure Supabase Auth Site URL to the final HTTPS frontend address. Allowlist the deployed app root and its `?auth=recovery` URL for password recovery; see [password-recovery.md](password-recovery.md). This does not fix missing frontend JavaScript assets; verify the build first.

## Manual drag-and-drop deployment

Netlify Drop does not run `npm install` or Vite. Build locally first:

```bash
npm ci --include=dev
# Ensure the project .env has the public Supabase values before building.
npm run build
```

Upload the entire generated `dist` folder, containing its `index.html`, `assets` folder and legacy redirect pages. Do not drag the source project, source `index.html`, GitHub source ZIP, or just the built index file. Keep all files from the same build together.

## Diagnose the module-loading message

The message means the startup module could not import or execute the application. Common causes are source files deployed without a build, missing assets, HTML returned for a JavaScript asset, mixed versions after an incomplete upload, or a runtime error. Missing Supabase variables alone should show Connect your store, not an endless loading message.

A production failure was reproduced with the earlier stylesheet: its external Google Fonts import failed on a restricted network, causing Vite's CSS preload to reject before the application started. The active stylesheet no longer requires that request; it uses available Inter/Arial/system fonts. The original uploaded reference CSS remains unchanged. Deploy the corrected commit to include this fix.

- In browser View Source, the production HTML should reference `/assets/index-<hash>.js`. A `/src/bootstrap.js` reference indicates the source HTML was published.
- In DevTools Network, inspect the first failed JavaScript/CSS request and its response. Production JS must return JavaScript, not an HTML fallback page.
- Do not add a catch-all SPA redirect for this hash-routed app. An overly broad forced redirect can hide missing assets behind a 200 HTML response.
- With a Git-connected site, verify the production branch, deployed commit, base directory, actual build command, and `dist` publish directory. Clear build cache and deploy the latest commit once after correcting these settings.
- With manual deployment, rebuild and upload the whole `dist` folder again. Hard-refresh the site after the deployment finishes.
- If assets load successfully but the message persists, inspect the first console error and provide its text and the site URL for diagnosis. Do not share tokens or keys.

The `netlify.toml` applies to Netlify builds from Git; it cannot make a source ZIP uploaded through Drop build itself.
