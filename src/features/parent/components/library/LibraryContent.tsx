"use client";

import { useMemo, useState } from "react";
import { BookOpen, GraduationCap } from "lucide-react";

import { PdEmpty, pillFilter } from "@/features/parent/components/courses/pdUi";
import HomeLearnerSwitcher from "@/features/parent/components/home/HomeLearnerSwitcher";
import { inKid, type LearnerFilter } from "@/features/parent/components/home/homeLogic";
import LibraryCertificateCard from "@/features/parent/components/library/LibraryCertificateCard";
import LibraryResourceRow, {
  resourceCourse,
} from "@/features/parent/components/library/LibraryResourceRow";
import LibrarySection from "@/features/parent/components/library/LibrarySection";
import { firstWord, toHomeKids } from "@/features/parent/components/my-classes/pdClassesUi";
import { useParentCertificates } from "@/features/parent/hooks/useParentCertificates";
import { useParentResources } from "@/features/parent/hooks/useResources";
import { useStudents } from "@/features/parent/hooks/useStudents";
import ErrorBanner from "@/features/shared/components/ErrorBanner";

const card = "rounded-2xl border border-pd-line bg-white";

function Skeleton({ rows }: { rows: number }) {
  return (
    <div aria-busy="true" aria-label="Loading" className={`${card} overflow-hidden`}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-[76px] animate-pulse border-t border-pd-line bg-[#eeeaf7] first:border-t-0" />
      ))}
    </div>
  );
}

/**
 * Parent "Library" (design: Library). Resources come from
 * `/api/parent/resources`, certificates from `/api/parent/certificates`,
 * learners from `/api/parent/students`. Heading comes from the hub tab.
 */
export default function LibraryContent() {
  const { students } = useStudents();
  const res = useParentResources();
  const certs = useParentCertificates();

  const [filter, setFilter] = useState<LearnerFilter>("all");
  const [course, setCourse] = useState("All");

  const kids = useMemo(() => toHomeKids(students), [students]);
  const kidName = (id: string) => {
    const k = kids.find((x) => x.id === id);
    return k ? firstWord(k.first) : undefined;
  };

  const mineRes = res.resources.filter((r) => inKid(filter, r.studentId));
  const courses = [...new Set(mineRes.map(resourceCourse))];
  const activeCourse = courses.includes(course) ? course : "All";
  const shownRes = mineRes.filter((r) => activeCourse === "All" || resourceCourse(r) === activeCourse);
  const mineCerts = certs.certificates.filter((c) => inKid(filter, c.studentId));

  return (
    <>
      {kids.length > 0 && <HomeLearnerSwitcher kids={kids} active={filter} onSelect={setFilter} />}

      {(res.error || certs.error) && (
        <ErrorBanner size="compact" className="mt-4">
          {res.error || certs.error}
        </ErrorBanner>
      )}

      <LibrarySection id="lib-resources" title="Resources" count={mineRes.length}>
        {courses.length > 1 && (
          <div role="group" aria-label="Filter by class" className="mb-3 flex flex-wrap gap-2">
            {["All", ...courses].map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={activeCourse === c}
                onClick={() => setCourse(c)}
                className={pillFilter(activeCourse === c)}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {res.loading ? (
          <Skeleton rows={3} />
        ) : shownRes.length ? (
          <div className={`${card} overflow-hidden`}>
            {shownRes.map((r) => (
              <LibraryResourceRow key={r.id} resource={r} learner={kidName(r.studentId)} />
            ))}
          </div>
        ) : (
          <div className={`${card} p-5`}>
            <PdEmpty
              icon={BookOpen}
              title="No resources yet"
              text="Files and links your teachers share appear here, and stay here for good."
            />
          </div>
        )}
      </LibrarySection>

      <LibrarySection id="lib-certs" title="Certificates" count={mineCerts.length}>
        {certs.loading ? (
          <Skeleton rows={1} />
        ) : mineCerts.length ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {mineCerts.map((c) => (
              <LibraryCertificateCard key={c.id} certificate={c} />
            ))}
          </div>
        ) : (
          <div className={`${card} p-5`}>
            <PdEmpty
              icon={GraduationCap}
              title="No certificates yet"
              text="They appear here once a teacher issues one."
            />
          </div>
        )}
      </LibrarySection>
    </>
  );
}
