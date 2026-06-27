import Link from "next/link";

export default function Footer() {
  return (
    <footer className="py-10 px-6 border-t border-gray-100">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="font-bold text-indigo-600 tracking-tight">Loopline</span>
        <div className="flex items-center gap-6 text-sm text-gray-500">
          <Link href="/login" className="hover:text-gray-900 transition-colors">Sign in</Link>
          <Link href="/register" className="hover:text-gray-900 transition-colors">Get started</Link>
          <Link href="/widget-test.html" className="hover:text-gray-900 transition-colors">Widget demo</Link>
        </div>
        <p className="text-xs text-gray-400">© {new Date().getFullYear()} Loopline</p>
      </div>
    </footer>
  );
}
