import { BOARD_OPTIONS, GRADE_OPTIONS } from "@/features/courses/constants/courseOptions";

export interface RequestPrefill {
  title: string;
  subject?: string;
  grade?: string;
  board?: string;
}

const REQUEST_CLASS_PATH = "/parent/request-class";

/** Parent-side form URL with the search prefilled (`/parent/request-class?title=…`). */
export function requestClassHref(prefill: RequestPrefill): string {
  const params = new URLSearchParams();
  if (prefill.title) params.set("title", prefill.title.slice(0, 120));
  if (prefill.subject) params.set("subject", prefill.subject.slice(0, 80));
  if (prefill.grade && (GRADE_OPTIONS as readonly string[]).includes(prefill.grade)) {
    params.set("grade", prefill.grade);
  }
  if (prefill.board && (BOARD_OPTIONS as readonly string[]).includes(prefill.board)) {
    params.set("board", prefill.board);
  }
  const qs = params.toString();
  return qs ? `${REQUEST_CLASS_PATH}?${qs}` : REQUEST_CLASS_PATH;
}

/** Where an anonymous visitor goes first; login sends them on to `target` afterwards. */
export function loginThenHref(target: string): string {
  return `/login?next=${encodeURIComponent(target)}`;
}
