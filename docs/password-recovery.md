# Forgot password and recovery

The login page has **Forgot password?** for both workers and managers. The app calls Supabase Auth to send the reset email. The email link opens the new-password form; after a successful change, the app returns to login. No database migration or Edge Function is needed.

## Supabase / Netlify configuration

1. Deploy the updated frontend on Netlify.
2. In Supabase **Authentication → URL Configuration**, set **Site URL** to the deployed HTTPS app address.
3. Add the recovery URL to **Redirect URLs**. For a site hosted at its root, allow both:

   ```text
   https://YOUR-SITE.netlify.app/
   https://YOUR-SITE.netlify.app/?auth=recovery
   ```

   Use your real hostname. For an app hosted under a path, include that path before `?auth=recovery`. Local testing uses `http://localhost:5173/?auth=recovery` (or the exact address Vite prints).
4. Configure working email delivery in Supabase. The **Reset Password** email template must include the Supabase `{{ .ConfirmationURL }}` link. It must not link directly to the frontend without Auth verification.

Disabling signup email confirmation does not remove the email requirement for password reset. If you still use Resend's `onboarding@resend.dev` test sender, delivery is restricted to the Resend account owner's address. To support other users, use a verified sending domain in Resend or another SMTP provider that permits those recipients. Delivery failures and rate limits must be resolved in the Auth/SMTP settings; the frontend cannot send around them.

## Flow

- `resetPasswordForEmail(email, {redirectTo})` sends the request to `POST /auth/v1/recover`. The app uses its current origin and Vite base path, plus `?auth=recovery`, for the redirect.
- The confirmation shown after a successful request is generic: **If an account exists for that email, a reset link has been sent.** A successful API response does not prove delivery or account existence.
- Supabase validates the recovery link and supplies the session. Recovery handling takes precedence over profile loading/dashboard entry, including on a fresh page load. The recovery event is observed before Auth initialization completes.
- A URL marker alone does not authorize the reset view, even if the browser already has a normal login. Invalid/expired links return to the reset-email form and URL recovery parameters are removed.
- A valid recovery form requires matching passwords of at least 12 characters. It rechecks the authenticated user before `updateUser({password})`, so an account switch in another tab cannot change the target account.
- On success, the app attempts local-session logout and returns to login with a success message. If logout fails, it reports that the password changed but the browser session could not close. This does not claim to terminate every remote session.
- Cancel closes the local recovery session before returning to login. Auth callbacks never await Supabase requests while the Auth lock is held.
- Resetting a password does not change profile role/status/store assignment or bypass inactive-account checks. The team page cannot reset someone else's password.

The app never logs or separately stores passwords or recovery URL tokens. Supabase manages its normal Auth session storage. If the reset page was refreshed after its one-time link was consumed, request a new email rather than reusing an unrelated saved session.

## Hosted acceptance

1. Request a reset for an account with an email you control; verify it reaches the inbox and that its redirect uses the deployed app address.
2. Open the link in a fresh tab. Check that **Choose a new password** appears before any dashboard.
3. Enter matching passwords, update, then sign in using the new password. Check that the old password fails.
4. Repeat for a worker and verify its store/role are unchanged.
5. Check an expired/used link, mismatched passwords and Cancel. No failed update should show a success message.

Automated browser tests use mocked Auth APIs. They cannot verify live SMTP, actual password persistence, project email-template settings or the hosted redirect allowlist.
