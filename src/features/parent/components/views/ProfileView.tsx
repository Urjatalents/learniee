"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Check, Lock, MapPin, MessageSquare, Plus, User } from "lucide-react";

import PdField from "@/features/parent/components/account/PdField";
import PdRing from "@/features/parent/components/account/PdRing";
import {
  PD_BTN_PRI,
  PD_BTN_SEC,
  PD_INPUT,
} from "@/features/parent/components/courses/pdUi";
import { usePdToast } from "@/features/parent/components/courses/usePdToast";
import { Tag } from "@/features/parent/components/home/HomeBits";
import {
  PD_CARD,
  PD_CARD_FLUSH,
  PdBanner,
  PdSkeleton,
  dLong,
} from "@/features/parent/components/payments/paymentsUi";
import {
  COMMUNICATION_MODE_OPTIONS,
  PREFERRED_LANGUAGE_OPTIONS,
} from "@/features/parent/constants/onboardingOptions";
import {
  useProfile,
  type ParentProfileData,
  type ParentProfileFormFields,
} from "@/features/parent/hooks/useProfile";
import { getInitial } from "@/lib/initials";

/**
 * "Profile" tab of Account — the contact card (name, phone, address, language and
 * contact preference). Onboarding-only fields stay in onboarding, and email is
 * read-only everywhere because it is the Cognito login identity.
 * Data: GET / PATCH /api/parent/profile (`useProfile`).
 */

type FieldKey = keyof ParentProfileFormFields;
type Errors = Partial<Record<FieldKey, string>>;

const toForm = (p: ParentProfileData): ParentProfileFormFields => ({
  firstName: p.firstName,
  lastName: p.lastName,
  visibleName: p.visibleName ?? "",
  phone: p.phone,
  whatsappNumber: p.whatsappNumber ?? "",
  address: p.address ?? "",
  city: p.city ?? "",
  country: p.country ?? "",
  pincode: p.pincode ?? "",
  preferredLanguage: p.preferredLanguage ?? "",
  modeOfCommunication: p.modeOfCommunication ?? "",
});

/** Completeness checklist from the design (drives the ring and the "Add …" shortcuts). */
const COMPLETENESS: [FieldKey, string][] = [
  ["firstName", "your name"],
  ["phone", "a phone number"],
  ["whatsappNumber", "a WhatsApp number"],
  ["preferredLanguage", "a preferred language"],
  ["modeOfCommunication", "how you like to be contacted"],
  ["address", "your address"],
  ["city", "your city"],
  ["pincode", "your pincode"],
];

interface Item {
  key: FieldKey | "email";
  label: string;
  wide?: boolean;
  type?: string;
  autoComplete?: string;
  inputMode?: "tel" | "numeric";
  hint?: string;
  options?: readonly string[];
  readOnly?: boolean;
}

interface Section {
  icon: typeof User;
  title: string;
  sub: string;
  items: Item[];
}

const SECTIONS: Section[] = [
  {
    icon: User,
    title: "Personal details",
    sub: "How your name appears on Learniee.",
    items: [
      { key: "firstName", label: "First name", autoComplete: "given-name" },
      { key: "lastName", label: "Last name", autoComplete: "family-name" },
      {
        key: "visibleName",
        label: "Display name",
        wide: true,
        hint: "Teachers see this name in chat and classes.",
      },
    ],
  },
  {
    icon: MessageSquare,
    title: "Contact & communication",
    sub: "Where we reach you about classes.",
    items: [
      { key: "email", label: "Email", wide: true, readOnly: true },
      { key: "phone", label: "Phone", type: "tel", autoComplete: "tel", inputMode: "tel" },
      { key: "whatsappNumber", label: "WhatsApp number", type: "tel", inputMode: "tel" },
      { key: "preferredLanguage", label: "Preferred language", options: PREFERRED_LANGUAGE_OPTIONS },
      { key: "modeOfCommunication", label: "Mode of communication", options: COMMUNICATION_MODE_OPTIONS },
    ],
  },
  {
    icon: MapPin,
    title: "Location",
    sub: "Used for invoices and local class timings.",
    items: [
      { key: "address", label: "Address", wide: true, autoComplete: "street-address" },
      { key: "city", label: "City", autoComplete: "address-level2" },
      { key: "country", label: "Country", autoComplete: "country-name" },
      { key: "pincode", label: "Pincode", inputMode: "numeric", autoComplete: "postal-code" },
    ],
  },
];

/** Marks the items on the last visual row (two columns; a wide item takes a whole row). */
function lastRowFlags(items: Item[]): boolean[] {
  const rows: number[][] = [];
  let cur: number[] = [];
  items.forEach((it, i) => {
    if (it.wide) {
      if (cur.length) rows.push(cur);
      cur = [];
      rows.push([i]);
    } else {
      cur.push(i);
      if (cur.length === 2) {
        rows.push(cur);
        cur = [];
      }
    }
  });
  if (cur.length) rows.push(cur);
  const last = new Set(rows[rows.length - 1] ?? []);
  return items.map((_, i) => last.has(i));
}

const NOT_SET = <span className="font-normal text-pd-ink3">Not set</span>;

export default function ProfileView() {
  const { profile, loading, saving, error, save } = useProfile();
  const { toast, toastNode } = usePdToast();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ParentProfileFormFields | null>(null);
  const [errors, setErrors] = useState<Errors>({});

  function startEdit() {
    if (!profile) return;
    setForm(toForm(profile));
    setErrors({});
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setErrors({});
  }

  function setField(key: FieldKey, value: string) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;

    // The API refuses an empty first name, last name or phone, so check here first.
    const found: Errors = {};
    if (!form.firstName.trim()) found.firstName = "First name is required.";
    if (!form.lastName.trim()) found.lastName = "Last name is required.";
    if (!form.phone.trim()) found.phone = "Phone number is required.";
    setErrors(found);
    if (Object.keys(found).length) return;

    const ok = await save(form);
    if (ok) {
      setEditing(false);
      toast("Profile saved");
    }
  }

  if (loading) {
    return (
      <div className="mt-6 grid max-w-[1000px] gap-5 min-[960px]:grid-cols-[280px_minmax(0,1fr)]">
        <PdSkeleton height={320} />
        <div className="flex flex-col gap-4">
          <PdSkeleton height={190} />
          <PdSkeleton height={260} />
          <PdSkeleton height={260} />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mt-6 max-w-[1000px]">
        <PdBanner tone="red">{error || "Unable to load your profile."}</PdBanner>
      </div>
    );
  }

  const fullName = `${profile.firstName} ${profile.lastName}`.trim();
  const display = profile.visibleName?.trim() ?? "";
  const missing = COMPLETENESS.filter(([k]) => !String(profile[k] ?? "").trim());
  const pct = Math.round(((COMPLETENESS.length - missing.length) / COMPLETENESS.length) * 100);

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="mt-6 grid max-w-[1000px] items-start gap-5 min-[960px]:grid-cols-[280px_minmax(0,1fr)]"
    >
      {/* Identity + completeness */}
      <aside
        className={`${PD_CARD} flex min-w-0 flex-col items-center gap-1.5 px-5 pb-5 pt-7 text-center min-[960px]:sticky min-[960px]:top-[80px]`}
      >
        <span
          aria-hidden="true"
          className="mb-1.5 grid size-[88px] place-items-center rounded-full bg-pd-brand font-heading text-[38px] font-semibold text-white"
        >
          {getInitial(profile.firstName)}
        </span>
        <h2 className="break-words font-heading text-xl font-semibold text-pd-ink">{fullName}</h2>
        {display && (
          <p className="text-[13px] text-pd-ink3">
            Shown to teachers as <b className="font-semibold text-pd-ink2">{display}</b>
          </p>
        )}
        <p className="mb-1.5 max-w-full truncate text-[13px] text-pd-ink2">{profile.email}</p>
        <Tag tone="violet">Member since {dLong(profile.createdAt)}</Tag>

        <div className="mt-4 w-full border-t border-pd-line pt-4 text-left">
          <div className="flex items-center gap-3 text-pd-ink">
            <PdRing percent={pct} />
            <div>
              <b className="block text-sm font-semibold">
                {pct === 100 ? "Profile complete" : `Profile ${pct}% complete`}
              </b>
              <small className="block text-xs leading-snug text-pd-ink3">
                {pct === 100
                  ? "Teachers can reach you easily."
                  : "A full profile helps teachers reach you."}
              </small>
            </div>
          </div>
          {missing.length > 0 && !editing && (
            <ul className="mt-3 flex flex-col gap-0.5">
              {missing.slice(0, 3).map(([k, text]) => (
                <li key={k}>
                  <button
                    type="button"
                    onClick={startEdit}
                    className="flex w-full items-center gap-2 rounded-[10px] px-2.5 py-2 text-left text-[13px] font-semibold text-pd-brand transition-colors hover:bg-pd-b50"
                  >
                    <Plus size={14} />
                    Add {text}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* Details */}
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-[19px] font-semibold text-pd-ink">
              {editing ? "Editing your profile" : "Your profile"}
            </h2>
            <p className="text-[13px] text-pd-ink3">
              {editing
                ? "Change what you need, then save."
                : "These details are used for class updates and reminders."}
            </p>
          </div>
          {!editing && (
            <button type="button" onClick={startEdit} className={PD_BTN_PRI}>
              <User size={16} />
              Edit profile
            </button>
          )}
        </div>

        {error && <PdBanner tone="red">{error}</PdBanner>}

        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const lastRow = lastRowFlags(section.items);

          return (
            <section key={section.title} className={PD_CARD_FLUSH}>
              <header className="flex items-center gap-3 border-b border-pd-line px-5 py-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-pd-b50 text-pd-brand">
                  <Icon size={18} />
                </span>
                <div>
                  <h2 className="font-heading text-base font-semibold text-pd-ink">{section.title}</h2>
                  <p className="text-[13px] text-pd-ink3">{section.sub}</p>
                </div>
              </header>

              <dl
                className={`grid grid-cols-1 sm:grid-cols-2 ${editing ? "gap-4 p-5" : ""}`}
              >
                {section.items.map((item, i) => {
                  const wide = item.wide ? "sm:col-span-2" : "";
                  const stored =
                    item.key === "email"
                      ? profile.email
                      : String(profile[item.key] ?? "").trim();

                  // Editable control (edit mode only; email stays read-only).
                  if (editing && form && !item.readOnly && item.key !== "email") {
                    const key = item.key;
                    const id = `p-${key}`;
                    const value = form[key] ?? "";
                    let control: ReactNode;

                    if (item.options) {
                      // Keep a value saved before this list existed selectable.
                      const opts = value && !item.options.includes(value) ? [value, ...item.options] : item.options;
                      control = (
                        <select
                          id={id}
                          value={value}
                          onChange={(e) => setField(key, e.target.value)}
                          className={PD_INPUT}
                        >
                          <option value="">Not set</option>
                          {opts.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      );
                    } else {
                      control = (
                        <input
                          id={id}
                          type={item.type}
                          inputMode={item.inputMode}
                          autoComplete={item.autoComplete}
                          value={value}
                          placeholder="Not set"
                          aria-invalid={Boolean(errors[key])}
                          onChange={(e) => setField(key, e.target.value)}
                          className={PD_INPUT}
                        />
                      );
                    }

                    return (
                      <PdField
                        key={key}
                        id={id}
                        label={item.label}
                        hint={item.hint}
                        error={errors[key]}
                        className={wide}
                      >
                        {control}
                      </PdField>
                    );
                  }

                  // Read-only row (view mode, or the locked email in edit mode).
                  return (
                    <div
                      key={item.key}
                      className={`min-w-0 ${wide} ${
                        editing
                          ? ""
                          : `border-t border-pd-line px-5 py-3.5 first:border-t-0 sm:border-t-0 sm:border-b ${
                              lastRow[i] ? "sm:border-b-0" : ""
                            }`
                      }`}
                    >
                      <dt className="mb-0.5 text-xs font-semibold text-pd-ink3">{item.label}</dt>
                      <dd className="break-words text-[15px] font-medium text-pd-ink">
                        {stored || NOT_SET}
                        {item.readOnly && editing && (
                          <small className="mt-0.5 flex items-center gap-1.5 text-xs font-normal text-pd-ink3">
                            <Lock size={12} />
                            Can’t be changed here
                          </small>
                        )}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </section>
          );
        })}

        {editing && (
          <div className="sticky bottom-[calc(76px+env(safe-area-inset-bottom))] z-[5] flex justify-end gap-2 rounded-[14px] border border-pd-line2 bg-white px-4 py-3 shadow-[0_16px_40px_-12px_rgba(23,23,43,0.28)] min-[960px]:bottom-4 max-sm:[&>button]:flex-1">
            <button type="button" onClick={cancelEdit} disabled={saving} className={PD_BTN_SEC}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className={PD_BTN_PRI}>
              <Check size={16} strokeWidth={2.5} />
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        )}
      </div>

      {toastNode}
    </form>
  );
}
