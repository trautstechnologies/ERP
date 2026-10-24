import '../styles/theme.css';
let dark = false;
try { const saved = (localStorage.getItem('trauts-theme') || localStorage.getItem('trauts_dashboard_theme_v1')); dark = saved ? saved === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; } catch { /* Private mode still supports this session. */ }
function apply() {
  document.documentElement.classList.toggle('trauts-dark', dark);
  document.querySelectorAll('[data-theme-toggle]').forEach(b => { b.textContent = dark ? '☀' : '☾'; b.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode'); b.setAttribute('aria-pressed', String(dark)); });
}
const toggle = document.createElement('button');
toggle.type = 'button'; toggle.dataset.themeToggle = ''; toggle.className = 'theme-toggle';
document.body.append(toggle);
toggle.onclick = () => { dark = !dark; try { localStorage.setItem('trauts-theme', dark ? 'dark' : 'light'); } catch {} apply(); };
apply();
