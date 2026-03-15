const { app, BrowserWindow, dialog } = require('electron');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Load .env from project root (works in dev mode).
// In packaged mode, we load from userData in the ready handler.
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

let mainWindow = null;
let serverHandle = null;

const IS_WIN = process.platform === 'win32';

// Resolve the vendor directory containing bundled binaries (ttyd, tmux, msys2).
// In packaged mode the vendor dir lives inside the asar-unpacked resources;
// in dev mode it's at the project root.
function resolveVendorDir() {
  if (IS_WIN) {
    // Packaged: resources/app.asar.unpacked/vendor/win32
    const packed = path.join(process.resourcesPath, 'app.asar.unpacked', 'vendor', 'win32');
    if (fs.existsSync(packed)) return packed;
    // Dev mode
    const dev = path.join(__dirname, '..', 'vendor', 'win32');
    if (fs.existsSync(dev)) return dev;
  }
  return null;
}

const VENDOR_DIR = resolveVendorDir();

function resolveLoginPath() {
  if (IS_WIN) {
    // On Windows, prepend bundled vendor binaries to PATH
    const vendorBin = VENDOR_DIR ? path.join(VENDOR_DIR, 'msys2', 'usr', 'bin') : '';
    const ttydDir = VENDOR_DIR || '';
    const parts = [vendorBin, ttydDir, process.env.PATH || ''].filter(Boolean);
    return parts.join(';');
  }
  // Try each common shell as a login interactive shell to get the user's real PATH.
  const shells = [process.env.SHELL, '/bin/zsh', '/bin/bash', '/bin/sh'].filter(Boolean);
  for (const shell of shells) {
    try {
      const result = execSync(`${shell} -l -i -c 'echo $PATH'`, {
        encoding: 'utf-8',
        timeout: 5000,
        stdio: ['ignore', 'pipe', 'ignore']
      }).trim();
      if (result) return result;
    } catch {
      // try next shell
    }
  }
  return `/usr/local/bin:/opt/homebrew/bin:${process.env.PATH || ''}`;
}

// Resolve the user's full login PATH once at startup so Electron
// can find Homebrew/user-installed binaries (ttyd, tmux, etc.)
const LOGIN_PATH = resolveLoginPath();
process.env.PATH = LOGIN_PATH;

// Expose vendor dir to the server-side code
if (VENDOR_DIR) {
  process.env.CLAUDE_CURSOR_VENDOR_DIR = VENDOR_DIR;
}

function checkDependency(name) {
  try {
    const cmd = IS_WIN ? `where ${name}` : `which ${name}`;
    execSync(cmd, { stdio: 'ignore', env: { ...process.env, PATH: LOGIN_PATH } });
    return true;
  } catch {
    return false;
  }
}

function checkDependencies() {
  const missing = [];
  if (!checkDependency('ttyd')) missing.push('ttyd');
  if (!checkDependency('tmux')) missing.push('tmux');

  // Soft-check optional dependencies
  if (!checkDependency('cloudflared')) {
    console.warn('[Dependencies] cloudflared not found — tunnel features disabled. Install with: brew install cloudflared');
  }

  if (missing.length > 0) {
    const installHint = IS_WIN
      ? 'These should be bundled with the app. Please re-download or reinstall.'
      : `macOS: brew install ${missing.join(' ')}\nLinux: apt install ${missing.join(' ')}`;
    dialog.showErrorBox(
      'Missing Dependencies',
      `The following required programs are not installed:\n\n${missing.join(', ')}\n\nPlease install them and try again.\n\n${installHint}`
    );
    app.quit();
    return false;
  }
  return true;
}

async function startServer() {
  const { start } = require('../server/index.js');
  // Port 0 = OS assigns a free port
  serverHandle = await start(0, '127.0.0.1');
  return serverHandle.server.address().port;
}

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Forward server console logs to renderer dev tools
  const origLog = console.log;
  const origWarn = console.warn;
  const origError = console.error;
  function forward(level, args) {
    if (mainWindow && mainWindow.webContents) {
      const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
      mainWindow.webContents.executeJavaScript(
        `console.${level}('[server]', ${JSON.stringify(msg)})`
      ).catch(() => {});
    }
  }
  console.log = (...args) => { origLog(...args); forward('log', args); };
  console.warn = (...args) => { origWarn(...args); forward('warn', args); };
  console.error = (...args) => { origError(...args); forward('error', args); };

  mainWindow.loadURL(`http://127.0.0.1:${port}`);

  // Hide instead of close — use Cmd+Q to quit
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', async () => {
  // Load .env from userData (~/Library/Application Support/claude-cursor/.env)
  // dotenv won't overwrite existing vars, so dev .env from project root takes precedence
  require('dotenv').config({ path: path.join(app.getPath('userData'), '.env') });

  if (!checkDependencies()) return;

  try {
    const port = await startServer();
    createWindow(port);
  } catch (err) {
    dialog.showErrorBox('Startup Error', `Failed to start server:\n\n${err.message}`);
    app.quit();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
  if (!serverHandle) return;
  try {
    if (serverHandle.tunnel) serverHandle.tunnel.stop();
    serverHandle.needsActionService.stop();
    serverHandle.descriptionService.stop();
    const pids = serverHandle.sessionManager.getRunningPids();
    serverHandle.server.closeAllConnections();
    serverHandle.server.close();
    serverHandle = null;
    if (pids.length > 0) {
      if (IS_WIN) {
        for (const pid of pids) {
          try { process.kill(pid, 'SIGKILL'); } catch (_) {}
        }
      } else {
        execSync(`kill -9 ${pids.join(' ')}`, { stdio: 'ignore' });
      }
    }
  } catch (e) {
    // ignore cleanup errors
  }
});

app.on('window-all-closed', () => {
  app.exit(0);
});

app.on('activate', async () => {
  if (mainWindow) {
    mainWindow.show();
  } else if (serverHandle) {
    const port = serverHandle.server.address().port;
    createWindow(port);
  }
});
