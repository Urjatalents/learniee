/**
 * Chat phone-number detection & masking (06-OPEN-DECISIONS.md #31).
 *
 * Parents and Teachers aren't allowed to move a conversation off the
 * chat by dropping a phone number into a message — Admin oversight of
 * Parent<->Teacher chat is the whole point of the Chat module (see
 * chat.service.ts). This is a deliberately loose heuristic, not a
 * strict E.164 parser, so it catches most real-world formats from any
 * country ("+91 98765 43210", "(020) 7946 0958", "98765-43210",
 * "919876543210") without needing a per-country rule table.
 *
 * Known tradeoff: a long non-phone number (an order id, a pincode +
 * extra digits typed together) can false-positive and get masked.
 * That's accepted — the message still sends, just masked, and Admin's
 * moderation view always shows the original text so a wrong flag is
 * obvious at a glance. Pure functions, no server-only import, so this
 * is safe to unit-test later (`07` — largest risk is no tests yet).
 */

// A candidate span: starts with a digit or "+", then a run of digits
// and common separators (space, dash, dot, parentheses), ending on a
// digit. Loose on formatting on purpose — see the module doc-comment.
const CANDIDATE_RE = /(\+?\d[\d\-.\s()]{5,}\d)/g;

// Most real phone numbers — national or international — have between
// 7 and 15 digits once separators are stripped (15 is E.164's max).
// Below 7 is more likely a short code, a price, or a date; above 15
// is more likely a reference/order number.
const MIN_DIGITS = 7;
const MAX_DIGITS = 15;

export interface PhoneMatch {
  match: string;
  start: number;
  end: number;
}

/** Finds every phone-number-shaped span in `text`. Empty array if none. */
export function findPhoneNumbers(text: string): PhoneMatch[] {
  const matches: PhoneMatch[] = [];
  let m: RegExpExecArray | null;

  CANDIDATE_RE.lastIndex = 0;
  while ((m = CANDIDATE_RE.exec(text)) !== null) {
    const digitCount = m[0].replace(/\D/g, "").length;

    if (digitCount >= MIN_DIGITS && digitCount <= MAX_DIGITS) {
      matches.push({ match: m[0], start: m.index, end: m.index + m[0].length });
    }
  }

  return matches;
}

export const PHONE_MASK_PLACEHOLDER = "[phone number removed]";

export interface MaskPhoneNumbersResult {
  masked: string;
  found: boolean;
}

/**
 * Replaces every phone-number-shaped span in `text` with a fixed
 * placeholder, so the reader never sees the actual digits. Returns
 * whether anything was found, so callers don't need to re-run
 * detection to know whether to flag the message.
 */
export function maskPhoneNumbers(text: string): MaskPhoneNumbersResult {
  const matches = findPhoneNumbers(text);

  if (matches.length === 0) {
    return { masked: text, found: false };
  }

  let result = "";
  let cursor = 0;

  for (const { start, end } of matches) {
    result += text.slice(cursor, start) + PHONE_MASK_PLACEHOLDER;
    cursor = end;
  }
  result += text.slice(cursor);

  return { masked: result, found: true };
}
