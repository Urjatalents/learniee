import { getSectionMeta } from "@/features/courses/components/courseSections";

interface Props {
  id: string;
  children: React.ReactNode;
}

/** Card wrapper for one part of the create-course form. `id` is also the nav anchor. */
export default function CourseSection({ id, children }: Props) {
  const { label, description, icon: Icon, optional } = getSectionMeta(id);

  return (
    <section
      id={id}
      className="scroll-mt-36 lg:scroll-mt-24 bg-white border border-violet-100 rounded-2xl shadow-sm"
    >
      <header className="flex items-start gap-3 px-5 sm:px-6 pt-5 sm:pt-6">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
          <Icon size={20} aria-hidden="true" />
        </span>

        <div className="min-w-0">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            {label}
            {optional && (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
                Optional
              </span>
            )}
          </h2>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </header>

      <div className="p-5 sm:p-6 space-y-5">{children}</div>
    </section>
  );
}
