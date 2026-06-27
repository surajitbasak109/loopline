import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import PostsTable from "@/components/Dashboard/PostsTable";

export default async function FeedbackPage() {
  const session = await auth();

  const org = await prisma.organization.findFirst({
    where: { ownerId: session!.user.id },
    select: { id: true },
  });

  const posts = await prisma.post.findMany({
    where: { organizationId: org!.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      body: true,
      status: true,
      voteCount: true,
      submitterEmail: true,
      createdAt: true,
    },
  });

  const serialized = posts.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
  }));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Feedback</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage and triage user feedback.
        </p>
      </div>
      <PostsTable initialPosts={serialized} />
    </div>
  );
}
