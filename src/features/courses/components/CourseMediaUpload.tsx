"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { UploadCloud, X } from "lucide-react";

interface CourseMediaUploadProps {
  thumbnail: File | null;
  introVideo: File | null;
  onThumbnailChange: (file: File | null) => void;
  onIntroVideoChange: (file: File | null) => void;
}

interface UploadBoxProps {
  label: string;
  hint: string;
  accept: string;
  file: File | null;
  type: "image" | "video";
  onChange: (file: File | null) => void;
}

const MAX_FILE_MB = 50;

function UploadBox({ label, hint, accept, file, type, onChange }: UploadBoxProps) {
  const inputId = useId();
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState("");

  // Object URL for the preview; revoked when the file changes or the box unmounts.
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function acceptFile(next: File | null | undefined) {
    if (!next) return;

    const allowed = accept.split(",").map((t) => t.trim());

    if (!allowed.includes(next.type)) {
      setFileError(`Unsupported file. Use ${type === "image" ? "a PNG or JPG image" : "an MP4, WebM or MOV video"}.`);
      return;
    }

    if (next.size > MAX_FILE_MB * 1024 * 1024) {
      setFileError(`That file is larger than ${MAX_FILE_MB} MB.`);
      return;
    }

    setFileError("");
    onChange(next);
  }

  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
      </label>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          acceptFile(e.dataTransfer.files?.[0]);
        }}
        className={`relative rounded-xl border-2 border-dashed transition-colors overflow-hidden ${
          dragging
            ? "border-violet-500 bg-violet-50"
            : file
              ? "border-violet-200 bg-white"
              : "border-gray-300 bg-gray-50 hover:border-violet-300 hover:bg-violet-50/50"
        }`}
      >
        <input
          id={inputId}
          type="file"
          accept={accept}
          className="sr-only"
          onChange={(e) => {
            acceptFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        {file && previewUrl ? (
          <div className="p-3">
            {type === "image" ? (
              <img
                src={previewUrl}
                alt="Course thumbnail preview"
                className="w-full max-h-56 rounded-lg object-contain bg-gray-50"
              />
            ) : (
              <video src={previewUrl} controls className="w-full max-h-56 rounded-lg bg-black" />
            )}

            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                <p className="text-xs text-gray-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <label
                  htmlFor={inputId}
                  className="cursor-pointer text-xs font-semibold text-violet-700 hover:bg-violet-50 rounded-md px-2.5 py-1.5"
                >
                  Replace
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setFileError("");
                    onChange(null);
                  }}
                  aria-label={`Remove ${label.toLowerCase()}`}
                  className="text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md p-1.5"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <label
            htmlFor={inputId}
            className="flex min-h-44 cursor-pointer flex-col items-center justify-center gap-1 px-4 py-8 text-center"
          >
            <span className="flex size-11 items-center justify-center rounded-full bg-violet-100 text-violet-600">
              <UploadCloud size={22} aria-hidden="true" />
            </span>
            <span className="mt-2 text-sm font-medium text-gray-700">
              Drag a file here or <span className="text-violet-700 underline">browse</span>
            </span>
            <span className="text-xs text-gray-500">{hint}</span>
          </label>
        )}
      </div>

      {fileError && <p className="mt-1.5 text-xs text-red-600">{fileError}</p>}
    </div>
  );
}

export default function CourseMediaUpload({
  thumbnail,
  introVideo,
  onThumbnailChange,
  onIntroVideoChange,
}: CourseMediaUploadProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <UploadBox
        label="Course thumbnail"
        hint={`PNG or JPG, up to ${MAX_FILE_MB} MB`}
        accept="image/png,image/jpeg"
        type="image"
        file={thumbnail}
        onChange={onThumbnailChange}
      />

      <UploadBox
        label="Course intro video"
        hint={`MP4, WebM or MOV, up to ${MAX_FILE_MB} MB`}
        accept="video/mp4,video/webm,video/quicktime"
        type="video"
        file={introVideo}
        onChange={onIntroVideoChange}
      />
    </div>
  );
}
