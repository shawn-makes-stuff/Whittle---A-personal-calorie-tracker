import systray2 from 'systray2';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';
import './server.js'; // starts the Express server (+ AI warmup)
import { isEnabled, enable, disable } from './autostart.js';

const SysTray = systray2.default;
const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_URL = `http://localhost:${process.env.PORT || 3000}`;
const isWin = process.platform === 'win32';

// Tray icon: ICO on Windows, PNG elsewhere.
const icon = readFileSync(join(__dirname, isWin ? 'tray.ico' : 'public/icon-192.png')).toString('base64');

// Edge PWA id for http://localhost:3000/ (deterministic from the manifest); used on Windows.
const PWA_APP_ID = 'hbblfifohofgngfbjbiimbbcimepbdcb';

function installedEdgeProfile() {
  if (!isWin) return null;
  const base = join(process.env.LOCALAPPDATA || '', 'Microsoft', 'Edge', 'User Data');
  try { for (const p of readdirSync(base)) if (existsSync(join(base, p, 'Web Applications', 'Manifest Resources', PWA_APP_ID))) return p; }
  catch { /* no Edge */ }
  return null;
}

function openUrl(url) {
  const cmd = isWin ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
  exec(cmd);
}

// Installed Edge PWA → real app window (Windows). Otherwise the default browser,
// where the user can install it (a chromeless window would hide the install prompt).
function openApp() {
  const profile = installedEdgeProfile();
  if (profile) exec(`start "" msedge --app-id=${PWA_APP_ID} --profile-directory="${profile}"`, err => { if (err) openUrl(APP_URL); });
  else openUrl(APP_URL);
}

const startupItem = {
  title: 'Start on login',
  checked: isEnabled(),
  enabled: true,
  click() {
    startupItem.checked ? disable() : enable();
    startupItem.checked = !startupItem.checked;
    systray.sendAction({ type: 'update-item', item: startupItem, seq_id: -1 });
  }
};

const items = [
  { title: 'Open tracker', tooltip: 'Open the app', enabled: true, click: openApp },
  SysTray.separator,
  startupItem,
  SysTray.separator,
  { title: 'Quit', enabled: true, click: () => systray.kill() }
];

const systray = new SysTray({
  menu: { icon, isTemplateIcon: false, title: '', tooltip: 'Whittle', items },
  debug: false,
  copyDir: true
});

systray.onClick(action => { if (action.item && typeof action.item.click === 'function') action.item.click(); });
systray.ready().then(openApp).catch(err => console.error('Tray failed (server still running):', err.message));
