import { notFound } from "next/navigation";
import Link from "next/link";
import { marked } from "marked";
import { prisma } from "@/lib/prisma";

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  const entries = await prisma.changelogEntry.findMany({
    where: { publishedAt: { not: null } },
    select: { slug: true, organization: { select: { slug: true } } },
  });
  return entries.map((e) => ({
    orgSlug: e.organization.slug,
    entrySlug: e.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orgSlug: string; entrySlug: string }>;
}) {
  const { orgSlug, entrySlug } = await params;
  const org = await prisma.organization.findFirst({
    where: { slug: orgSlug },
    select: { id: true, name: true },
  });
  if (!org) return {};
  const entry = await prisma.changelogEntry.findFirst({
    where: { organizationId: org.id, slug: entrySlug, publishedAt: { not: null } },
    select: { title: true },
  });
  if (!entry) return {};
  return { title: `${entry.title} — ${org.name} Changelog` };
}

export default async function ChangelogEntryPage({
  params,
}: {
  params: Promise<{ orgSlug: string; entrySlug: string }>;
}) {
  const { orgSlug, entrySlug } = await params;

  const org = await prisma.organization.findFirst({
    where: { slug: orgSlug },
    select: { id: true, name: true },
  });
  if (!org) notFound();

  const entry = await prisma.changelogEntry.findFirst({
    where: {
      organizationId: org.id,
      slug: entrySlug,
      publishedAt: { not: null },
    },
    select: { title: true, body: true, publishedAt: true },
  });
  if (!entry) notFound();

  const html = marked.parse(entry.body) as string;

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-indigo-600">{org.name}</span>
            <h1 className="text-xl font-bold text-gray-900 mt-0.5">Changelog</h1>
          </div>
          <Link
            href={`/changelog/${orgSlug}`}
            className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
          >
            ← All updates
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <p className="text-xs font-medium text-indigo-600 uppercase tracking-wide mb-3">
          {entry.publishedAt!.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
        <h2 className="text-3xl font-bold text-gray-900 mb-10">{entry.title}</h2>

        <div
          className="text-gray-700 leading-relaxed
            [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-gray-900 [&_h1]:mt-8 [&_h1]:mb-3
            [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-gray-900 [&_h2]:mt-8 [&_h2]:mb-3
            [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-gray-900 [&_h3]:mt-6 [&_h3]:mb-2
            [&_p]:mt-4 [&_p]:first:mt-0
            [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul>li]:mt-1
            [&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol>li]:mt-1
            [&_code]:bg-gray-100 [&_code]:text-gray-800 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono
            [&_pre]:mt-4 [&_pre]:bg-gray-50 [&_pre]:border [&_pre]:border-gray-100 [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:overflow-x-auto
            [&_pre_code]:bg-transparent [&_pre_code]:p-0
            [&_blockquote]:mt-4 [&_blockquote]:border-l-4 [&_blockquote]:border-indigo-200 [&_blockquote]:pl-4 [&_blockquote]:text-gray-500 [&_blockquote]:italic
            [&_hr]:my-8 [&_hr]:border-gray-100
            [&_a]:text-indigo-600 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-indigo-800
            [&_strong]:font-semibold [&_strong]:text-gray-900
            [&_img]:mt-4 [&_img]:rounded-lg [&_img]:max-w-full"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </main>
    </div>
  );
}
