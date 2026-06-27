import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import ChangelogList from "@/components/Dashboard/ChangelogList";

export default async function ChangelogPage() {
  const session = await auth();

  const org = await prisma.organization.findFirst({
    where: { ownerId: session!.user.id },
    select: { id: true },
  });

  const entries = await prisma.changelogEntry.findMany({
    where: { organizationId: org!.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      publishedAt: true,
      createdAt: true,
    },
  });

  const serialized = entries.map((e) => ({
    ...e,
    publishedAt: e.publishedAt?.toISOString() ?? null,
    createdAt: e.createdAt.toISOString(),
  }));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Changelog</h1>
        <p className="text-sm text-gray-500 mt-1">
          Publish updates and announcements to your users.
        </p>
      </div>
      <ChangelogList initialEntries={serialized} />
    </div>
  );
}
