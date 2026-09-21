"use client";

import { useEffect, useState } from "react";

interface DocumentUploadProps {
  id: string;
  label: string;
  file: File | null;
  error?: string;

  acceptedTypes: string[];
  maxFileSizeMB: number;

  onChange: (file: File | null) => void;
}

export default function DocumentUpload({
  id,
  label,
  file,
  error,
  acceptedTypes,
  maxFileSizeMB,
  onChange,
}: DocumentUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  /*
   * Create a temporary browser URL whenever
   * a file is selected.
   */
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);

    setPreviewUrl(url);

    /*
     * Clean up the temporary URL when the file
     * changes or component unmounts.
     */
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const selectedFile =
      e.target.files?.[0] ?? null;

    onChange(selectedFile);

    /*
     * Allows selecting the same file again.
     */
    e.target.value = "";
  }

  function removeFile() {
    onChange(null);
  }

  const isImage =
    file?.type === "image/png" ||
    file?.type === "image/jpeg";

  const isPdf =
    file?.type === "application/pdf";

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>

      {!file ? (
        <label
          htmlFor={id}
          className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center bg-white text-gray-400 cursor-pointer hover:bg-violet-50/50 hover:border-violet-200 transition-colors"
        >
          <input
            id={id}
            type="file"
            accept={acceptedTypes.join(",")}
            className="hidden"
            onChange={handleChange}
          />

          <p className="text-sm">
            Click to upload document
          </p>

          <p className="text-xs mt-2">
            PNG, JPG, PDF | Max {maxFileSizeMB}MB
          </p>
        </label>
      ) : (
        <div className="border rounded-xl bg-white overflow-hidden">
          {/* -------------------------------- */}
          {/* IMAGE PREVIEW */}
          {/* -------------------------------- */}

          {isImage && previewUrl && (
            <div className="bg-gray-100 p-4">
              <img
                src={previewUrl}
                alt={file.name}
                className="max-h-72 w-full object-contain rounded-lg"
              />
            </div>
          )}

          {/* -------------------------------- */}
          {/* PDF PREVIEW */}
          {/* -------------------------------- */}

          {isPdf && previewUrl && (
            <div className="bg-gray-100 p-3">
              <iframe
                src={previewUrl}
                title={file.name}
                className="w-full h-72 rounded-lg border bg-white"
              />
            </div>
          )}

          {/* -------------------------------- */}
          {/* FILE INFORMATION */}
          {/* -------------------------------- */}

          <div className="p-4">
            <p className="text-sm font-medium text-violet-600 break-all">
              {file.name}
            </p>

            <p className="text-xs text-gray-500 mt-1">
              {(file.size / (1024 * 1024)).toFixed(2)} MB
            </p>

            <button
              type="button"
              onClick={removeFile}
              className="mt-3 text-sm text-red-600 hover:text-red-700"
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 mt-1">
          {error}
        </p>
      )}
    </div>
  );
}