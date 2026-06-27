import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import OrgSettings from "@/components/Dashboard/OrgSettings";

export default async function SettingsPage() {
  const session = await auth();

  const org = await prisma.organization.findFirst({
    where: { ownerId: session!.user.id },
    select: { name: true, slug: true, publicApiKey: true },
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Organization details and API key.
        </p>
      </div>
      <OrgSettings org={org!} />
    </div>
  );
}
