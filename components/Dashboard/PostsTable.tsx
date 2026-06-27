"use client";

import { useState } from "react";
import StatusBadge from "./StatusBadge";

type PostStatus = "OPEN" | "PLANNED" | "IN_PROGRESS" | "DONE" | "DECLINED";

type Post = {
  id: string;
  title: string;
  body: string | null;
  status: PostStatus;
  voteCount: number;
  submitterEmail: string | null;
  createdAt: string;
};

const ALL_STATUSES: PostStatus[] = [
  "OPEN",
  "PLANNED",
  "IN_PROGRESS",
  "DONE",
  "DECLINED",
];

const STATUS_LABELS: Record<PostStatus, string> = {
  OPEN: "Open",
  PLANNED: "Planned",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
  DECLINED: "Declined",
};

export default function PostsTable({ initialPosts }: { initialPosts: Post[] }) {
  const [posts, setPosts] = useState(initialPosts);
  const [filter, setFilter] = useState<PostStatus | "ALL">("ALL");
  const [busy, setBusy] = useState<string | null>(null);

  const visible =
    filter === "ALL" ? posts : posts.filter((p) => p.status === filter);

  async function changeStatus(id: string, status: PostStatus) {
    setBusy(id);
    const res = await fetch(`/api/admin/posts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setPosts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status } : p)),
      );
    }
    setBusy(null);
  }

  async function deletePost(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setBusy(id);
    const res = await fetch(`/api/admin/posts/${id}`, { method: "DELETE" });
    if (res.ok) {
      setPosts((prev) => prev.filter((p) => p.id !== id));
    }
    setBusy(null);
  }

  return (
    <div>
      <div className="flex gap-1.5 mb-5 flex-wrap">
        <FilterTab active={filter === "ALL"} onClick={() => setFilter("ALL")}>
          All ({posts.length})
        </FilterTab>
        {ALL_STATUSES.map((s) => (
          <FilterTab key={s} active={filter === s} onClick={() => setFilter(s)}>
            {STATUS_LABELS[s]} ({posts.filter((p) => p.status === s).length})
          </FilterTab>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-gray-400 py-12 text-center">
          {posts.length === 0 ? "No feedback yet." : "No posts with this status."}
        </p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-3">
                  Title
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-3">
                  Status
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-3">
                  Votes
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-3">
                  Submitted by
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-3">
                  Date
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {visible.map((post) => (
                <tr
                  key={post.id}
                  className="border-b border-gray-50 last:border-0"
                >
                  <td className="px-4 py-3 max-w-xs">
                    <p className="font-medium text-gray-900 truncate">
                      {post.title}
                    </p>
                    {post.body && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {post.body}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge status={post.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-700">{post.voteCount}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-[160px] truncate">
                    {post.submitterEmail ?? (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <select
                        value={post.status}
                        disabled={busy === post.id}
                        onChange={(e) =>
                          changeStatus(post.id, e.target.value as PostStatus)
                        }
                        className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600 bg-white cursor-pointer disabled:opacity-50"
                      >
                        {ALL_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => deletePost(post.id, post.title)}
                        disabled={busy === post.id}
                        className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50 cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilterTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
        active
          ? "bg-indigo-600 text-white"
          : "bg-white text-gray-500 border border-gray-200 hover:text-gray-700"
      }`}
    >
      {children}
    </button>
  );
}
