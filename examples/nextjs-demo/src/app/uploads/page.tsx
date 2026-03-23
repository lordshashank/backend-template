"use client";

import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";

interface UploadMeta {
  key: string;
  uploadUrl: string;
}

interface UploadEntry {
  key: string;
  filename: string;
  content_type: string;
  created_at: string;
  previewUrl?: string;
}

export default function UploadsPage() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    url: string;
    filename: string;
  } | null>(null);

  // List user's uploads
  const uploads = useQuery({
    queryKey: ["uploads"],
    queryFn: async () => {
      // Fetch all upload keys, then get signed URLs for preview
      const list = await api<UploadEntry[]>("/uploads");
      return list;
    },
    retry: false,
  });

  // Upload flow: request presigned URL → PUT file to R2
  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    try {
      // 1. Get presigned upload URL from backend
      const { key, uploadUrl } = await api<UploadMeta>("/uploads", {
        method: "POST",
        body: JSON.stringify({
          contentType: file.type,
          filename: file.name,
          fileSize: file.size,
        }),
      });

      // 2. Upload directly to R2/S3
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error(`Upload to storage failed: ${uploadRes.status}`);
      }

      // 3. Mark upload as completed in backend
      await api(`/uploads/${key}/complete`, { method: "POST" });

      // 4. Refresh the list
      queryClient.invalidateQueries({ queryKey: ["uploads"] });

      // Clear file input
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Upload failed"
      );
    } finally {
      setUploading(false);
    }
  };

  // Get signed download URL and show preview
  const viewFile = useMutation({
    mutationFn: (key: string) =>
      api<{ url: string }>(`/uploads/${key}`),
    onSuccess: (data, key) => {
      const entry = uploads.data?.find((u) => u.key === key);
      setPreview({
        url: data.url,
        filename: entry?.filename ?? key,
      });
    },
  });

  // Delete upload
  const deleteUpload = useMutation({
    mutationFn: (key: string) =>
      api(`/uploads/${key}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["uploads"] });
      setPreview(null);
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Uploads</h1>

      {/* Info */}
      <div className="text-xs text-zinc-600 mb-4 p-3 rounded bg-zinc-900 border border-zinc-800">
        Requires <code className="text-zinc-400">ENABLE_STORAGE=true</code> and
        S3/R2 credentials on the backend. Files upload directly to storage via
        presigned URLs — the server never touches file bytes.
      </div>

      {/* Upload form */}
      <div className="rounded-lg border border-zinc-800 p-4 mb-6">
        <div className="flex items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="flex-1 text-sm text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-zinc-800 file:text-zinc-300 file:cursor-pointer hover:file:bg-zinc-700"
          />
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="text-sm px-4 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
      </div>

      {/* Preview modal */}
      {preview && (
        <div className="rounded-lg border border-zinc-800 p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-zinc-300 font-medium">
              {preview.filename}
            </span>
            <button
              onClick={() => setPreview(null)}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              Close
            </button>
          </div>
          <img
            src={preview.url}
            alt={preview.filename}
            className="max-w-full rounded border border-zinc-800"
          />
        </div>
      )}

      {/* Uploads list */}
      <div className="space-y-2">
        {uploads.isLoading && (
          <p className="text-zinc-500 text-sm">Loading uploads...</p>
        )}

        {uploads.isError && (
          <p className="text-red-400 text-sm">
            {(uploads.error as ApiError).status === 401
              ? "Login required. Go to Messages page to login first."
              : "Failed to load uploads. Is ENABLE_STORAGE=true?"}
          </p>
        )}

        {uploads.data?.length === 0 && (
          <p className="text-zinc-600 text-sm">
            No uploads yet. Pick an image and upload it!
          </p>
        )}

        {uploads.data?.map((upload) => (
          <div
            key={upload.key}
            className="rounded border border-zinc-800 px-4 py-3 flex items-center justify-between"
          >
            <div>
              <span className="text-sm text-zinc-300">{upload.filename}</span>
              <span className="ml-2 text-xs text-zinc-600">
                {upload.content_type}
              </span>
              <span className="ml-2 text-xs text-zinc-700">
                {new Date(upload.created_at).toLocaleString()}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => viewFile.mutate(upload.key)}
                disabled={viewFile.isPending}
                className="text-xs px-3 py-1 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              >
                View
              </button>
              <button
                onClick={() => deleteUpload.mutate(upload.key)}
                disabled={deleteUpload.isPending}
                className="text-xs px-3 py-1 rounded bg-red-900/50 text-red-400 hover:bg-red-900"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
