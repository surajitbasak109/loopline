import { redirect } from "next/navigation";
import { auth } from "@/auth";

// All dashboard routes are protected here — individual pages don't need
// their own auth checks.
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="h-14 bg-white border-b border-gray-100 flex items-center px-6 gap-4">
        <span className="font-bold text-indigo-600 tracking-tight">Loopline</span>
        <span className="text-gray-300">|</span>
        <span className="text-sm text-gray-500">{session.user.email}</span>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-56 bg-white border-r border-gray-100 p-4 flex flex-col gap-1">
          <NavItem href="/dashboard" label="Overview" />
          <NavItem href="/dashboard/feedback" label="Feedback" />
          <NavItem href="/dashboard/changelog" label="Changelog" />
          <NavItem href="/dashboard/settings" label="Settings" />
        </aside>

        {/* Main content */}
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}

function NavItem({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors"
    >
      {label}
    </a>
  );
}
