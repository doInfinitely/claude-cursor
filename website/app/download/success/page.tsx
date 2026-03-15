"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const RELEASE_BASE =
  "https://github.com/doInfinitely/claude-cursor/releases/download/v1.0.0";

const INSTALLERS: Record<string, { label: string; url: string }> = {
  macos: {
    label: "macOS installer",
    url: `${RELEASE_BASE}/Claude.Cursor-1.0.0-arm64.dmg`,
  },
  linux: {
    label: "Linux installer",
    url: `${RELEASE_BASE}/claude-cursor_1.0.0_amd64.deb`,
  },
};

function SuccessContent() {
  const searchParams = useSearchParams();
  const platform = searchParams.get("platform") || "macos";
  const installer = INSTALLERS[platform] || INSTALLERS.macos;

  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = installer.url;
    }, 1500);
    return () => clearTimeout(timer);
  }, [installer.url]);

  return (
    <div className="relative mx-auto max-w-xl text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-[#dd5013]/10 text-[#dd5013]">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>

      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#f8eed2]">
        Thank you!
      </h1>

      <p className="mt-4 text-lg text-[#c4b898] leading-relaxed">
        Your download should start automatically.
      </p>

      <a
        href={installer.url}
        className="inline-flex items-center gap-2 mt-6 px-6 py-3 text-sm font-semibold rounded-xl bg-[#dd5013] hover:bg-[#e87838] text-[#f8eed2] transition-colors"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
        </svg>
        Click here if download didn&apos;t start
      </a>

      <p className="mt-8 text-sm text-[#8a7a6a]">
        <Link
          href="/download"
          className="underline hover:text-[#c4b898] transition-colors"
        >
          Back to downloads
        </Link>
      </p>
    </div>
  );
}

export default function DownloadSuccessPage() {
  return (
    <>
      <Navbar />

      <section className="relative pt-32 pb-24 px-6">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-[#dd5013]/8 rounded-full blur-[128px] pointer-events-none" />

        <Suspense
          fallback={
            <div className="relative mx-auto max-w-xl text-center text-[#c4b898]">
              Loading...
            </div>
          }
        >
          <SuccessContent />
        </Suspense>
      </section>

      <Footer />
    </>
  );
}
