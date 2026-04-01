import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function AndroidTestingPage() {
  return (
    <>
      <Navbar />

      <section className="relative pt-32 pb-24 px-6">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-[#dd5013]/8 rounded-full blur-[128px] pointer-events-none" />

        <div className="relative mx-auto max-w-2xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full border border-[#5d3d3a] bg-[#3b110c]/80 text-xs text-[#c4b898]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-[#bdb7fc]">
              <path d="M17.523 2.236l1.442-1.442a.5.5 0 01.707.707l-1.57 1.57A7.962 7.962 0 0121 8H3a7.962 7.962 0 012.898-4.929l-1.57-1.57a.5.5 0 01.707-.707l1.442 1.442A7.94 7.94 0 0112 0a7.94 7.94 0 015.523 2.236zM3 10v8a2 2 0 002 2h14a2 2 0 002-2v-8H3zM9 5a1 1 0 100 2 1 1 0 000-2zm6 0a1 1 0 100 2 1 1 0 000-2z" />
            </svg>
            Android Companion App
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1] text-[#f8eed2] mb-4">
            Join the{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#bdb7fc] to-[#dd5013]">
              Android Beta
            </span>
          </h1>

          <p className="text-lg text-[#c4b898] max-w-xl leading-relaxed mb-12">
            The Claude Cursor companion app for Android is in internal testing.
            Follow these steps to get access.
          </p>

          <div className="space-y-6">
            <div className="rounded-xl border border-[#5d3d3a] bg-[#3b110c]/80 p-6">
              <ol className="space-y-8">
                <li className="flex gap-4">
                  <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#dd5013]/10 text-[#dd5013] text-sm font-bold flex items-center justify-center">
                    1
                  </span>
                  <div>
                    <h3 className="font-semibold mb-1 text-[#f8eed2]">
                      Join the Google Group
                    </h3>
                    <p className="text-sm text-[#8a7a6a] leading-relaxed mb-3">
                      You need to be a member of the testers group to access the
                      internal test track.
                    </p>
                    <a
                      href="https://groups.google.com/g/claude-cursor-companion-testers"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-[#bdb7fc]/10 border border-[#bdb7fc]/20 text-[#bdb7fc] hover:bg-[#bdb7fc]/20 transition-colors"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                      </svg>
                      Join Google Group
                    </a>
                  </div>
                </li>

                <li className="flex gap-4">
                  <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#dd5013]/10 text-[#dd5013] text-sm font-bold flex items-center justify-center">
                    2
                  </span>
                  <div>
                    <h3 className="font-semibold mb-1 text-[#f8eed2]">
                      Opt in to internal testing
                    </h3>
                    <p className="text-sm text-[#8a7a6a] leading-relaxed mb-3">
                      Accept the invitation to become an internal tester on
                      Google Play.
                    </p>
                    <a
                      href="https://play.google.com/apps/internaltest/4701651085752508063"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-[#bdb7fc]/10 border border-[#bdb7fc]/20 text-[#bdb7fc] hover:bg-[#bdb7fc]/20 transition-colors"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M9 11l3 3L22 4" />
                        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                      </svg>
                      Opt in to testing
                    </a>
                  </div>
                </li>

                <li className="flex gap-4">
                  <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#dd5013]/10 text-[#dd5013] text-sm font-bold flex items-center justify-center">
                    3
                  </span>
                  <div>
                    <h3 className="font-semibold mb-1 text-[#f8eed2]">
                      Install from Google Play
                    </h3>
                    <p className="text-sm text-[#8a7a6a] leading-relaxed mb-3">
                      Once opted in, install the app from the Play Store listing.
                    </p>
                    <a
                      href="https://play.google.com/store/apps/details?id=com.claudecursor.app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-[#dd5013] text-[#f8eed2] hover:bg-[#e87838] transition-colors"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.523 2.236l1.442-1.442a.5.5 0 01.707.707l-1.57 1.57A7.962 7.962 0 0121 8H3a7.962 7.962 0 012.898-4.929l-1.57-1.57a.5.5 0 01.707-.707l1.442 1.442A7.94 7.94 0 0112 0a7.94 7.94 0 015.523 2.236zM3 10v8a2 2 0 002 2h14a2 2 0 002-2v-8H3zM9 5a1 1 0 100 2 1 1 0 000-2zm6 0a1 1 0 100 2 1 1 0 000-2z" />
                      </svg>
                      Install from Play Store
                    </a>
                  </div>
                </li>

                <li className="flex gap-4">
                  <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#dd5013]/10 text-[#dd5013] text-sm font-bold flex items-center justify-center">
                    4
                  </span>
                  <div>
                    <h3 className="font-semibold mb-1 text-[#f8eed2]">
                      Download the Desktop app
                    </h3>
                    <p className="text-sm text-[#8a7a6a] leading-relaxed mb-3">
                      The companion app connects to a Claude Cursor desktop
                      instance. Download the desktop app to get started.
                    </p>
                    <Link
                      href="/download"
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-[#5d3d3a] text-[#c4b898] hover:text-[#f8eed2] hover:border-[#7a5955] transition-colors"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                      </svg>
                      Download Desktop App
                    </Link>
                  </div>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
