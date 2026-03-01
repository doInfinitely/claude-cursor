const { app, BrowserWindow, dialog } = require('electron');
const { execSync } = require('child_process');
const path = require('path');

// Load .env from project root (works in dev mode).
// In packaged mode, we load from userData in the ready handler.
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

let mainWindow = null;
let serverHandle = null;

function resolveLoginPath() {
  // Try each common shell as a login shell to get the user's real PATH.
  // Electron apps don't inherit the terminal's environment, so we must
  // source the user's profile to discover ~/.local/bin, ~/.cargo/bin, etc.
  const shells = [process.env.SHELL, '/bin/zsh', '/bin/bash', '/bin/sh'].filter(Boolean);
  for (const shell of shells) {
    try {
      const result = execSync(`${shell} -l -c 'echo $PATH'`, {
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

function checkDependency(name) {
  try {
    execSync(`which ${name}`, { stdio: 'ignore', env: { ...process.env, PATH: LOGIN_PATH } });
    return true;
  } catch {
    return false;
  }
}

function checkDependencies() {
  const missing = [];
  if (!checkDependency('ttyd')) missing.push('ttyd');
  if (!checkDependency('tmux')) missing.push('tmux');

  if (missing.length > 0) {
    dialog.showErrorBox(
      'Missing Dependencies',
      `The following required programs are not installed:\n\n${missing.join(', ')}\n\nPlease install them and try again.\n\nmacOS: brew install ${missing.join(' ')}\nLinux: apt install ${missing.join(' ')}`
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
    serverHandle.needsActionService.stop();
    serverHandle.descriptionService.stop();
    const pids = serverHandle.sessionManager.getRunningPids();
    serverHandle.server.closeAllConnections();
    serverHandle.server.close();
    serverHandle = null;
    if (pids.length > 0) {
      execSync(`kill -9 ${pids.join(' ')}`, { stdio: 'ignore' });
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
