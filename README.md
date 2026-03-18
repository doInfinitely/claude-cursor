# Claude Cursor

Web-based terminal session manager for running multiple [Claude Code](https://claude.ai/code) sessions. Built on ttyd + tmux.

## Download

Get the latest release for your platform:

**[Download from GitHub Releases](https://github.com/doInfinitely/claude-cursor/releases/latest)**

| Platform | File |
|----------|------|
| macOS (Apple Silicon) | `Claude.Cursor-*-arm64.dmg` |
| Linux (x64 .deb) | `claude-cursor_*_amd64.deb` |
| Linux (x64 .zip) | `Claude.Cursor-linux-x64-*.zip` |
| Windows/WSL2 | `claude-cursor-*-wsl.tar.gz` |

### Prerequisites

- [ttyd](https://github.com/tsl0922/ttyd) and [tmux](https://github.com/tmux/tmux) must be installed on your system
- macOS 12+ (Apple Silicon) or Linux (Debian/Ubuntu x86_64)

## Features

- Run multiple terminal sessions in a browser
- Sessions persist through browser closes (tmux-backed)
- Real-time session status with colored indicators
- Share sessions via time-limited links
- Mobile apps for iOS and Android
- Single-port reverse proxy — no exposed internal ports

## Development

```bash
# Install dependencies
npm install
cd frontend && npm install

# Run in development mode (backend + frontend HMR)
npm run dev
# Backend: http://localhost:3000
# Frontend: http://localhost:5173

# Production build
cd frontend && npm run build
npm start
```

## Architecture

- **Backend**: Node.js/Express server (`server/`)
- **Frontend**: Vue 3 + Vite SPA (`frontend/`)
- **Desktop**: Electron app (`electron/`)
- **iOS**: Swift/SwiftUI (`ios/ClaudeCursor/`)
- **Android**: Kotlin/Jetpack Compose (`android/ClaudeCursor/`)

Each terminal session spawns a ttyd process connected to a tmux session. All traffic is reverse-proxied through a single Express server port.

## License

See [LICENSE](LICENSE) for details.
