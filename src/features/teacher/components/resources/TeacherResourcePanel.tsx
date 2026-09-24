"use client";

import { useState } from "react";
import { FileText, Link as LinkIcon, Trash2, Paperclip } from "lucide-react";

import { uploadFileToS3 } from "@/lib/uploadFileToS3";
import { useTeacherResources, type Resource } from "@/features/teacher/hooks/useResources";
import ErrorBanner from "@/features/shared/components/ErrorBanner";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ResourceCard({
  resource,
  onDelete,
}: {
  resource: Resource;
  onDelete: () => void;
}) {
  const href = resource.type === "LINK" ? resource.externalUrl : resource.fileUrl;

  return (
    <div className="bg-white border border-purple-100 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex items-start gap-2">
          <span className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
            {resource.type === "LINK" ? <LinkIcon size={14} /> : <FileText size={14} />}
          </span>
          <div className="min-w-0">
            <p className="font-bold text-gray-800">{resource.title}</p>
            {resource.description && (
              <p className="text-sm text-gray-500 mt-1 whitespace-pre-wrap">
                {resource.description}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-1">Shared {formatDate(resource.createdAt)}</p>
            {href && (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-purple-600 hover:underline mt-2"
              >
                <Paperclip size={12} /> {resource.type === "LINK" ? "Open link" : "View file"}
              </a>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onDelete}
          className="text-gray-300 hover:text-red-500 flex-shrink-0"
          aria-label="Delete resource"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

function ShareResourceForm({
  onShare,
}: {
  onShare: (input: {
    title: string;
    description?: string;
    type: "FILE" | "LINK";
    fileKey?: string;
    fileName?: string;
    externalUrl?: string;
  }) => Promise<boolean>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"FILE" | "LINK">("FILE");
  const [file, setFile] = useState<File | null>(null);
  const [externalUrl, setExternalUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const canSubmit = title.trim() && (type === "FILE" ? file : externalUrl.trim());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setSaving(true);
    try {
      let fileKey: string | undefined;
      let fileName: string | undefined;

      if (type === "FILE" && file) {
        fileKey = await uploadFileToS3({ file, folder: "resources" });
        fileName = file.name;
      }

      const ok = await onShare({
        title,
        description: description || undefined,
        type,
        fileKey,
        fileName,
        externalUrl: type === "LINK" ? externalUrl.trim() : undefined,
      });

      if (ok) {
        setTitle("");
        setDescription("");
        setFile(null);
        setExternalUrl("");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-purple-100 rounded-xl p-4 space-y-3"
    >
      <p className="font-bold text-gray-800 text-sm">Share a resource</p>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
        required
      />

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        rows={2}
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
      />

      <div className="flex gap-1 p-1 bg-gray-50 rounded-lg w-fit">
        {(["FILE", "LINK"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`text-xs font-bold px-3 py-1.5 rounded-md transition-colors ${
              type === t ? "bg-white text-purple-700 shadow-sm" : "text-gray-500"
            }`}
          >
            {t === "FILE" ? "Upload a file" : "Share a link"}
          </button>
        ))}
      </div>

      {type === "FILE" ? (
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-xs"
        />
      ) : (
        <input
          type="url"
          value={externalUrl}
          onChange={(e) => setExternalUrl(e.target.value)}
          placeholder="https://…"
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
        />
      )}

      <button
        type="submit"
        disabled={saving || !canSubmit}
        className="text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-4 py-2 rounded-lg"
      >
        {saving ? "Sharing…" : "Share resource"}
      </button>
    </form>
  );
}

export default function TeacherResourcePanel({ enrollmentId }: { enrollmentId: string }) {
  const { resources, loading, error, share, remove } = useTeacherResources(enrollmentId);

  return (
    <div className="space-y-4">
      {error && (
        <ErrorBanner size="compact" spacing={false}>
          {error}
        </ErrorBanner>
      )}

      <ShareResourceForm onShare={share} />

      {loading ? (
        <p className="text-gray-500 text-sm">Loading resources…</p>
      ) : resources.length === 0 ? (
        <p className="text-gray-400 text-sm">Nothing shared yet.</p>
      ) : (
        <div className="space-y-3">
          {resources.map((r) => (
            <ResourceCard key={r.id} resource={r} onDelete={() => remove(r.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
