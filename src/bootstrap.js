// Keep this module dependency-free so it can explain build/import failures.
if (location.protocol !== 'file:') {
  import('./main.js').catch(() => {
    window.trautsStartupHelp?.(
      'TRAUTS could not load its application modules',
      'Run this source project with npm run dev, not VS Code Live Server. If already using Vite, run npm ci, restart the server, and check the first error in the browser console. For deployment, upload the complete production build rather than the source index.html.',
    );
  });
}
