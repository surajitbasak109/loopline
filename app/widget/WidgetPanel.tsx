"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

type Post = {
  id: string;
  title: string;
  body?: string | null;
  status: string;
  voteCount: number;
};

type Tab = "feedback" | "submit";

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Open",
  PLANNED: "Planned",
  IN_PROGRESS: "In progress",
  DONE: "Done",
  DECLINED: "Declined",
};

const STATUS_COLOR: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-700",
  PLANNED: "bg-purple-100 text-purple-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700",
  DONE: "bg-green-100 text-green-700",
  DECLINED: "bg-gray-100 text-gray-500",
};

export default function WidgetPanel() {
  const params = useSearchParams();
  const apiKey = params.get("key") ?? "";

  const [tab, setTab] = useState<Tab>("feedback");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [voted, setVoted] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({ title: "", body: "", submitterEmail: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // ── postMessage resize ───────────────────────────────────────────────────────

  const sendResize = useCallback(() => {
    if (!containerRef.current) return;
    const height = containerRef.current.scrollHeight;
    window.parent.postMessage({ type: "resize", height }, "*");
  }, []);

  useLayoutEffect(() => {
    sendResize();
  });

  useEffect(() => {
    const ro = new ResizeObserver(sendResize);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [sendResize]);

  // ── Fetch posts ──────────────────────────────────────────────────────────────

  const fetchPosts = useCallback(async () => {
    if (!apiKey) return;
    setLoading(true);
    try {
      const res = await fetch("/api/public/posts", {
        headers: { authorization: `Bearer ${apiKey}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts);
      }
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  // ── Vote ─────────────────────────────────────────────────────────────────────

  async function vote(postId: string) {
    if (voted.has(postId)) return;
    const res = await fetch(`/api/public/posts/${postId}/vote`, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}` },
    });
    if (res.ok || res.status === 409) {
      setVoted((v) => new Set([...v, postId]));
      setPosts((ps) =>
        ps.map((p) => (p.id === postId ? { ...p, voteCount: p.voteCount + (res.ok ? 1 : 0) } : p)),
      );
    }
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/posts", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          title: form.title,
          body: form.body || undefined,
          submitterEmail: form.submitterEmail || undefined,
        }),
      });
      if (res.ok) {
        setSubmitDone(true);
        setForm({ title: "", body: "", submitterEmail: "" });
        await fetchPosts();
        setTimeout(() => { setSubmitDone(false); setTab("feedback"); }, 1800);
      } else {
        const data = await res.json();
        setError(data.error ? JSON.stringify(data.error) : "Something went wrong.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  // ── Close ────────────────────────────────────────────────────────────────────

  function closeWidget() {
    window.parent.postMessage({ type: "close" }, "*");
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-white font-sans text-sm text-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span className="font-semibold text-gray-900">Feedback</span>
        <button
          onClick={closeWidget}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        {(["feedback", "submit"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-medium capitalize transition-colors ${
              tab === t
                ? "border-b-2 border-indigo-500 text-indigo-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "feedback" ? "View feedback" : "Submit idea"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "feedback" && (
          <div>
            {loading ? (
              <p className="text-center text-gray-400 py-10">Loading…</p>
            ) : posts.length === 0 ? (
              <p className="text-center text-gray-400 py-10">No feedback yet. Be the first!</p>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="flex gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50">
                  {/* Vote button */}
                  <button
                    onClick={() => vote(post.id)}
                    disabled={voted.has(post.id)}
                    className={`flex flex-col items-center justify-center min-w-[40px] h-[44px] rounded-lg border text-xs font-semibold transition-colors ${
                      voted.has(post.id)
                        ? "border-indigo-300 bg-indigo-50 text-indigo-500 cursor-default"
                        : "border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-500"
                    }`}
                    aria-label="Vote"
                  >
                    <span>▲</span>
                    <span>{post.voteCount}</span>
                  </button>

                  {/* Post info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{post.title}</p>
                    {post.body && (
                      <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{post.body}</p>
                    )}
                    <span
                      className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[post.status] ?? "bg-gray-100 text-gray-500"}`}
                    >
                      {STATUS_LABEL[post.status] ?? post.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "submit" && (
          <form onSubmit={submit} className="p-4 flex flex-col gap-3">
            {submitDone && (
              <div className="rounded-lg bg-green-50 text-green-700 text-sm px-3 py-2">
                Thanks! Your idea was submitted.
              </div>
            )}
            {error && (
              <div className="rounded-lg bg-red-50 text-red-600 text-sm px-3 py-2">{error}</div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Title <span className="text-red-400">*</span>
              </label>
              <input
                required
                minLength={3}
                maxLength={120}
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="What would you like to see?"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Details</label>
              <textarea
                maxLength={2000}
                rows={3}
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                placeholder="More context (optional)"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input
                type="email"
                value={form.submitterEmail}
                onChange={(e) => setForm((f) => ({ ...f, submitterEmail: e.target.value }))}
                placeholder="you@example.com (optional)"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white font-semibold py-2 transition-colors"
            >
              {submitting ? "Submitting…" : "Submit idea"}
            </button>
          </form>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-100 text-center text-xs text-gray-400">
        Powered by <span className="font-medium text-gray-500">Loopline</span>
      </div>
    </div>
  );
}
