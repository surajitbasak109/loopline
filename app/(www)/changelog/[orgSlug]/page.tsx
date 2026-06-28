import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  const orgs = await prisma.organization.findMany({ select: { slug: true } });
  return orgs.map((o) => ({ orgSlug: o.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await prisma.organization.findFirst({
    where: { slug: orgSlug },
    select: { name: true },
  });
  if (!org) return {};
  return { title: `${org.name} — Changelog` };
}

export default async function ChangelogIndexPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  const org = await prisma.organization.findFirst({
    where: { slug: orgSlug },
    select: { id: true, name: true },
  });
  if (!org) notFound();

  const entries = await prisma.changelogEntry.findMany({
    where: { organizationId: org.id, publishedAt: { not: null } },
    orderBy: { publishedAt: "desc" },
    select: { title: true, slug: true, publishedAt: true },
  });

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-indigo-600">{org.name}</span>
            <h1 className="text-xl font-bold text-gray-900 mt-0.5">Changelog</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        {entries.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-16">
            No updates published yet.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-gray-100">
            {entries.map((entry) => (
              <Link
                key={entry.slug}
                href={`/changelog/${orgSlug}/${entry.slug}`}
                className="group py-6 flex items-start justify-between gap-6 hover:opacity-75 transition-opacity"
              >
                <div>
                  <p className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                    {entry.title}
                  </p>
                  <p className="text-xs text-indigo-600 mt-1 font-medium uppercase tracking-wide">
                    {entry.publishedAt!.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <span className="text-gray-300 flex-shrink-0 mt-0.5">→</span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
