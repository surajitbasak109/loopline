import Link from "next/link";

export default function Nav() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur border-b border-gray-100">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <span className="font-bold text-indigo-600 text-lg tracking-tight">Loopline</span>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="text-sm bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-4 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
