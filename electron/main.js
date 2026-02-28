const { app, BrowserWindow, dialog } = require('electron');
const { execSync } = require('child_process');
const path = require('path');

// Load .env from the project root
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

let mainWindow = null;
let serverHandle = null;

function checkDependency(name) {
  try {
    execSync(`which ${name}`, { stdio: 'ignore' });
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

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', async () => {
  if (!checkDependencies()) return;

  try {
    const port = await startServer();
    createWindow(port);
  } catch (err) {
    dialog.showErrorBox('Startup Error', `Failed to start server:\n\n${err.message}`);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('will-quit', () => {
  if (serverHandle) {
    serverHandle.needsActionService.stop();
    serverHandle.sessionManager.cleanup();
    serverHandle.server.close();
  }
});

app.on('activate', async () => {
  // macOS: re-create window when dock icon is clicked
  if (mainWindow === null && serverHandle) {
    const port = serverHandle.server.address().port;
    createWindow(port);
  }
});
