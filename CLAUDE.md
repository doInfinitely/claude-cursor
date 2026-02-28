# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Claude Cursor is a web-based terminal session manager that combines ttyd (web terminal emulator) and tmux (terminal multiplexer) to provide persistent, multi-user terminal sessions accessible through a browser. Users can create multiple terminal sessions, switch between them, and access them from any device with a browser.

## Development Commands

### Setup
```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend && npm install

# Build frontend for production
npm run build
```

### Running the Application
```bash
# Development mode (concurrent backend + frontend with HMR)
npm run dev
# Backend runs on http://localhost:3000
# Frontend dev server runs on http://localhost:5173

# Production mode
npm start
# Serves built frontend from server/public/
```

### Individual Services
```bash
# Run backend only
npm run dev:server

# Run frontend dev server only
npm run dev:frontend
```

## Architecture Overview

### Monorepo Structure
- **Backend**: Node.js/Express server in `server/` directory
- **Frontend**: Vue 3 + Vite SPA in `frontend/` directory
- **Production**: Frontend builds to `server/public/`, served by Express

### Backend Architecture

**SessionManager** (`server/services/session-manager.js`)
- Core orchestrator extending EventEmitter
- Manages ttyd process lifecycle (spawn, stop, restart, cleanup)
- Each session spawns: `ttyd -W -p <port> -b /terminal/<name> -s 9 -t 'theme={"background":"#000000"}' tmux new -A -s <name> [shell]`
- Uses ttyd's `-b` flag to set base path for reverse proxy support
- Emits events: `session:created`, `session:stopped`, `session:deleted`, `session:exited`
- Detects available shells (Bash, Zsh, Fish, Sh) from multiple paths

**PortManager** (`server/services/port-manager.js`)
- Allocates ports from configurable range (default: 7681-7780)
- Checks port availability before allocation
- Prevents conflicts when multiple ttyd instances run
- Note: Ports are used internally; all external access goes through main server port

**Reverse Proxy** (`server/index.js`)
- Uses `http-proxy-middleware` to proxy `/terminal/:name` to ttyd instances
- All ttyd traffic (HTTP + WebSocket) goes through main server port
- Eliminates need to expose multiple ports externally
- Proxy dynamically routes to correct ttyd instance based on session name

**WebSocket Broadcasting** (`server/ws.js`)
- Broadcasts SessionManager events to all connected clients
- Enables real-time UI updates across multiple browser tabs/users

**REST API** (`server/routes/sessions.js`)
- `GET /api/sessions/shells` - List available shells
- `GET /api/sessions` - List all sessions
- `POST /api/sessions` - Create new session
- `POST /api/sessions/:name/stop` - Stop session
- `POST /api/sessions/:name/restart` - Restart session
- `DELETE /api/sessions/:name` - Delete session

### Frontend Architecture

**State Management** (`frontend/src/stores/sessions.js`)
- Pinia store managing all session state
- WebSocket connection with exponential backoff auto-reconnect
- Methods: `init()`, `createSession()`, `stopSession()`, `restartSession()`, `removeSession()`, `select()`

**Components**
- **App.vue**: Root layout with toolbar, sidebar, terminal view
- **TerminalView.vue**: Embeds ttyd via iframe (`/terminal/:name` - proxied through main server)
- **Sidebar.vue**: Session list and navigation
- **CreateDialog.vue**: Modal for creating new sessions
- **SessionCard.vue**: Individual session card
- **Toast.vue**: Notification system

### Data Flow

**Session Creation:**
```
Frontend → POST /api/sessions
  → SessionManager.create()
  → Spawn ttyd process
  → Wait for port ready
  → Emit 'session:created'
  → WebSocket broadcast
  → All clients refetch and update
```

**Real-time Updates:**
```
SessionManager events
  → WebSocket broadcast
  → Frontend receives message
  → Pinia store refetches sessions
  → Vue reactivity updates UI
```

**Terminal Access:**
```
TerminalView <iframe src="/terminal/:name">
  → Express reverse proxy
  → ttyd web terminal (localhost:port with base path)
  → tmux session (persistent)
```

## Configuration

Environment variables (via `.env` or process.env):

| Variable | Purpose | Default |
|----------|---------|---------|
| `PORT` | Backend server port | `3000` |
| `HOST` | Bind address | `0.0.0.0` |
| `TTYD_PORT_RANGE_START` | First port for ttyd instances | `7681` |
| `TTYD_PORT_RANGE_END` | Last port for ttyd instances | `7780` |

## Key Implementation Details

### ttyd Process Management
- Each session runs as a detached child process
- ttyd integrates with tmux for session persistence
- Sessions survive browser disconnection and can be reconnected
- Graceful shutdown on SIGINT/SIGTERM kills all ttyd processes

### Reverse Proxy Architecture
- All ttyd instances run on localhost with different ports (internal only)
- Express server proxies `/terminal/:name` to corresponding ttyd instance
- Uses `http-proxy-middleware` with WebSocket support
- Single external port (default 3000) for all traffic
- ttyd uses `-b /terminal/:name` flag to set base path

### Port Allocation
- PortManager allocates from configurable range (internal use only)
- Checks availability before assignment
- Releases ports when sessions stop
- Prevents conflicts in multi-session scenarios
- Ports are NOT exposed externally - only used for localhost communication

### Shell Detection
- Searches multiple paths for shells (supports macOS Homebrew and Linux)
- Priority order: Bash, Zsh, Fish, Sh
- User selects shell when creating session

### WebSocket Resilience
- Auto-reconnect with exponential backoff (1s → 2s → 4s → 8s → 16s max)
- Refetches session list on reconnection
- Handles connection drops gracefully

## Development Notes

### Vite Configuration
- Proxies `/api` and `/ws` to backend during development
- Builds to `../server/public` for production
- HMR enabled for Vue components

### No Testing Framework
Currently no test runner or test files are configured in the codebase.

### Dependencies
- **Backend**: Express 4.21.2, ws 8.18.0, http-proxy-middleware 3.0.3, dotenv 16.4.7
- **Frontend**: Vue 3.5.24, Vite 7.2.4, Pinia 3.0.4
- **External**: ttyd and tmux must be installed on the system
