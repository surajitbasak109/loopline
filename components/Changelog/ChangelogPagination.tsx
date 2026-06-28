"use client";

import { useRouter } from "next/navigation";
import { Pagination, type PageLimit } from "@/components/ui/Pagination";

type Props = {
  orgSlug: string;
  page: number;
  limit: PageLimit;
  total: number;
  totalPages: number;
};

export default function ChangelogPagination({
  orgSlug,
  page,
  limit,
  total,
  totalPages,
}: Props) {
  const router = useRouter();

  function navigate(newPage: number, newLimit: PageLimit) {
    const params = new URLSearchParams();
    if (newPage > 1) params.set("page", String(newPage));
    if (newLimit !== 10) params.set("limit", String(newLimit));
    const qs = params.toString();
    router.push(`/changelog/${orgSlug}${qs ? `?${qs}` : ""}`);
  }

  return (
    <Pagination
      page={page}
      limit={limit}
      total={total}
      totalPages={totalPages}
      onPageChange={(p) => navigate(p, limit)}
      onLimitChange={(l) => navigate(1, l)}
    />
  );
}
