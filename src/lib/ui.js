import { csv } from './domain.js';

export const $ = (selector, root = document) => root.querySelector(selector);
export function escape(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
export const e = escape;
export const short = value => value ? `${String(value).slice(0, 8)}…` : '—';
export const badge = text => `<span class="status-badge ${['active', 'available', 'completed', 'received', 'refunded'].includes(text) ? 'active' : 'inactive'}">${e(text)}</span>`;
export function money(value, currency) {
  return new Intl.NumberFormat('en-ZM', currency ? { style: 'currency', currency } : { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0));
}
export function timestamp(value, zone) {
  return value ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: zone || 'Africa/Lusaka' }).format(new Date(value)) : '—';
}
export function dateLabel(value, style = 'medium') {
  if (!value) return '—';
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00Z`);
  if (!Number.isFinite(date.getTime())) return 'Date unavailable';
  const options = style === 'short' ? { day: 'numeric', month: 'short' } : { dateStyle: style };
  return new Intl.DateTimeFormat('en-GB', { ...options, timeZone: 'UTC' }).format(date);
}
export function supportDetails(references) {
  const entries = Object.entries(references).filter(([, value]) => value);
  return entries.length ? `<details class="support-details"><summary>Support references</summary><dl>${entries.map(([label, value]) => `<dt>${e(label)}</dt><dd><code>${e(value)}</code></dd>`).join('')}</dl></details>` : '';
}
export const options = (rows, value, label, selected = '', empty = 'Select…') =>
  `<option value="">${e(empty)}</option>` + rows.map(row => `<option value="${e(row[value])}" ${String(row[value]) === String(selected) ? 'selected' : ''}>${e(typeof label === 'function' ? label(row) : row[label])}</option>`).join('');

export function field(label, name, { value = '', type = 'text', required = true, min, step, maxLength, extra = '' } = {}) {
  return `<label class="form-group">${e(label)}<input name="${e(name)}" type="${e(type)}" value="${e(value)}" ${required ? 'required' : ''} ${min !== undefined ? `min="${e(min)}"` : ''} ${step ? `step="${e(step)}"` : ''} ${maxLength ? `maxlength="${maxLength}"` : ''} ${extra}></label>`;
}
export const select = (label, name, html, required = true) => `<label class="form-group">${e(label)}<select name="${e(name)}" aria-label="${e(label)}" ${required ? 'required' : ''}>${html}</select></label>`;
export const check = (label, name, checked = false) => `<label class="check"><input type="checkbox" name="${e(name)}" ${checked ? 'checked' : ''}>${e(label)}</label>`;
export const button = (label, action, id = '', secondary = true) => `<button type="button" class="${secondary ? 'secondary-btn' : 'primary-btn'}" data-action="${e(action)}" data-id="${e(id)}">${e(label)}</button>`;
export const table = (headers, rows) => `<div class="table-wrap"><table><thead><tr>${headers.map(h => `<th>${e(h)}</th>`).join('')}</tr></thead><tbody>${rows.length ? rows.join('') : `<tr><td colspan="${headers.length}" class="empty">No records to display.</td></tr>`}</tbody></table></div>`;
export const row = cells => `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
export const stat = (label, value, note = '') => `<article class="stat"><p>${e(label)}</p><h2>${e(value)}</h2><small>${e(note)}</small></article>`;
export const panel = (title, content) => `<section class="panel"><h3>${e(title)}</h3>${content}</section>`;
export const note = text => `<p class="notice">${e(text)}</p>`;

export function notify(message, isError = false) {
  const node = $('#appMessage');
  if (!node) return;
  node.textContent = message;
  node.className = `app-message ${isError ? 'error' : 'success'}`;
  node.hidden = false;
  node.setAttribute('role', isError ? 'alert' : 'status');
}

let lastFocus;
export function closeDialog() {
  const dialog = $('#appDialog');
  if (!dialog) return;
  dialog.close(); dialog.remove();
  lastFocus?.focus();
}

export function dialog(title, content, onSubmit, { submitLabel = 'Save', onCancel } = {}) {
  closeDialog();
  lastFocus = document.activeElement;
  const node = document.createElement('dialog');
  node.id = 'appDialog';
  node.innerHTML = `<form id="dialogForm"><div class="dialog-heading"><h2 id="dialogTitle">${e(title)}</h2><button type="button" aria-label="Close" data-close>×</button></div><div class="dialog-body">${content}</div><p class="form-error" role="alert" hidden></p><footer>${onSubmit ? `<button class="primary-btn" type="submit">${e(submitLabel)}</button>` : ''}<button class="secondary-btn" type="button" data-close>${onSubmit ? 'Cancel' : 'Close'}</button></footer></form>`;
  node.setAttribute('aria-labelledby', 'dialogTitle');
  document.body.append(node);
  const cancel = () => { onCancel?.(); closeDialog(); };
  node.querySelectorAll('[data-close]').forEach(b => b.onclick = cancel);
  node.addEventListener('cancel', event => { if (node.dataset.busy === 'true') event.preventDefault(); else { event.preventDefault(); cancel(); } });
  $('#dialogForm', node).onsubmit = async event => {
    event.preventDefault();
    if (!onSubmit || node.dataset.busy === 'true') return;
    node.dataset.busy = 'true';
    const controls = [...node.querySelectorAll('button')];
    controls.forEach(b => { b.disabled = true; });
    $('.form-error', node).hidden = true;
    try {
      const form = $('#dialogForm', node);
      await onSubmit(Object.fromEntries(new FormData(form)), form);
      closeDialog();
    } catch (error) {
      const errorBox = $('.form-error', node);
      errorBox.textContent = error.message;
      errorBox.hidden = false;
    } finally {
      node.dataset.busy = 'false';
      controls.forEach(b => { b.disabled = node.dataset.frozen === 'true' && b.type !== 'submit' && !b.hasAttribute('data-close'); });
    }
  };
  node.showModal();
  return node;
}

export function actionForm(title, content, submit, context, { mutation = false, label = 'Save' } = {}) {
  // Retain this identity and frozen payload after any failed/uncertain submission.
  const id = crypto.randomUUID();
  let payload;
  let originalStates;
  const node = dialog(title, content, async (values, form) => {
    await context.guard();
    try {
      if (mutation) {
        payload ??= structuredClone(values);
        originalStates ??= [...form.querySelectorAll('input,select,textarea')].map(input => ({ input, disabled: input.disabled, readOnly: input.readOnly }));
        originalStates.forEach(({ input }) => { input.readOnly = true; if (input.tagName === 'SELECT' || input.type === 'checkbox') input.disabled = true; });
      }
      await submit(payload || values, id);
    } catch (error) {
      const uncertain = error.httpStatus === 0 || error.httpStatus >= 500 || error.code === '23505' || error instanceof TypeError;
      if (!uncertain) {
        payload = undefined;
        originalStates?.forEach(({ input, disabled, readOnly }) => { input.disabled = disabled; input.readOnly = readOnly; });
        originalStates = undefined;
      }
      node.dataset.frozen = String(uncertain);
      throw error;
    }
    try { await context.refresh(); notify('Saved. Data refreshed.'); }
    catch { notify('Saved, but the page could not refresh. Refresh before starting another action.', true); }
  }, { submitLabel: label });
  if (mutation) $('.dialog-body', node).insertAdjacentHTML('beforeend', supportDetails({ 'Request ID': id }) + '<p class="request-id">If a save is uncertain, check the history before starting another request. Your original entries are retained for retry.</p>');
  return node;
}

export function exportCsv(name, rows) {
  if (!rows.length) { notify('There are no rows to export.'); return; }
  const columns = Object.keys(rows[0]);
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv(rows, columns)], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = `${name}.csv`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
