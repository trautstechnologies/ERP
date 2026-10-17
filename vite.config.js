import { defineConfig } from 'vite';

// Old bookmarks remain useful; all screens use the authenticated app router.
export default defineConfig({
  plugins: [{
    name: 'legacy-page-redirects',
    generateBundle() {
      for (const name of ['dashboard', 'shopkeeper', 'business-setup']) {
        this.emitFile({ type: 'asset', fileName: `${name}.html`, source:
          '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=./"><a href="./">Open TRAUTS</a>' });
      }
    },
  }],
});
