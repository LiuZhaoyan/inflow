"use client";

import { useCallback, useState } from 'react';

export default function UploadArea() {
  const [dragOver, setDragOver] = useState(false);
  const [uploads, setUploads] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    setError(null);
    const form = new FormData();
    for (const f of Array.from(files)) form.append('file', f);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Upload failed');
      setUploads(prev => [...data.files, ...prev]);
    } catch (err: any) {
      setError(err.message || String(err));
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length) {
      uploadFiles(e.dataTransfer.files);
    }
  }, [uploadFiles]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length) uploadFiles(e.target.files);
  }, [uploadFiles]);

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`w-full border-2 rounded p-4 mb-4 transition ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-dashed border-gray-300'}`}
      >
        <p className="text-sm text-gray-600">拖拽文件到此处或点击选择文件上传（本地保存）</p>
        <div className="mt-2">
          <label className="inline-block px-3 py-1 bg-gray-100 rounded cursor-pointer text-sm border">
            选择文件
            <input onChange={onFileChange} type="file" multiple className="hidden" />
          </label>
        </div>
      </div>

      {error && <div className="text-sm text-red-600 mb-2">{error}</div>}

      <div>
        <div className="text-xs text-gray-500 mb-1">已上传（最近）</div>
        <ul className="list-disc pl-5 text-sm text-gray-700">
          {uploads.length === 0 ? <li className="text-gray-400">暂无上传</li> : uploads.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}