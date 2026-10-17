// Keep this module dependency-free so it can explain build/import failures.
if (location.protocol !== 'file:') {
  import('./main.js').catch(error => {
    console.error('TRAUTS startup failure:', error instanceof Error ? error.message : 'Unknown startup error');
    window.trautsStartupHelp?.(
      'TRAUTS could not load its application modules',
      import.meta.env.PROD
        ? 'The deployed application could not load or start its built JavaScript/CSS. On Netlify use build command npm run build and publish directory dist, then redeploy the latest commit. Check the browser console for the startup error and Network for failed asset requests.'
        : 'Run this source project with npm run dev, not VS Code Live Server. If already using Vite, run npm ci, restart the server, and check the first error in the browser console. For deployment, upload the complete production build rather than the source index.html.',
    );
  });
}
