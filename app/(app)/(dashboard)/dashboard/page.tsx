import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import StatsCard from "@/components/Dashboard/StatsCard";

export default async function DashboardPage() {
  const session = await auth();

  const org = await prisma.organization.findFirst({
    where: { ownerId: session!.user.id },
    select: { id: true },
  });

  const [totalPosts, openPosts, totalChangelog, publishedChangelog] =
    await Promise.all([
      prisma.post.count({ where: { organizationId: org!.id } }),
      prisma.post.count({ where: { organizationId: org!.id, status: "OPEN" } }),
      prisma.changelogEntry.count({ where: { organizationId: org!.id } }),
      prisma.changelogEntry.count({
        where: { organizationId: org!.id, publishedAt: { not: null } },
      }),
    ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Overview</h1>
      <p className="text-sm text-gray-500 mb-8">
        Welcome back, {session?.user.name ?? session?.user.email}
      </p>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatsCard label="Total Feedback" value={totalPosts} />
        <StatsCard label="Open" value={openPosts} />
        <StatsCard label="Changelog Entries" value={totalChangelog} />
        <StatsCard label="Published" value={publishedChangelog} />
      </div>
    </div>
  );
}
