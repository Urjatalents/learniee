"use client";

import Link from "next/link";

import { loginThenHref, requestClassHref, type RequestPrefill } from "./requestClassLink";
import { useViewerRole } from "./useViewerRole";

interface RequestClassCtaProps {
  prefill: RequestPrefill;
  label?: string;
  className?: string;
  /** Show the small "you'll be asked to log in" hint under the button. */
  showHint?: boolean;
}

/**
 * "Request a class" entry point for the public pages.
 *  - parent signed in  -> straight to the prefilled Request Class form
 *  - not signed in     -> login first, then on to the same form
 *  - other roles       -> a short note (class requests are a Parent feature)
 */
export default function RequestClassCta({
  prefill,
  label = "Request this class",
  className = "btn",
  showHint = false,
}: RequestClassCtaProps) {
  const role = useViewerRole();
  const target = requestClassHref(prefill);

  if (role === "other") {
    return (
      <p className="cat-note">
        Class requests are available to parent accounts. Log in with a parent account to request a class.
      </p>
    );
  }

  const href = role === "parent" ? target : loginThenHref(target);

  return (
    <span className="cat-cta">
      <Link className={className} href={href} prefetch={false}>
        {label}
      </Link>
      {showHint && role !== "parent" && (
        <small>You&apos;ll be asked to log in first. It takes a minute.</small>
      )}
    </span>
  );
}
