import { supabase } from './client.js';
import { $, e, closeDialog } from './ui.js';
import { branding, mountBranding } from './branding.js';

export function clearRecoveryUrl() {
  const url = new URL(window.location.href);
  for (const key of ['auth', 'code', 'error', 'error_code', 'error_description']) url.searchParams.delete(key);
  url.hash = '';
  history.replaceState(null, '', `${url.pathname}${url.search}`);
}

export function forgotPassword({ onBack, email = '', message = '' }) {
  closeDialog();
  $('#app').innerHTML = `<main class="auth-container"><section class="auth-card">${branding()}<h2>Forgot password?</h2><p class="muted">Enter your account email and we’ll send you a link to choose a new password.</p><form id="forgotPasswordForm"><label class="form-group">Email address<input type="email" name="email" value="${e(email)}" required autocomplete="email"></label><p id="recoveryMessage" role="alert">${e(message)}</p><button class="primary-btn" type="submit">Send reset link</button><button class="secondary-btn auth-signup" id="recoveryBack" type="button">Back to login</button></form></section></main>`;
  mountBranding($('#app'));
  $('#recoveryBack').onclick = onBack;
  $('#forgotPasswordForm').onsubmit = async event => {
    event.preventDefault();
    const form = event.target;
    const submit = $('button[type="submit"]', form);
    if (submit.disabled) return;
    submit.disabled = true;
    const messageBox = $('#recoveryMessage');
    messageBox.textContent = '';
    messageBox.className = '';
    try {
      const address = String(new FormData(form).get('email')).trim();
      const redirect = new URL(import.meta.env.BASE_URL, window.location.origin);
      redirect.searchParams.set('auth', 'recovery');
      const { error } = await supabase.auth.resetPasswordForEmail(address, { redirectTo: redirect.href });
      if (error) throw error;
      if (!form.isConnected) return;
      messageBox.textContent = 'If an account exists for that email, a reset link has been sent. Check your inbox and spam folder.';
      messageBox.setAttribute('role', 'status');
      messageBox.className = 'auth-success';
      submit.textContent = 'Reset link requested';
      // Avoid accidental repeated email sends; returning to login allows a deliberate new request.
    } catch (error) {
      if (!form.isConnected) return;
      messageBox.textContent = error.status === 429
        ? 'Too many requests. Please wait before requesting another reset link.'
        : 'Could not send the reset link. Please try again later or contact your administrator.';
      messageBox.setAttribute('role', 'alert');
      submit.disabled = false;
    }
  };
}

export function resetPassword({ userId, onComplete, onCancel }) {
  closeDialog();
  $('#app').innerHTML = `<main class="auth-container"><section class="auth-card">${branding()}<h2>Choose a new password</h2><p class="muted">Use at least 12 characters.</p><form id="passwordResetForm"><label class="form-group">New password<input name="password" type="password" required minlength="12" maxlength="128" autocomplete="new-password"></label><label class="form-group">Confirm new password<input name="confirm_password" type="password" required autocomplete="new-password"></label><p id="recoveryMessage" role="alert"></p><button class="primary-btn" type="submit">Update password</button><button class="secondary-btn auth-signup" id="cancelRecovery" type="button">Cancel and return to login</button></form></section></main>`;
  mountBranding($('#app'));
  const form = $('#passwordResetForm');
  const submit = $('button[type="submit"]', form);
  const cancel = $('#cancelRecovery');
  const messageBox = $('#recoveryMessage');
  let saved = false;
  cancel.onclick = async () => {
    submit.disabled = cancel.disabled = true;
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
      onCancel();
    } catch {
      messageBox.textContent = 'Could not close this reset session. Please try again.';
      submit.disabled = saved; cancel.disabled = false;
    }
  };
  form.onsubmit = async event => {
    event.preventDefault();
    if (submit.disabled || saved) return;
    messageBox.textContent = '';
    const values = Object.fromEntries(new FormData(form));
    if (values.password !== values.confirm_password) {
      messageBox.textContent = 'Passwords do not match.'; return;
    }
    submit.disabled = cancel.disabled = true;
    try {
      // Another tab must not switch the account that this recovery form will update.
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError || data.user?.id !== userId) throw new Error('This reset session expired or changed. Request a new reset link.');
      const { error } = await supabase.auth.updateUser({ password: values.password });
      if (error) throw error;
      saved = true;
      form.reset();
      const { error: logoutError } = await supabase.auth.signOut({ scope: 'local' });
      onComplete(logoutError
        ? 'Your password was updated. Sign in with your new password. Your previous browser session could not be closed.'
        : 'Your password was updated. Sign in with your new password.');
    } catch (error) {
      messageBox.textContent = error.message || 'Could not update the password. Request a new reset link and try again.';
      submit.disabled = saved; cancel.disabled = false;
    }
  };
}
