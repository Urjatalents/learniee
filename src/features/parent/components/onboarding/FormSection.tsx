import type { LucideIcon } from "lucide-react";

interface FormSectionProps {
  title: string;
  description?: string;
  /** Small icon shown in a colored badge next to the title, purely to help the eye group and scan sections at a glance. */
  icon?: LucideIcon;
  children: React.ReactNode;
}

/**
 * Groups related fields inside a visually distinct card (icon + heading +
 * a responsive 2-column grid that collapses to 1 column on mobile). Cards
 * give long onboarding forms clear, scannable chunks instead of one flat,
 * continuous list of inputs.
 */
export default function FormSection({
  title,
  description,
  icon: Icon,
  children,
}: FormSectionProps) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-gray-50/70 p-5 sm:p-6">
      <div className="flex items-start gap-3 mb-5">
        {Icon && (
          <div className="flex items-center justify-center size-8 shrink-0 rounded-lg bg-violet-100 text-violet-600">
            <Icon className="size-4" />
          </div>
        )}
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          {description && (
            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
        {children}
      </div>
    </section>
  );
}
