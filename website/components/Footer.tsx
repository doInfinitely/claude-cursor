export default function Footer() {
  return (
    <footer className="border-t border-[#5d3d3a]/40 py-10 px-6 text-center text-sm text-[#8a7a6a]">
      <p>
        &copy; {new Date().getFullYear()} Claude Cursor &middot;{" "}
        <a
          href="https://github.com/doInfinitely/claude-cursor"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-[#c4b898] transition-colors"
        >
          Open Source
        </a>
      </p>
    </footer>
  );
}
