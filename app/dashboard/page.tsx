import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-500 text-sm">
          Signed in as <span className="font-medium text-gray-700">{session.user.email}</span>
        </p>
        <p className="mt-6 text-xs text-gray-400">Full dashboard UI coming soon.</p>
      </div>
    </div>
  );
}
