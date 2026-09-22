"use client";

import Link from "next/link";
import { BookOpen } from "lucide-react";

export interface CourseTile {
  id: string;
  href: string;
  title: string;
  subject?: string | null;
  price?: string | null;
  thumbnailUrl?: string | null;
  badge?: { label: string; className: string } | null;
}

interface Props {
  courses: CourseTile[];
  loading?: boolean;
  emptyMessage: string;
  emptyAction?: { label: string; href: string } | null;
}

// A handful of pastel gradients, picked deterministically from the
// subject/title string so the same course always lands on the same
// color without a hand-maintained subject -> color map.
const TILE_GRADIENTS = [
  "from-violet-300 to-violet-100",
  "from-rose-300 to-rose-100",
  "from-amber-300 to-amber-100",
  "from-emerald-300 to-emerald-100",
  "from-sky-300 to-sky-100",
];

function gradientFor(label: string) {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TILE_GRADIENTS[Math.abs(hash) % TILE_GRADIENTS.length];
}

/**
 * Poster-style course strip for dashboards: a thumbnail-forward tile
 * (title/price live as a caption over the image, not a stacked block
 * of text underneath it). This is deliberately lighter than the full
 * CourseCard used on the dedicated Courses / Course Management pages
 * — the dashboard is a visual glance that hands off to those pages,
 * not a second copy of the same detail card.
 */
export default function CourseThumbStrip({
  courses,
  loading = false,
  emptyMessage,
  emptyAction = null,
}: Props) {
  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-hidden">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-36 sm:w-40 aspect-[3/4] rounded-2xl bg-violet-50 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="bg-white border-2 border-dashed border-violet-200 rounded-3xl p-8 text-center">
        <p className="text-gray-500 mb-4">{emptyMessage}</p>
        {emptyAction && (
          <Link
            href={emptyAction.href}
            className="inline-flex items-center gap-2 bg-brand text-white text-sm font-bold px-4 py-2.5 rounded-full shadow-playful hover:bg-brand-dark transition"
          >
            {emptyAction.label}
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory">
      {courses.map((course) => (
        <Link
          key={course.id}
          href={course.href}
          className="group relative flex-shrink-0 w-36 sm:w-40 aspect-[3/4] rounded-2xl overflow-hidden snap-start shadow-sm hover:shadow-playful transition"
        >
          {course.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={course.thumbnailUrl}
              alt={course.title}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div
              className={`absolute inset-0 bg-gradient-to-br ${gradientFor(
                course.subject || course.title,
              )} flex items-center justify-center`}
            >
              <BookOpen size={26} className="text-white/70" strokeWidth={1.5} />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent" />

          {course.badge && (
            <span
              className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${course.badge.className}`}
            >
              {course.badge.label}
            </span>
          )}

          <div className="absolute inset-x-0 bottom-0 p-3">
            <p className="text-white text-xs font-bold leading-snug line-clamp-2">
              {course.title}
            </p>
            {course.price && (
              <p className="text-white/80 text-[11px] font-semibold mt-1">
                {course.price}
              </p>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
