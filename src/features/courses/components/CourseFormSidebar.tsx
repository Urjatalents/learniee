"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

import { COURSE_SECTIONS } from "@/features/courses/components/courseSections";
import { getStandardPrice, getStandardSessionPrice } from "@/features/courses/utils/coursePricing";
import { sessionLengthForCourse } from "@/features/shared/utils/sessionLength";
import type { CourseFormData } from "@/features/courses/types/course";

interface Props {
  formData: CourseFormData;
  hasThumbnail: boolean;
  hasIntroVideo: boolean;
}

/** Which sections are filled in. Purely a visual aid — the API and submit handler do the real validation. */
function getCompletion(formData: CourseFormData, hasThumbnail: boolean, hasIntroVideo: boolean) {
  const f = formData;
  const frequencyOk = Boolean(f.frequency) && (f.frequency !== "Custom" || f.frequencyCustom.trim() !== "");
  const subjectOk = Boolean(f.subject) && (f.subject !== "Other" || f.subjectOther.trim() !== "");

  return {
    basics: f.courseTitle.trim() !== "",
    audience: subjectOk && Boolean(f.grade) && Boolean(f.board),
    format: Boolean(f.duration) && Boolean(f.type) && frequencyOk,
    pricing: Number(f.price) > 0,
    certificate: !f.certificateEnabled || Number(f.certificateSessionThreshold) >= 1,
    media: hasThumbnail && hasIntroVideo,
  } as Record<string, boolean>;
}

/** Id of the section currently in view, for highlighting the nav. */
function useActiveSection() {
  const [active, setActive] = useState(COURSE_SECTIONS[0].id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);

        if (visible.length > 0) {
          // The topmost section inside the observed band wins.
          visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
          setActive(visible[0].target.id);
        }
      },
      { rootMargin: "-20% 0px -65% 0px" },
    );

    COURSE_SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return active;
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/** Mobile / tablet: horizontally scrollable pills pinned under the navbar. */
export function CourseSectionPills({ formData, hasThumbnail, hasIntroVideo }: Props) {
  const active = useActiveSection();
  const done = getCompletion(formData, hasThumbnail, hasIntroVideo);

  return (
    <nav
      aria-label="Course sections"
      className="lg:hidden sticky top-16 z-20 -mx-4 sm:-mx-8 mb-6 border-b border-violet-100 bg-white/90 px-4 sm:px-8 py-2.5 backdrop-blur"
    >
      <ul className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {COURSE_SECTIONS.map((s) => (
          <li key={s.id} className="shrink-0">
            <button
              type="button"
              onClick={() => scrollToSection(s.id)}
              aria-current={active === s.id ? "step" : undefined}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                active === s.id
                  ? "border-violet-600 bg-violet-600 text-white"
                  : "border-gray-200 bg-white text-gray-600"
              }`}
            >
              {done[s.id] && <Check size={12} aria-hidden="true" />}
              {s.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Desktop: sticky section list with progress, plus a live price summary. */
export default function CourseFormSidebar({ formData, hasThumbnail, hasIntroVideo }: Props) {
  const active = useActiveSection();
  const done = getCompletion(formData, hasThumbnail, hasIntroVideo);
  const doneCount = COURSE_SECTIONS.filter((s) => done[s.id]).length;

  const minutes = sessionLengthForCourse(formData.duration);
  const hourly = getStandardPrice(formData.grade || null, formData.isIITian);
  const standard = getStandardSessionPrice(formData.grade || null, formData.isIITian, minutes);
  const price = Number(formData.price) > 0 ? Number(formData.price) : null;

  return (
    <aside className="hidden lg:block sticky top-24 space-y-4">
      <nav aria-label="Course sections" className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-600">
            <span>Progress</span>
            <span>
              {doneCount} of {COURSE_SECTIONS.length} sections
            </span>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-gray-100">
            <div
              className="h-1.5 rounded-full bg-violet-600 transition-all"
              style={{ width: `${(doneCount / COURSE_SECTIONS.length) * 100}%` }}
            />
          </div>
        </div>

        <ol className="space-y-0.5">
          {COURSE_SECTIONS.map((s, index) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => scrollToSection(s.id)}
                aria-current={active === s.id ? "step" : undefined}
                className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                  active === s.id ? "bg-violet-50 text-violet-700 font-semibold" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    done[s.id] ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {done[s.id] ? <Check size={12} aria-hidden="true" /> : index + 1}
                </span>
                <span className="truncate">{s.label}</span>
                {s.optional && <span className="ml-auto text-[10px] uppercase text-gray-400">Optional</span>}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-600 to-violet-800 p-4 text-white shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-200">Price per session</p>
        <p className="mt-1 text-3xl font-bold">{price != null ? `₹${price}` : "—"}</p>
        <p className="mt-2 text-xs text-violet-100">
          {minutes}-minute lecture
          {hourly != null && standard != null
            ? ` · standard ₹${standard} (₹${hourly}/hour)`
            : " · pick a grade to see the standard rate"}
        </p>
      </div>
    </aside>
  );
}
