const { spawn, execSync } = require('child_process');
const net = require('net');
const EventEmitter = require('events');
const PortManager = require('./port-manager');

const SESSION_NAME_RE = /^[a-zA-Z0-9_-]+$/;

const KNOWN_SHELLS = [
  { id: 'bash', name: 'Bash', paths: ['/bin/bash', '/usr/bin/bash', '/usr/local/bin/bash', '/opt/homebrew/bin/bash'] },
  { id: 'zsh', name: 'Zsh', paths: ['/bin/zsh', '/usr/bin/zsh', '/usr/local/bin/zsh', '/opt/homebrew/bin/zsh'] },
  { id: 'fish', name: 'Fish', paths: ['/usr/local/bin/fish', '/opt/homebrew/bin/fish', '/usr/bin/fish'] },
  { id: 'sh', name: 'Sh', paths: ['/bin/sh', '/usr/bin/sh'] },
];

const fs = require('fs');

function detectShells() {
  const available = [];
  for (const shell of KNOWN_SHELLS) {
    const found = shell.paths.find(p => fs.existsSync(p));
    if (found) {
      available.push({ id: shell.id, name: shell.name, path: found });
    }
  }
  return available;
}

// Claude color palette terminal theme
const TTYD_THEME = JSON.stringify({
  background: '#3b110c',
  foreground: '#f8eed2',
  cursor: '#bdb7fc',
  cursorAccent: '#3b110c',
  selectionBackground: '#5d3d3a',
  black: '#5d3d3a',
  red: '#da1c1c',
  green: '#e9e4a6',
  yellow: '#dd5013',
  blue: '#bdb7fc',
  magenta: '#b06050',
  cyan: '#c08a50',
  white: '#f8eed2',
  brightBlack: '#7a5955',
  brightRed: '#e84040',
  brightGreen: '#f0ebb8',
  brightYellow: '#e87838',
  brightBlue: '#d0cbff',
  brightMagenta: '#d08878',
  brightCyan: '#d8a868',
  brightWhite: '#f9f5ed',
});

// Resolve the user's full login PATH so spawned terminals can find
// user-installed tools (claude, cargo, etc.) even when the server
// itself was launched with a minimal PATH (e.g. from Electron/launchd).
function resolveLoginPath() {
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
  return null;
}

const loginPath = resolveLoginPath();
const basePath = loginPath || process.env.PATH || '';
const SPAWN_ENV = {
  ...process.env,
  PATH: `/usr/local/bin:/opt/homebrew/bin:${basePath}`
};
// Prevent nested tmux when server itself runs inside tmux
delete SPAWN_ENV.TMUX;
delete SPAWN_ENV.TMUX_PANE;
// Prevent Claude Code from refusing to launch inside spawned terminals
delete SPAWN_ENV.CLAUDECODE;

function waitForPort(port, host = '127.0.0.1', timeout = 5000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    function tryConnect() {
      if (Date.now() - start > timeout) {
        return reject(new Error(`ttyd did not start within ${timeout}ms`));
      }
      const sock = net.createConnection({ port, host }, () => {
        sock.destroy();
        resolve();
      });
      sock.on('error', () => {
        setTimeout(tryConnect, 100);
      });
    }
    tryConnect();
  });
}

class SessionManager extends EventEmitter {
  constructor(portRangeStart, portRangeEnd) {
    super();
    this.sessions = new Map();
    this.portManager = new PortManager(portRangeStart, portRangeEnd);
    this.shells = detectShells();
    this.nameCounter = 0;
  }

  async recoverSessions() {
    let tmuxOutput;
    try {
      tmuxOutput = execSync('tmux list-sessions -F "#{session_name}"', {
        encoding: 'utf-8',
        env: SPAWN_ENV
      }).trim();
    } catch {
      return; // no tmux server running
    }
    if (!tmuxOutput) return;

    const names = tmuxOutput.split('\n').filter(n => n && SESSION_NAME_RE.test(n));
    for (const name of names) {
      if (this.sessions.has(name)) continue;
      try {
        await this.adoptSession(name);
      } catch (err) {
        console.warn(`[Recovery] Failed to recover session "${name}":`, err.message);
      }
    }
  }

  spawnTtyd(name, port, shellPath) {
    const home = process.env.HOME || '/';
    const effectiveShell = shellPath || process.env.SHELL || '/bin/sh';
    // Use non-login shell so the SPAWN_ENV PATH (resolved via resolveLoginPath())
    // is preserved. Login shells trigger path_helper which resets PATH from scratch.
    const tmuxArgs = ['tmux', 'new', '-A', '-s', name, '-c', home, effectiveShell];
    // Tell tmux to resize to the latest client (avoids stale column count)
    tmuxArgs.push(';', 'set-option', '-t', name, 'window-size', 'latest');
    // Ensure new tmux windows also use non-login shell with inherited PATH
    tmuxArgs.push(';', 'set-option', '-t', name, 'default-command', effectiveShell);

    const env = { ...SPAWN_ENV };
    if (shellPath) env.SHELL = shellPath;

    return spawn('ttyd', [
      '-W', '-p', String(port),
      '-b', `/terminal/${name}`,
      '-s', '9',
      '-t', `theme=${TTYD_THEME}`,
      ...tmuxArgs
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
      env
    });
  }

  async adoptSession(name) {
    const port = await this.portManager.allocate();
    const proc = this.spawnTtyd(name, port, null);

    let stderrBuf = '';
    proc.stderr.on('data', (chunk) => { stderrBuf += chunk; });

    const session = {
      name,
      port,
      pid: proc.pid,
      shell: null,
      status: 'running',
      createdAt: new Date().toISOString(),
      needsAction: false,
      actionType: null,
      needsActionAt: null,
      needsActionSnippet: null,
      confidence: null,
      description: null,
      notifyConfig: null,
      process: proc
    };

    proc.on('exit', () => {
      if (session.status === 'running') {
        session.status = 'stopped';
        session.pid = null;
        session.process = null;
        session.needsAction = false;
        session.actionType = null;
        session.needsActionAt = null;
        session.needsActionSnippet = null;
        session.confidence = null;
        session.description = null;
        this.portManager.release(port);
        session.port = null;
        this.emit('session:exited', this.serialize(session));
      }
    });

    try {
      await waitForPort(port);
    } catch (err) {
      proc.kill('SIGTERM');
      this.portManager.release(port);
      throw new Error(`ttyd failed to start: ${stderrBuf.trim() || err.message}`);
    }

    this.sessions.set(name, session);
    console.log(`[Recovery] Recovered tmux session "${name}" on port ${port}`);
    this.emit('session:created', this.serialize(session));
  }

  generateName(shell) {
    const prefix = shell || 'session';
    this.nameCounter++;
    let name = `${prefix}-${this.nameCounter}`;
    while (this.sessions.has(name)) {
      this.nameCounter++;
      name = `${prefix}-${this.nameCounter}`;
    }
    return name;
  }

  getShells() {
    return this.shells;
  }

  resolveShell(shellId) {
    if (!shellId) return null;
    const shell = this.shells.find(s => s.id === shellId);
    if (!shell) throw new Error(`Shell "${shellId}" is not available`);
    return shell.path;
  }

  validateName(name) {
    if (!name || !SESSION_NAME_RE.test(name)) {
      throw new Error('Session name must contain only letters, numbers, hyphens and underscores');
    }
    if (this.sessions.has(name)) {
      throw new Error(`Session "${name}" already exists`);
    }
  }

  async create(name, shell) {
    if (!name) {
      name = this.generateName(shell);
    }
    this.validateName(name);
    const shellPath = this.resolveShell(shell);
    const port = await this.portManager.allocate();
    const proc = this.spawnTtyd(name, port, shellPath);

    let stderrBuf = '';
    proc.stderr.on('data', (chunk) => { stderrBuf += chunk; });

    const session = {
      name,
      port,
      pid: proc.pid,
      shell: shell || null,
      status: 'running',
      createdAt: new Date().toISOString(),
      needsAction: false,
      needsActionAt: null,
      needsActionSnippet: null,
      confidence: null,
      description: null,
      notifyConfig: null,
      process: proc
    };

    proc.on('exit', (code) => {
      if (session.status === 'running') {
        session.status = 'stopped';
        session.pid = null;
        session.process = null;
        session.needsAction = false;
        session.needsActionAt = null;
        session.needsActionSnippet = null;
        session.confidence = null;
        session.description = null;
        this.portManager.release(port);
        session.port = null;
        this.emit('session:exited', this.serialize(session));
      }
    });

    // Wait for ttyd to be ready
    try {
      await waitForPort(port);
    } catch (err) {
      proc.kill('SIGTERM');
      this.portManager.release(port);
      throw new Error(`ttyd failed to start: ${stderrBuf.trim() || err.message}`);
    }

    this.sessions.set(name, session);
    this.emit('session:created', this.serialize(session));
    return this.serialize(session);
  }

  stop(name) {
    const session = this.getSession(name);
    if (session.status !== 'running') {
      throw new Error(`Session "${name}" is not running`);
    }
    session.process.kill('SIGTERM');
    session.status = 'stopped';
    session.pid = null;
    session.process = null;
    this.portManager.release(session.port);
    session.port = null;
    this.emit('session:stopped', this.serialize(session));
    return this.serialize(session);
  }

  async remove(name) {
    const session = this.getSession(name);
    if (session.status === 'running') {
      session.process.kill('SIGTERM');
      this.portManager.release(session.port);
    }
    // Kill tmux session
    try {
      execSync(`tmux kill-session -t ${name}`, { stdio: 'ignore' });
    } catch (_) {
      // tmux session may not exist
    }
    this.sessions.delete(name);
    this.emit('session:deleted', { name });
    return { name };
  }

  async restart(name) {
    const session = this.getSession(name);
    if (session.status === 'running') {
      throw new Error(`Session "${name}" is already running`);
    }
    const shellPath = this.resolveShell(session.shell);
    const port = await this.portManager.allocate();
    const proc = this.spawnTtyd(name, port, shellPath);

    let stderrBuf = '';
    proc.stderr.on('data', (chunk) => { stderrBuf += chunk; });

    session.port = port;
    session.pid = proc.pid;
    session.status = 'running';
    session.process = proc;

    proc.on('exit', (code) => {
      if (session.status === 'running') {
        session.status = 'stopped';
        session.pid = null;
        session.process = null;
        this.portManager.release(port);
        session.port = null;
        this.emit('session:exited', this.serialize(session));
      }
    });

    // Wait for ttyd to be ready
    try {
      await waitForPort(port);
    } catch (err) {
      proc.kill('SIGTERM');
      session.status = 'stopped';
      session.pid = null;
      session.process = null;
      this.portManager.release(port);
      session.port = null;
      throw new Error(`ttyd failed to start: ${stderrBuf.trim() || err.message}`);
    }

    this.emit('session:created', this.serialize(session));
    return this.serialize(session);
  }

  updateNeedsAction(name, { needsAction, confidence, snippet, actionType }) {
    const session = this.sessions.get(name);
    if (!session || session.status !== 'running') return;

    const changed = session.needsAction !== needsAction
      || session.actionType !== (actionType || null);
    session.needsAction = needsAction;
    session.actionType = actionType || null;
    session.confidence = confidence;
    session.needsActionSnippet = snippet || null;
    session.needsActionAt = needsAction ? new Date().toISOString() : null;

    if (changed) {
      this.emit('session:updated', this.serialize(session));
    }
  }

  updateDescription(name, description) {
    const session = this.sessions.get(name);
    if (!session || session.status !== 'running') return;

    if (session.description !== description) {
      session.description = description;
      this.emit('session:updated', this.serialize(session));
    }
  }

  updateNotifyConfig(name, config) {
    const session = this.sessions.get(name);
    if (!session) throw new Error(`Session "${name}" not found`);

    if (config) {
      session.notifyConfig = {
        provider: config.provider || null,
        target: config.target || null,
        targetName: config.targetName || null,
      };
    } else {
      session.notifyConfig = null;
    }
    this.emit('session:updated', this.serialize(session));
    return this.serialize(session);
  }

  getSession(name) {
    const session = this.sessions.get(name);
    if (!session) {
      throw new Error(`Session "${name}" not found`);
    }
    return session;
  }

  list() {
    return Array.from(this.sessions.values()).map(s => this.serialize(s));
  }

  serialize(session) {
    const { process: _, ...rest } = session;
    return rest;
  }

  getRunningPids() {
    const pids = [];
    for (const session of this.sessions.values()) {
      if (session.status === 'running' && session.pid) {
        pids.push(session.pid);
      }
    }
    return pids;
  }

  cleanup() {
    for (const pid of this.getRunningPids()) {
      try { process.kill(pid, 'SIGKILL'); } catch (e) { /* already dead */ }
    }
  }
}

module.exports = SessionManager;
