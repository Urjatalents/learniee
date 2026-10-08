export const INPUT =
  "w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-300 disabled:bg-gray-50";

export type Format = "h2" | "h3" | "bold" | "italic" | "ul" | "ol" | "quote" | "link" | "image";

export const TOOLBAR: { kind: Format; label: string; title: string }[] = [
  { kind: "h2", label: "H2", title: "Section heading" },
  { kind: "h3", label: "H3", title: "Sub-heading" },
  { kind: "bold", label: "B", title: "Bold" },
  { kind: "italic", label: "I", title: "Italic" },
  { kind: "ul", label: "• List", title: "Bullet list" },
  { kind: "ol", label: "1. List", title: "Numbered list" },
  { kind: "quote", label: "Quote", title: "Quote" },
  { kind: "link", label: "Link", title: "Insert link" },
  { kind: "image", label: "Image", title: "Upload and insert an image (PNG or JPEG, up to 5 MB)" },
];
