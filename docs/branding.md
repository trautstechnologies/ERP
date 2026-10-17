# TRAUTS logo asset

The login screen, unconfigured-project setup screen, and manager/worker sidebar use one shared logo path:

```text
public/branding/trauts-logo.jpg
```

Upload the original JPG image to that path in the frontend branch. Vite copies it to `dist/branding/trauts-logo.jpg`; Netlify includes it in the next deployment. The image is displayed with its original aspect ratio using `object-fit: contain`, without cropping, recoloring or recreating it. It has descriptive alt text and scales for the authentication card and navigation sidebar. All existing blue/navy colors remain.

The image supplied inline in chat was visible to the assistant but did not arrive as a downloadable workspace file. No replacement image has been invented. Until the real asset is uploaded, the existing TRAUTS text fallback remains readable and application startup is unaffected.

To upload directly through GitHub:

1. Select branch `frontend/supabase-integration-20261017`.
2. Open `public/branding`.
3. Choose Add file → Upload files.
4. Upload the original JPG, named `trauts-logo.jpg`, and commit to the frontend branch.
5. Let Netlify deploy the new commit, then refresh the site.

PNG and JPEG files are also supported as `trauts-logo.png` and `trauts-logo.jpeg`; keep the real file's format/extension. The loader tries JPG, PNG, then JPEG and shows the first available image. Do not rename an unrelated format merely to change its extension.
