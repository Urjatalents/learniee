"use client";

import { useEffect, useState } from "react";

/**
 * Generic multi-file upload field with local preview (image/PDF) and a
 * list of already-uploaded files. Originally duplicated near-verbatim
 * between CertificationUpload.tsx and AwardUpload.tsx (Teacher Step 2) —
 * consolidated here since the only real difference between them was the
 * label/id and copy text. Parameterize instead of copy-pasting for any
 * future upload field of this shape.
 */

export interface UploadedFileMeta {
  id: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
}

interface PreviewFile {
  file: File;
  url: string;
}

export const DEFAULT_ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "application/pdf",
];

export const DEFAULT_MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

export interface MultiFileUploadFieldProps {
  /** Used for the <input id> / <label htmlFor> pair — must be unique on the page. */
  id: string;
  /** Field label shown above the upload box. */
  label: string;
  /** Copy inside the dashed upload box, e.g. "Click to upload certifications". */
  uploadHint?: string;
  files: File[];
  existingFiles: UploadedFileMeta[];
  onChange: (files: File[]) => void;
  error?: string;
  allowedTypes?: string[];
  maxFileSizeBytes?: number;
}

export default function MultiFileUploadField({
  id,
  label,
  uploadHint,
  files,
  existingFiles,
  onChange,
  error,
  allowedTypes = DEFAULT_ALLOWED_TYPES,
  maxFileSizeBytes = DEFAULT_MAX_FILE_SIZE_BYTES,
}: MultiFileUploadFieldProps) {
  const [previews, setPreviews] = useState<PreviewFile[]>([]);

  // Create browser preview URLs whenever selected files change; clean up on change/unmount.
  useEffect(() => {
    const previewFiles = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));

    setPreviews(previewFiles);

    return () => {
      previewFiles.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [files]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(e.target.files ?? []);

    const validFiles = selectedFiles.filter((file) => {
      const validType = allowedTypes.includes(file.type);
      const validSize = file.size <= maxFileSizeBytes;
      return validType && validSize;
    });

    onChange([...files, ...validFiles]);

    // Allows selecting the same file again.
    e.target.value = "";
  }

  function removeFile(index: number) {
    onChange(files.filter((_, fileIndex) => fileIndex !== index));
  }

  const maxSizeLabel = `${Math.round(maxFileSizeBytes / (1024 * 1024))}MB`;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>

      {/* Upload box */}
      <label
        htmlFor={id}
        className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-sm text-gray-500 bg-white cursor-pointer block hover:bg-violet-50/50 hover:border-violet-200 transition-colors"
      >
        <input
          id={id}
          type="file"
          multiple
          accept={allowedTypes.join(",")}
          className="hidden"
          onChange={handleFileChange}
        />

        <p className="text-center">
          {uploadHint ?? `Click to upload ${label.toLowerCase()}`}
        </p>

        <p className="text-xs text-center mt-2">
          PDF, PNG, JPG | Max {maxSizeLabel} per file
        </p>
      </label>

      {/* Newly selected files (local preview) */}
      {previews.length > 0 && (
        <div className="mt-4 space-y-4">
          {previews.map(({ file, url }, index) => (
            <div
              key={`${file.name}-${index}`}
              className="border rounded-md p-3 bg-white"
            >
              {(file.type === "image/png" || file.type === "image/jpeg") && (
                <div className="mb-3">
                  <img
                    src={url}
                    alt={file.name}
                    className="w-full max-h-64 object-contain rounded-md border bg-gray-50"
                  />
                </div>
              )}

              {file.type === "application/pdf" && (
                <div className="mb-3">
                  <iframe
                    src={url}
                    title={file.name}
                    className="w-full h-64 rounded-md border"
                  />
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-violet-600 font-medium break-all">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="text-sm text-red-600 hover:text-red-800 shrink-0"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Already-uploaded files */}
      {existingFiles.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-semibold text-gray-600 mb-2">
            Previously uploaded
          </p>

          <div className="space-y-2">
            {existingFiles.map((file) => (
              <div key={file.id} className="border rounded-md p-3 bg-green-50">
                <p className="text-sm text-green-700 font-medium break-all">
                  {file.originalFileName}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Previously uploaded
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
