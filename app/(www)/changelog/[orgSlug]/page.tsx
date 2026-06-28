import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ChangelogPagination from "@/components/Changelog/ChangelogPagination";
import { type PageLimit } from "@/components/ui/Pagination";

export const revalidate = 60;
export const dynamicParams = true;

const VALID_LIMITS: PageLimit[] = [10, 25, 50, 100];

function parseParams(raw: { page?: string; limit?: string }) {
  const limit: PageLimit = VALID_LIMITS.includes(
    Number(raw.limit) as PageLimit,
  )
    ? (Number(raw.limit) as PageLimit)
    : 10;
  const page = Math.max(1, parseInt(raw.page ?? "1", 10) || 1);
  return { page, limit };
}

export async function generateStaticParams() {
  try {
    const orgs = await prisma.organization.findMany({ select: { slug: true } });
    return orgs.map((o) => ({ orgSlug: o.slug }));
  } catch {
    return [];
  }
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
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ page?: string; limit?: string }>;
}) {
  const { orgSlug } = await params;
  const { page, limit } = parseParams(await searchParams);

  const org = await prisma.organization.findFirst({
    where: { slug: orgSlug },
    select: { id: true, name: true },
  });
  if (!org) notFound();

  const where = { organizationId: org.id, publishedAt: { not: null } } as const;

  const [total, entries] = await Promise.all([
    prisma.changelogEntry.count({ where }),
    prisma.changelogEntry.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: { title: true, slug: true, publishedAt: true },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.min(page, totalPages);

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-indigo-600">
              {org.name}
            </span>
            <h1 className="text-xl font-bold text-gray-900 mt-0.5">
              Changelog
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        {total === 0 ? (
          <p className="text-sm text-gray-400 text-center py-16">
            No updates published yet.
          </p>
        ) : (
          <>
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
                  <span className="text-gray-300 shrink-0 mt-0.5">→</span>
                </Link>
              ))}
            </div>

            <ChangelogPagination
              orgSlug={orgSlug}
              page={currentPage}
              limit={limit}
              total={total}
              totalPages={totalPages}
            />
          </>
        )}
      </main>
    </div>
  );
}
