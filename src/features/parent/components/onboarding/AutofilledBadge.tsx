/**
 * Small pill shown under a field when its value was pre-filled from the
 * parent's signup account rather than typed by them — makes it obvious the
 * value came from somewhere and is still freely editable. Rendered below
 * the field (see FormField's `badge` prop), not next to the label.
 */
export default function AutofilledBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-600">
      Auto-filled · edit anytime
    </span>
  );
}
