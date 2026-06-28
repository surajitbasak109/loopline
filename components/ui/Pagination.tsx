"use client";

export const LIMIT_OPTIONS = [10, 25, 50, 100] as const;
export type PageLimit = (typeof LIMIT_OPTIONS)[number];

type Props = {
  page: number;
  limit: PageLimit;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: PageLimit) => void;
};

export function Pagination({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
}: Props) {
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between pt-4 border-t border-gray-100 flex-wrap gap-4">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span>Rows per page</span>
        <select
          value={limit}
          onChange={(e) => onLimitChange(Number(e.target.value) as PageLimit)}
          className="border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-700 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {LIMIT_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-500">
        <span>
          {from}–{to} of {total}
        </span>
        <div className="flex gap-1">
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Previous page"
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            ←
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label="Next page"
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}
