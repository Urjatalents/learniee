import CourseLink from "./CourseLink";
import type { CatalogCourseCard } from "./catalog.service";

const PALETTE = ["#DCD1FF", "#FFD25E", "#B7A3F5", "#ECE6FF"];

function paletteFor(text: string): string {
  let hash = 0;
  for (const ch of text) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

function formatLabel(type: string | null): string | null {
  if (!type) return null;
  return type.toLowerCase().startsWith("ind") ? "1-to-1" : type;
}

export default function CatalogCourseCardView({ course }: { course: CatalogCourseCard }) {
  const format = formatLabel(course.type);
  const meta = [format, course.grade, course.duration, course.board, course.language].filter(Boolean);

  return (
    <article className="ccard">
      <CourseLink courseId={course.id} className="ccard-link">
        <div className="cthumb" style={{ background: paletteFor(course.title) }}>
          {course.thumbnailUrl ? (
            // Short-lived presigned S3 URL, so next/image's remote-pattern allow-list does not apply.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={course.thumbnailUrl} alt="" loading="lazy" />
          ) : (
            <span aria-hidden="true">{course.title.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="cbody">
          <p className="cteacher">
            {course.teacherName}
            {course.rating != null && course.reviewCount > 0 && (
              <span className="crating" aria-label={`Rated ${course.rating.toFixed(1)} out of 5`}>
                ★ {course.rating.toFixed(1)} ({course.reviewCount})
              </span>
            )}
          </p>
          <h3>{course.title}</h3>
          {meta.length > 0 && <p className="cmeta">{meta.join(" · ")}</p>}
          <div className="crow">
            {course.price != null ? (
              <span className="rate">₹{course.price.toLocaleString("en-IN")} per class</span>
            ) : (
              <span />
            )}
            <span className="cgo">View class</span>
          </div>
        </div>
      </CourseLink>
    </article>
  );
}
