// Enable/disable launching the tracker (tray + server) on login.
// Windows: HKCU Run key + a hidden VBS launcher. Linux: ~/.config/autostart/*.desktop.
// Used by the tray menu and the CLI: node autostart.js on | off
import { execFileSync } from 'node:child_process';
import { writeFileSync, existsSync, unlinkSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import os from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isWin = process.platform === 'win32';
const isLinux = process.platform === 'linux';
const TRAY = join(__dirname, 'tray.js');

// Windows
const NAME = 'CalorieTracker';
const RUN_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
const VBS = join(__dirname, 'start-hidden.vbs');
// Linux
const DESKTOP = join(os.homedir(), '.config', 'autostart', 'calorie-tracker.desktop');

export function isEnabled() {
  if (isWin) { try { execFileSync('reg', ['query', RUN_KEY, '/v', NAME], { stdio: 'ignore' }); return true; } catch { return false; } }
  if (isLinux) return existsSync(DESKTOP);
  return false;
}

export function enable() {
  if (isWin) {
    const vbs =
      `Set sh = CreateObject("WScript.Shell")\r\n` +
      `sh.CurrentDirectory = "${__dirname}"\r\n` +
      `sh.Run """${process.execPath}"" ""${TRAY}""", 0, False\r\n`;
    writeFileSync(VBS, vbs);
    execFileSync('reg', ['add', RUN_KEY, '/v', NAME, '/t', 'REG_SZ', '/d', `wscript.exe "${VBS}"`, '/f']);
  } else if (isLinux) {
    mkdirSync(dirname(DESKTOP), { recursive: true });
    writeFileSync(DESKTOP,
      `[Desktop Entry]\nType=Application\nName=Calorie Tracker\n` +
      `Exec="${process.execPath}" "${TRAY}"\nTerminal=false\nX-GNOME-Autostart-enabled=true\n`);
  } else {
    console.log('Autostart is not supported on this platform.');
  }
}

export function disable() {
  if (isWin) { try { execFileSync('reg', ['delete', RUN_KEY, '/v', NAME, '/f']); } catch { /* not set */ } }
  else if (isLinux) { try { unlinkSync(DESKTOP); } catch { /* not set */ } }
}

// CLI entry point
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const cmd = (process.argv[2] || '').toLowerCase();
  if (cmd === 'on') { enable(); console.log('Autostart enabled.'); }
  else if (cmd === 'off') { disable(); console.log('Autostart disabled.'); }
  else console.log('Usage: node autostart.js on | off');
}
