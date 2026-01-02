"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";

type BookListItem = {
  id: string;
  title: string;
  level: string;
  metadata?: { sentenceCount?: number; format?: string };
  preview?: string[];
};

export default function BooksManager({ books }: { books: BookListItem[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const total = books.length;
  const totalSentences = useMemo(
    () => books.reduce((acc, b) => acc + (b.metadata?.sentenceCount ?? 0), 0),
    [books]
  );

  const triggerUpload = () => fileInputRef.current?.click();

  const uploadFiles = async (files: FileList | File[]) => {
    setError(null);
    setBusyId("__upload__");
    const form = new FormData();
    for (const f of Array.from(files)) form.append("file", f);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });

      // Avoid assuming JSON: Next can return HTML on crashes.
      const contentType = res.headers.get("content-type") || "";
      const raw = await res.text();
      let data: any = null;
      if (contentType.includes("application/json")) {
        try {
          data = JSON.parse(raw);
        } catch {
          // ignore
        }
      }

      if (!res.ok) throw new Error(data?.error || raw || `Upload failed (${res.status})`);

      // Clear file input so user can re-upload same file if needed.
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setBusyId(null);
    }
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length) await uploadFiles(e.target.files);
  };

  const deleteOne = async (id: string) => {
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/books/${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Delete failed");
      router.refresh();
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setBusyId(null);
    }
  };

  const deleteAll = async () => {
    if (!confirm("Delete ALL books? This will remove data/db.json entries and all data/books/*.json files.")) {
      return;
    }
    setError(null);
    setBusyId("__all__");
    try {
      const res = await fetch("/api/books", { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Delete-all failed");
      router.refresh();
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mt-10 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-sm font-semibold text-gray-900">Manage books</div>
          <div className="mt-1 text-xs text-gray-500">
            {total} books • {totalSentences} sentences
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt,.pdf,.epub"
            className="hidden"
            onChange={onFileChange}
          />
          <button
            type="button"
            onClick={triggerUpload}
            className="px-3 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700"
          >
            {busyId === "__upload__" ? "Uploading..." : "Add (Upload)"}
          </button>
          <button
            type="button"
            onClick={deleteAll}
            disabled={busyId !== null}
            className={`px-3 py-2 rounded-xl text-sm font-semibold border ${
              busyId !== null ? "bg-gray-50 text-gray-400" : "bg-white text-red-600 hover:bg-red-50 border-red-200"
            }`}
          >
            Delete all
          </button>
        </div>
      </div>

      {error && <div className="mt-3 text-sm text-red-600">{error}</div>}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b">
              <th className="py-2 pr-3">Title</th>
              <th className="py-2 pr-3">Level</th>
              <th className="py-2 pr-3">Sentences</th>
              <th className="py-2 pr-3">Format</th>
              <th className="py-2 pr-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {books.length === 0 ? (
              <tr>
                <td className="py-3 text-gray-500" colSpan={5}>
                  No books yet. Click “Add (Upload)” to import one.
                </td>
              </tr>
            ) : (
              books.map((b) => (
                <tr key={b.id} className="border-b last:border-b-0">
                  <td className="py-3 pr-3">
                    <div className="font-semibold text-gray-900">{b.title}</div>
                    <div className="text-xs text-gray-400">id: {b.id}</div>
                  </td>
                  <td className="py-3 pr-3 text-gray-700">{b.level}</td>
                  <td className="py-3 pr-3 text-gray-700">{b.metadata?.sentenceCount ?? 0}</td>
                  <td className="py-3 pr-3 text-gray-700">{b.metadata?.format ?? "-"}</td>
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/read/${b.id}`}
                        className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                      >
                        Open
                      </Link>
                      <button
                        type="button"
                        onClick={() => deleteOne(b.id)}
                        disabled={busyId !== null}
                        className={`px-2.5 py-1.5 rounded-lg border ${
                          busyId !== null
                            ? "bg-gray-50 text-gray-400 border-gray-200"
                            : "bg-white text-red-600 hover:bg-red-50 border-red-200"
                        }`}
                      >
                        {busyId === b.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


