<p align="center">
  <img src="doc/logo.png" alt="Claude Cursor Logo" width="200" />
</p>

# 🚀 Claude Cursor

[中文](./README.md)

> 🌌 Your terminal, in the browser. Anytime, anywhere.

<p align="center">
  <img src="assets/72643b69-16e1-44ab-841f-cc1dee1b1c0b.png" alt="Claude Cursor Screenshot" width="800" />
</p>

Claude Cursor is a web-based terminal session manager built on ttyd + tmux, focused on running and juggling multiple Claude Code sessions. Create, manage, and switch between multiple terminals right from your browser.

## 💡 Why

Ever been in one of these situations?

- 🏢 A long-running task on your work machine, and you want to check on it from home?
- 🛌 Lying in bed with a sudden idea to fix a bug, wishing you could just open a terminal?
- ☕️ Out and about with only your phone, wanting to connect to your dev machine?

**Claude Cursor** turns your terminal into a web service. Open a browser, and you're in. Sessions never die.

## ✨ Features

- **🧩 Multi-session management** — Create multiple independent terminal sessions, switch freely
- **💾 Persistent sessions** — Powered by tmux, sessions survive browser closures, reconnect anytime
- **👥 Collaborative access** — Multiple browsers can connect to the same session simultaneously
- **🐚 Multi-shell support** — Choose from Bash, Zsh, Fish and more when creating a session
- **📱 Mobile-friendly** — Responsive UI that works smoothly on phones and tablets
- **🎨 Professional Dark UI** — Refined Slate/Zinc theme, glassmorphism, and smooth animations
- **⚡️ Zero-config startup** — One command to launch after installing dependencies

## 🔮 Vibe Coding: Code from Your Phone

Claude Cursor is a natural fit for the **Vibe Coding** workflow.

Pair it with AI coding tools like Claude Code or Cursor, and you can have a conversational programming session right from your phone — describe what you want, review the generated code, run tests. The entire dev loop works from a mobile device. On the commute, at a coffee shop, waiting in line — when inspiration strikes, just open your browser and start coding.

tmux sessions guarantee continuity: work you start on your phone picks up seamlessly when you're back at your desk. No context lost, ever.

## 🌐 Tunnel with Asterism for Remote Access

If your dev machine sits behind a home or corporate NAT, pair it with [Asterism](https://github.com/sosopop/asterism) to punch through and access your terminal from anywhere.

Asterism is a lightweight intranet penetration tool — pure C, single binary, cross-platform (Windows / Linux / macOS / Android / iOS), high performance, minimal resource usage.

**Typical deployment:**

```
Phone / Tablet Browser 📱
    ↓
Public Server (Asterism Server) ☁️
    ↓ Tunnel 🚇
Intranet Dev Machine (Claude Cursor + Asterism Client) 💻
```

A portable cloud dev environment — as long as you have internet, you have your terminal.
