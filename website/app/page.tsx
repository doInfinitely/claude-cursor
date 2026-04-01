import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SlowVideo from "@/components/SlowVideo";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#1a0805]">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#bdb7fc]/10 border border-[#bdb7fc]/20 text-[#bdb7fc] text-sm font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-[#e9e4a6]" />
            Terminal sessions, managed from your browser
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold text-[#f8eed2] tracking-tight leading-tight mb-6">
            Persistent terminals,
            <br />
            <span className="bg-gradient-to-r from-[#bdb7fc] to-[#dd5013] bg-clip-text text-transparent">
              everywhere
            </span>
          </h1>

          <p className="text-xl text-[#c4b898] max-w-2xl mx-auto mb-10">
            Launch and manage terminal sessions that survive disconnects. Monitor
            remote instances, view everything in a grid, and get notified when
            they need attention.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Link
              href="/download"
              className="px-8 py-3.5 rounded-xl bg-[#dd5013] text-[#f8eed2] font-semibold text-lg hover:bg-[#e87838] transition-all shadow-lg shadow-[#dd5013]/20"
            >
              Download free
            </Link>
            <a
              href="#features"
              className="px-8 py-3.5 rounded-xl border border-[#5d3d3a] text-[#c4b898] font-semibold text-lg hover:bg-[#5d3d3a]/20 transition-colors"
            >
              See features
            </a>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <a
              href="https://apps.apple.com/us/app/claude-cursor-companion/id6760676787"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl border border-[#5d3d3a] bg-[#3b110c]/80 hover:bg-[#4d1e17]/60 text-[#f8eed2] transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
              <div className="text-left">
                <div className="text-[10px] text-[#8a7a6a] leading-none">Download on the</div>
                <div className="text-sm font-semibold leading-tight">App Store</div>
              </div>
            </a>
            <Link
              href="/android-testing"
              className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl border border-[#5d3d3a] bg-[#3b110c]/80 hover:bg-[#4d1e17]/60 text-[#f8eed2] transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.523 2.236l1.442-1.442a.5.5 0 01.707.707l-1.57 1.57A7.962 7.962 0 0121 8H3a7.962 7.962 0 012.898-4.929l-1.57-1.57a.5.5 0 01.707-.707l1.442 1.442A7.94 7.94 0 0112 0a7.94 7.94 0 015.523 2.236zM3 10v8a2 2 0 002 2h14a2 2 0 002-2v-8H3zM9 5a1 1 0 100 2 1 1 0 000-2zm6 0a1 1 0 100 2 1 1 0 000-2z"/></svg>
              <div className="text-left">
                <div className="text-[10px] text-[#8a7a6a] leading-none">Get it on</div>
                <div className="text-sm font-semibold leading-tight">Google Play</div>
              </div>
            </Link>
          </div>

          <div className="relative max-w-5xl mx-auto">
            <div className="rounded-xl border border-[#5d3d3a] bg-[#3b110c] shadow-2xl overflow-hidden aspect-video flex items-center justify-center">
              <img
                src="/features/hero-preview.png"
                alt="Claude Cursor showing multiple terminal sessions"
                width={1280}
                height={720}
                className="w-full h-auto"
              />
            </div>
            <div className="absolute -inset-4 -z-10 rounded-2xl bg-gradient-to-b from-[#dd5013]/15 via-[#bdb7fc]/8 to-transparent blur-2xl" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 bg-[#3b110c]/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#f8eed2] text-center mb-4">
            Everything you need
          </h2>
          <p className="text-lg text-[#c4b898] text-center max-w-2xl mx-auto mb-16">
            A complete terminal management solution for developers who run long
            tasks.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-[#5d3d3a] bg-[#3b110c]/60 p-6 hover:bg-[#4d1e17]/60 transition-colors"
              >
                <div
                  className="w-10 h-10 rounded-lg bg-[#bdb7fc]/10 text-[#bdb7fc] flex items-center justify-center mb-4"
                  dangerouslySetInnerHTML={{ __html: f.icon }}
                />
                <h3 className="text-lg font-semibold text-[#f8eed2] mb-2">
                  {f.title}
                </h3>
                <p className="text-[#c4b898] text-sm leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Showcase */}
      <section id="showcase" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#f8eed2] text-center mb-4">
            See it in action
          </h2>
          <p className="text-lg text-[#c4b898] text-center max-w-2xl mx-auto mb-16">
            A walkthrough of how Claude Cursor keeps your terminal sessions
            running and keeps you informed.
          </p>

          <div className="space-y-24">
            {SHOWCASE.map((s, i) => (
              <div
                key={s.title}
                className={`flex flex-col ${
                  i % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
                } items-center gap-12`}
              >
                <div className="flex-1 w-full">
                  <div className="rounded-xl border border-[#5d3d3a] bg-[#3b110c] shadow-lg overflow-hidden aspect-video flex items-center justify-center">
                    <SlowVideo src={s.video} className="w-full h-full object-cover" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-[#f8eed2] mb-3">
                    {s.title}
                  </h3>
                  <p className="text-[#c4b898] text-lg leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tip */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-xl border border-[#5d3d3a] bg-[#3b110c]/80 p-8">
            <h3 className="text-lg font-semibold text-[#e9e4a6] mb-3 flex items-center gap-2">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
              Tip: tmux mouse mode
            </h3>
            <p className="text-[#c4b898] text-sm leading-relaxed mb-4">
              Claude Cursor uses tmux for session persistence. You can enable
              mouse scrolling and selection inside the terminal with tmux mouse
              mode:
            </p>
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <code className="px-3 py-1.5 rounded-lg bg-[#2a0a07] text-[#bdb7fc] text-sm font-mono whitespace-nowrap">
                  ctrl+b set mouse on
                </code>
                <span className="text-[#8a7a6a] text-sm pt-1">
                  Enable mouse scrollback and text selection
                </span>
              </div>
              <div className="flex items-start gap-3">
                <code className="px-3 py-1.5 rounded-lg bg-[#2a0a07] text-[#bdb7fc] text-sm font-mono whitespace-nowrap">
                  ctrl+b set mouse off
                </code>
                <span className="text-[#8a7a6a] text-sm pt-1">
                  Disable mouse mode to restore native copy/paste
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

const FEATURES = [
  {
    title: "Persistent sessions",
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 9l3 3-3 3M13 15h4"/></svg>',
    desc: "Powered by tmux under the hood. Sessions survive browser disconnects, server restarts, and SSH drops. Reconnect anytime.",
  },
  {
    title: "Browser-based access",
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>',
    desc: "Access your terminals from any device with a browser. No SSH keys, no port forwarding. Just open the URL.",
  },
  {
    title: "Slack & Discord alerts",
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>',
    desc: "Get notified when a session needs input — approval prompts, password requests, or task completions. Reply directly from chat.",
  },
  {
    title: "AI-powered detection",
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 20V10M18 20V4M6 20v-4"/></svg>',
    desc: "Uses Claude Haiku to detect when a terminal is waiting for input. No more checking back — it watches for you.",
  },
  {
    title: "Multiple shells",
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
    desc: "Bash, Zsh, Fish, or Sh — use whichever shell you prefer. Create as many sessions as you need, each with its own shell.",
  },
  {
    title: "Cloudflare Tunnel",
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"/></svg>',
    desc: "Auto-starts a Cloudflare tunnel so you can access your sessions from anywhere. Share the URL — no port forwarding needed.",
  },
  {
    title: "Remote sessions",
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/><circle cx="12" cy="12" r="3"/></svg>',
    desc: "Connect to other Claude Cursor instances via cloudflared URLs or share links. Monitor their sessions alongside your own.",
  },
  {
    title: "Grid view",
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>',
    desc: "View all running terminals simultaneously in a resizable grid. Adjust the size with a slider — auto-wraps with scroll.",
  },
  {
    title: "Broadcast input",
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2a5.5 5.5 0 010-8.4"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8a5.5 5.5 0 010 8.4"/><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/></svg>',
    desc: "Press Shift+Enter to send Enter to every running session at once — local and remote. Perfect for batch confirmations.",
  },
];

const SHOWCASE = [
  {
    title: "Create sessions instantly",
    video: "/features/create-session.mp4",
    desc: "Spin up a new terminal session in one click. Choose your shell, name it, and start working. Each session gets its own tmux instance that persists across disconnects.",
  },
  {
    title: "Smart action detection",
    video: "/features/needs-action.mp4",
    desc: "Claude Cursor watches your terminals and detects when they need attention — approval prompts, password requests, or completed tasks. No more checking back manually.",
  },
  {
    title: "Notifications where you work",
    video: "/features/notifications.mp4",
    desc: "Get Slack or Discord alerts when a session needs input. See the prompt, expand the terminal context, or reply directly from your chat app to send input to the terminal.",
  },
  {
    title: "Access from anywhere",
    video: "/features/tunnel.mp4",
    desc: "Auto-starts a Cloudflare tunnel so your terminals are accessible from any device. Share the public URL with your team or access your sessions from your phone.",
  },
  {
    title: "Monitor remote instances",
    video: "/features/remote-sessions.mp4",
    desc: "Add other Claude Cursor instances by their cloudflared URL or share link. Their sessions appear in your sidebar alongside your own — monitor everything from one window.",
  },
  {
    title: "Grid view for everything",
    video: "/features/grid-view.mp4",
    desc: "Toggle grid view to see all your terminals at once. Drag the size slider to resize tiles — the grid auto-wraps and scrolls to fit.",
  },
  {
    title: "Broadcast to all sessions",
    video: "/features/broadcast-enter.mp4",
    desc: "Press Shift+Enter to send Enter to every running terminal simultaneously. Great for batch approvals, confirmations, or restarting multiple processes at once.",
  },
];
