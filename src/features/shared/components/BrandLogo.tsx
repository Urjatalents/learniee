import Image from "next/image";

/**
 * The one place the Learniee logo is rendered. Files live in
 * public/learniee-brand-kit/ (served from /learniee-brand-kit/...).
 * Size it with className (e.g. "h-9 w-auto"); the SVG scales cleanly.
 *
 * - default:   purple wordmark, for light backgrounds
 * - white:     for dark / purple backgrounds
 * - black:     for one-colour print-style uses
 */
const SRC = {
  default: "/learniee-brand-kit/learniee-logo.svg",
  white: "/learniee-brand-kit/learniee-logo-white.svg",
  black: "/learniee-brand-kit/learniee-logo-black.svg",
} as const;

interface BrandLogoProps {
  variant?: keyof typeof SRC;
  className?: string;
  priority?: boolean;
}

export default function BrandLogo({
  variant = "default",
  className = "h-9 w-auto",
  priority = false,
}: BrandLogoProps) {
  return (
    // SVG: skip the image optimizer (it refuses SVG by default and gains nothing).
    <Image
      src={SRC[variant]}
      alt="Learniee"
      width={285}
      height={101}
      unoptimized
      priority={priority}
      className={className}
    />
  );
}
