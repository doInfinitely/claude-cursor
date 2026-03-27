import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 border-b border-[#5d3d3a]/40 bg-[#1a0805]/80 backdrop-blur-md">
      <div className="mx-auto max-w-5xl flex items-center justify-between px-6 h-14">
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-[#f8eed2]"
        >
          Claude Cursor
        </Link>
        <div className="flex items-center gap-6 text-sm text-[#c4b898]">
          <a
            href="https://github.com/doInfinitely/claude-cursor"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#f8eed2] transition-colors"
          >
            GitHub
          </a>
          <Link
            href="/download"
            className="px-4 py-1.5 rounded-lg bg-[#dd5013] hover:bg-[#e87838] text-[#f8eed2] font-semibold transition-colors"
          >
            Download
          </Link>
        </div>
      </div>
    </nav>
  );
}
