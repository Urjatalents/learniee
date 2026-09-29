import { blogTheme } from "./blogTheme";

/** Decorative gradient cover (posts have no cover image). Purely visual, hidden from screen readers. */
export default function BlogCover({ category, className = "" }: { category: string; className?: string }) {
  const { gradient, icon: Icon } = blogTheme(category);

  return (
    <div
      aria-hidden="true"
      className={`relative overflow-hidden bg-gradient-to-br ${gradient} ${className}`}
    >
      <span className="absolute -right-6 -top-6 size-28 rounded-full bg-white/15" />
      <span className="absolute -bottom-8 left-6 size-24 rounded-full bg-white/10" />
      <span className="absolute right-10 bottom-4 size-8 rounded-full bg-brand-yellow/90" />
      <Icon className="absolute left-1/2 top-1/2 size-12 -translate-x-1/2 -translate-y-1/2 text-white/90" strokeWidth={1.5} />
    </div>
  );
}
