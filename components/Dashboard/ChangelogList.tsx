"use client";

import { useState } from "react";
import { Pagination, type PageLimit } from "@/components/ui/Pagination";

type Entry = {
  id: string;
  title: string;
  slug: string;
  publishedAt: string | null;
  createdAt: string;
};

type FormData = { title: string; body: string; slug: string };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ChangelogList({
  initialEntries,
}: {
  initialEntries: Entry[];
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<PageLimit>(10);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormData>({ title: "", body: "", slug: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [formBusy, setFormBusy] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(entries.length / limit));
  const currentPage = Math.min(page, totalPages);
  const paginated = entries.slice(
    (currentPage - 1) * limit,
    currentPage * limit,
  );
  function changeLimit(newLimit: PageLimit) {
    setLimit(newLimit);
    setPage(1);
  }

  function autoSlug(title: string) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  async function createEntry() {
    setFormBusy(true);
    setFormError(null);
    const res = await fetch("/api/admin/changelog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setFormError(
        typeof data.error === "string"
          ? data.error
          : "Validation failed — check that the slug uses only lowercase letters, numbers, and hyphens.",
      );
      setFormBusy(false);
      return;
    }
    setEntries((prev) => [
      { ...data.entry, createdAt: new Date().toISOString() },
      ...prev,
    ]);
    setPage(1);
    setForm({ title: "", body: "", slug: "" });
    setShowForm(false);
    setFormBusy(false);
  }

  async function publish(id: string) {
    setBusy(id);
    const res = await fetch(`/api/admin/changelog/${id}/publish`, {
      method: "POST",
    });
    if (res.ok) {
      const { entry } = await res.json();
      setEntries((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, publishedAt: entry.publishedAt } : e,
        ),
      );
    }
    setBusy(null);
  }

  async function deleteEntry(id: string, title: string) {
    if (!confirm(`Delete "${title}"?`)) return;
    setBusy(id);
    const res = await fetch(`/api/admin/changelog/${id}`, { method: "DELETE" });
    if (res.ok) {
      const next = entries.filter((e) => e.id !== id);
      setEntries(next);
      const newTotalPages = Math.max(1, Math.ceil(next.length / limit));
      if (currentPage > newTotalPages) setPage(newTotalPages);
    }
    setBusy(null);
  }

  const canSubmit = form.title.trim() && form.slug.trim() && form.body.trim();

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-gray-500">
          {entries.length} entr{entries.length === 1 ? "y" : "ies"}
        </p>
        <button
          onClick={() => {
            setShowForm((v) => !v);
            setFormError(null);
          }}
          className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
        >
          {showForm ? "Cancel" : "+ New Entry"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-100 rounded-xl p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            New Changelog Entry
          </h3>
          {formError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">
              {formError}
            </p>
          )}
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setForm((f) => ({
                    ...f,
                    title,
                    slug: f.slug || autoSlug(title),
                  }));
                }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="What shipped?"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slug
              </label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) =>
                  setForm((f) => ({ ...f, slug: e.target.value }))
                }
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="my-changelog-entry"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Body (Markdown)
              </label>
              <textarea
                value={form.body}
                onChange={(e) =>
                  setForm((f) => ({ ...f, body: e.target.value }))
                }
                rows={6}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                placeholder="Describe the changes..."
                required
              />
            </div>
            <div>
              <button
                onClick={createEntry}
                disabled={formBusy || !canSubmit}
                className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {formBusy ? "Saving…" : "Save as Draft"}
              </button>
            </div>
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <p className="text-sm text-gray-400 py-12 text-center">
          No changelog entries yet.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {paginated.map((entry) => (
              <div
                key={entry.id}
                className="bg-white rounded-xl border border-gray-100 px-5 py-4 flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 truncate">
                      {entry.title}
                    </p>
                    {entry.publishedAt ? (
                      <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded font-medium shrink-0">
                        Published
                      </span>
                    ) : (
                      <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded font-medium shrink-0">
                        Draft
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 font-mono">
                    {entry.slug}
                  </p>
                </div>
                <p className="text-xs text-gray-400 whitespace-nowrap">
                  {formatDate(entry.publishedAt ?? entry.createdAt)}
                </p>
                <div className="flex items-center gap-4 shrink-0">
                  {!entry.publishedAt && (
                    <button
                      onClick={() => publish(entry.id)}
                      disabled={busy === entry.id}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium disabled:opacity-50 cursor-pointer"
                    >
                      Publish
                    </button>
                  )}
                  <button
                    onClick={() => deleteEntry(entry.id, entry.title)}
                    disabled={busy === entry.id}
                    className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50 cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <Pagination
              page={currentPage}
              limit={limit}
              total={entries.length}
              totalPages={totalPages}
              onPageChange={setPage}
              onLimitChange={changeLimit}
            />
          </div>
        </>
      )}
    </div>
  );
}
