"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type Platform = "macos" | "linux" | "windows" | "unknown";

const RELEASE_BASE =
  "https://github.com/doInfinitely/claude-cursor/releases/download/v1.0.0";

const INSTALLERS: Record<
  Exclude<Platform, "unknown">,
  { label: string; url: string; note: string }
> = {
  macos: {
    label: "Download for macOS",
    url: `${RELEASE_BASE}/Claude.Cursor-1.0.0-arm64.dmg`,
    note: "macOS 12+ &middot; Apple Silicon",
  },
  linux: {
    label: "Download for Linux",
    url: `${RELEASE_BASE}/claude-cursor_1.0.0_amd64.deb`,
    note: "Ubuntu/Debian &middot; x86_64 (zip also available)",
  },
  windows: {
    label: "Download for Windows (WSL2)",
    url: `${RELEASE_BASE}/claude-cursor-1.0.0-wsl.tar.gz`,
    note: "Windows 10/11 &middot; requires WSL2",
  },
};

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("mac")) return "macos";
  if (ua.includes("win")) return "windows";
  if (ua.includes("linux")) return "linux";
  return "unknown";
}

export default function DownloadPage() {
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [amount, setAmount] = useState("5");
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  const primary = platform !== "unknown" ? platform : "macos";
  const others = (
    Object.keys(INSTALLERS) as Exclude<Platform, "unknown">[]
  ).filter((p) => p !== primary);

  async function handleDownload(p: Exclude<Platform, "unknown">) {
    setLoading(p);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount) || 0, platform: p }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setLoading(null);
      }
    } catch {
      setLoading(null);
    }
  }


  return (
    <>
      <Navbar />

      <section className="relative pt-32 pb-24 px-6">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-[#dd5013]/8 rounded-full blur-[128px] pointer-events-none" />

        <div className="relative mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full border border-[#5d3d3a] bg-[#3b110c]/80 text-xs text-[#c4b898]">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Desktop App
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1] text-[#f8eed2]">
            Download{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#bdb7fc] to-[#dd5013]">
              Claude Cursor
            </span>
          </h1>

          <p className="mt-4 text-lg text-[#c4b898] max-w-xl mx-auto leading-relaxed">
            Get the desktop app to manage persistent terminal sessions from your
            browser. Free and open source.
          </p>

          {/* Pay what you want */}
          <div className="mt-10 max-w-sm mx-auto">
            <div className="rounded-xl border border-[#5d3d3a] bg-[#3b110c]/80 p-6">
              <p className="text-sm text-[#c4b898] mb-3">
                Pay what you want
              </p>
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="text-2xl text-[#f8eed2]">$</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-20 text-3xl font-bold text-center text-[#f8eed2] bg-[#2a0a07] border border-[#5d3d3a] rounded-lg px-2 py-1 focus:outline-none focus:border-[#bdb7fc]"
                />
              </div>
              <p className="text-xs text-[#8a7a6a] mb-4">
                Recommended: $5 &middot; Enter $0 for free
              </p>
              <button
                onClick={() => handleDownload(primary)}
                disabled={loading !== null}
                className="inline-flex items-center gap-3 w-full justify-center px-8 py-3.5 text-sm font-semibold rounded-xl bg-[#dd5013] hover:bg-[#e87838] text-[#f8eed2] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading === primary ? (
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                  </svg>
                )}
                {INSTALLERS[primary].label}
              </button>
              <p
                className="mt-2 text-xs text-[#8a7a6a]"
                dangerouslySetInnerHTML={{
                  __html: INSTALLERS[primary].note,
                }}
              />
            </div>
          </div>

          {/* Other platforms */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            {others.map((p) => (
              <button
                key={p}
                onClick={() => handleDownload(p)}
                disabled={loading !== null}
                className="flex items-center gap-2 px-5 py-2.5 text-sm rounded-lg border border-[#5d3d3a] hover:border-[#7a5955] text-[#c4b898] hover:text-[#f8eed2] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading === p ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                  </svg>
                )}
                {INSTALLERS[p].label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Requirements & Setup */}
      <section className="py-20 px-6 border-t border-[#5d3d3a]/40">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-2xl font-bold tracking-tight text-center mb-10 text-[#f8eed2]">
            Quick Setup
          </h2>

          <ol className="space-y-6">
            {[
              {
                step: "1",
                title: "Install dependencies",
                desc: "Claude Cursor requires ttyd and tmux for terminal sessions, and cloudflared for public URL tunnels. See install commands below.",
              },
              {
                step: "2",
                title: "Run the installer",
                desc: "Open the downloaded DMG and drag to Applications (macOS) or run the .deb package (Linux).",
              },
              {
                step: "3",
                title: "Launch and connect",
                desc: "Open Claude Cursor. It starts the server automatically and opens your browser. Create your first session from the sidebar.",
              },
              {
                step: "4",
                title: "Set up notifications (optional)",
                desc: "Click the bell icon to configure Slack or Discord notifications. Add your Anthropic API key for AI-powered action detection.",
              },
            ].map(({ step, title, desc }) => (
              <li key={step} className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#dd5013]/10 text-[#dd5013] text-sm font-bold flex items-center justify-center">
                  {step}
                </span>
                <div>
                  <h3 className="font-semibold mb-1 text-[#f8eed2]">
                    {title}
                  </h3>
                  <p className="text-sm text-[#8a7a6a] leading-relaxed">
                    {desc}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          {/* Dependencies install commands */}
          <div className="mt-10 p-5 rounded-xl border border-[#5d3d3a] bg-[#3b110c]/60">
            <h3 className="font-semibold text-[#e9e4a6] mb-2 flex items-center gap-2">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <polyline points="4 17 10 11 4 5" />
                <line x1="12" y1="19" x2="20" y2="19" />
              </svg>
              Required dependencies
            </h3>
            <p className="text-sm text-[#c4b898] leading-relaxed mb-4">
              <strong className="text-[#f8eed2]">ttyd</strong> and{" "}
              <strong className="text-[#f8eed2]">tmux</strong> are required for
              terminal sessions.{" "}
              <strong className="text-[#f8eed2]">cloudflared</strong> is optional
              but needed for public URL tunnels (access from mobile/anywhere).
            </p>

            <div className="space-y-4 text-sm">
              <div>
                <p className="text-[#c4b898] font-medium mb-1.5">macOS (Homebrew)</p>
                <code className="block px-3 py-2 rounded-lg bg-[#2a0a07] text-[#bdb7fc] font-mono">
                  brew install ttyd tmux cloudflare/cloudflare/cloudflared
                </code>
              </div>
              <div>
                <p className="text-[#c4b898] font-medium mb-1.5">Ubuntu / Debian / WSL2</p>
                <code className="block px-3 py-2 rounded-lg bg-[#2a0a07] text-[#bdb7fc] font-mono whitespace-pre-wrap">
                  sudo apt install ttyd tmux{"\n"}
                  {"\n"}# cloudflared (optional){"\n"}
                  curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o /tmp/cloudflared.deb{"\n"}
                  sudo dpkg -i /tmp/cloudflared.deb
                </code>
              </div>
            </div>
          </div>

          {/* tmux tip */}
          <div className="mt-10 p-5 rounded-xl border border-[#5d3d3a] bg-[#3b110c]/60">
            <h3 className="font-semibold text-[#e9e4a6] mb-2 flex items-center gap-2">
              <svg
                width="16"
                height="16"
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
            <p className="text-sm text-[#c4b898] leading-relaxed mb-3">
              Enable mouse scrolling and text selection inside the terminal:
            </p>
            <div className="space-y-1.5 text-sm">
              <code className="block px-3 py-1.5 rounded-lg bg-[#2a0a07] text-[#bdb7fc] font-mono">
                ctrl+b set mouse on
              </code>
              <code className="block px-3 py-1.5 rounded-lg bg-[#2a0a07] text-[#bdb7fc] font-mono">
                ctrl+b set mouse off
              </code>
            </div>
          </div>

          {/* Windows/WSL2 setup */}
          <div className="mt-6 p-5 rounded-xl border border-[#5d3d3a] bg-[#3b110c]/60">
            <h3 className="font-semibold text-[#e9e4a6] mb-2 flex items-center gap-2">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8M12 17v4" />
              </svg>
              Windows / WSL2
            </h3>
            <p className="text-sm text-[#c4b898] leading-relaxed mb-3">
              Claude Cursor runs inside WSL2 on Windows. Follow these steps:
            </p>
            <ol className="space-y-2 text-sm text-[#c4b898]">
              <li>
                <span className="text-[#dd5013] font-semibold">1.</span>{" "}
                Install WSL2 from PowerShell:
                <code className="block mt-1 px-3 py-1.5 rounded-lg bg-[#2a0a07] text-[#bdb7fc] font-mono">
                  wsl --install
                </code>
              </li>
              <li>
                <span className="text-[#dd5013] font-semibold">2.</span>{" "}
                Inside WSL, install dependencies:
                <code className="block mt-1 px-3 py-1.5 rounded-lg bg-[#2a0a07] text-[#bdb7fc] font-mono">
                  sudo apt install nodejs npm ttyd tmux
                </code>
              </li>
              <li>
                <span className="text-[#dd5013] font-semibold">3.</span>{" "}
                Extract and install:
                <code className="block mt-1 px-3 py-1.5 rounded-lg bg-[#2a0a07] text-[#bdb7fc] font-mono whitespace-pre-wrap">
                  tar xzf claude-cursor-1.0.0-wsl.tar.gz{"\n"}cd claude-cursor-1.0.0-wsl{"\n"}npm install && cd frontend && npm install
                </code>
              </li>
              <li>
                <span className="text-[#dd5013] font-semibold">4.</span>{" "}
                Run and open the printed URL in your Windows browser:
                <code className="block mt-1 px-3 py-1.5 rounded-lg bg-[#2a0a07] text-[#bdb7fc] font-mono">
                  npm run dev
                </code>
              </li>
            </ol>
          </div>

          {/* macOS troubleshooting */}
          <div className="mt-6 p-5 rounded-xl border border-[#c08a50]/30 bg-[#c08a50]/5">
            <h3 className="font-semibold text-[#c08a50] mb-2 flex items-center gap-2">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
              macOS: &ldquo;App is damaged&rdquo; fix
            </h3>
            <p className="text-sm text-[#c4b898] leading-relaxed mb-3">
              If macOS says the app is damaged, open Terminal and run:
            </p>
            <code className="block px-4 py-2.5 rounded-lg bg-[#2a0a07] text-sm text-[#f8eed2] font-mono">
              xattr -cr /Applications/Claude\ Cursor.app
            </code>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
