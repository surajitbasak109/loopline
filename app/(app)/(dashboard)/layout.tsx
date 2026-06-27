import { redirect } from "next/navigation";
import { auth } from "@/auth";
import SidebarNav from "@/components/Dashboard/SidebarNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (!session.user.emailVerified) redirect("/verify-email?pending=true");

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="h-14 bg-white border-b border-gray-100 flex items-center px-6 gap-4">
        <span className="font-bold text-indigo-600 tracking-tight">Loopline</span>
        <span className="text-gray-300">|</span>
        <span className="text-sm text-gray-500">{session.user.email}</span>
      </header>

      <div className="flex flex-1">
        <aside className="w-56 bg-white border-r border-gray-100 p-4 flex flex-col gap-1">
          <SidebarNav />
        </aside>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
