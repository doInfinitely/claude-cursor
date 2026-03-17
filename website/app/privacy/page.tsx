import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy — Claude Cursor",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#1a0805] text-[#f8eed2]">
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 pt-28 pb-20">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-[#8a7a6a] mb-10">
          Last updated: March 17, 2026
        </p>

        <div className="space-y-8 text-[#c4b898] leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-[#f8eed2] mb-3">
              Overview
            </h2>
            <p>
              Claude Cursor (&ldquo;the App&rdquo;) is a companion application
              for managing terminal sessions on your own self-hosted Claude
              Cursor server. Your privacy is important to us. This policy
              explains what data the App collects and how it is used.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#f8eed2] mb-3">
              Data Collection
            </h2>
            <p>
              <strong>The App does not collect, store, or transmit any personal
              data to us.</strong> All data stays on your device and your
              self-hosted server.
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>
                <strong>Server connections:</strong> Server URLs and names you
                add are stored locally on your device using on-device storage
                (SwiftData on iOS, Room on Android). They are never sent to us.
              </li>
              <li>
                <strong>Terminal sessions:</strong> Terminal content is
                transmitted directly between your device and your self-hosted
                server over WebSocket. We do not have access to this data.
              </li>
              <li>
                <strong>No analytics:</strong> The App does not include any
                analytics, tracking, or crash reporting SDKs.
              </li>
              <li>
                <strong>No accounts:</strong> The App does not require you to
                create an account or sign in.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#f8eed2] mb-3">
              Network Communication
            </h2>
            <p>
              The App communicates only with the server URLs you configure. This
              includes REST API calls for session management and WebSocket
              connections for real-time terminal access. All communication is
              between your device and your server &mdash; no third-party
              services are contacted by the App.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#f8eed2] mb-3">
              Share Links
            </h2>
            <p>
              When you open a share link, the App connects to the server
              specified in the link using a time-limited token. The token is used
              solely to authenticate the shared session and is not stored
              permanently.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#f8eed2] mb-3">
              Third-Party Services
            </h2>
            <p>
              The App itself does not integrate with any third-party services.
              The website (claudecursor.com) uses Vercel Analytics for
              aggregated, anonymous page view statistics. The App does not.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#f8eed2] mb-3">
              Changes to This Policy
            </h2>
            <p>
              We may update this privacy policy from time to time. Changes will
              be posted on this page with an updated date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#f8eed2] mb-3">
              Contact
            </h2>
            <p>
              If you have questions about this privacy policy, please open an
              issue on our{" "}
              <a
                href="https://github.com/doInfinitely/claude-cursor"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#bdb7fc] underline hover:text-[#d0cbff] transition-colors"
              >
                GitHub repository
              </a>
              .
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
