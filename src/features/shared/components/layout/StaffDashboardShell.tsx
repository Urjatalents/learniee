import Link from "next/link";

interface StaffDashboardCard {
  title: string;
  description: string;
  /** Optional (Sep 23, 2026) — when set, the card links there instead
   * of just sitting as a "coming soon" placeholder. */
  href?: string;
}

interface StaffDashboardShellProps {
  heading: string;
  subheading: string;
  welcomeName: string;
  cards: StaffDashboardCard[];
}

/**
 * Deliberately simple landing dashboard for an internal staff role
 * (HR, IT) that has a login but no real feature set yet — just a
 * welcome + a few labeled "coming soon" cards, matching the honest
 * "not built yet" tone used elsewhere in the app rather than showing
 * fake data. Swap a card out for a real widget as each area gets built.
 */
export default function StaffDashboardShell({
  heading,
  subheading,
  welcomeName,
  cards,
}: StaffDashboardShellProps) {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-bold text-purple-600">{heading}</h1>
      <p className="text-sm text-gray-500 mt-1 mb-8">
        Welcome, {welcomeName}. {subheading}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) =>
          card.href ? (
            <Link
              key={card.title}
              href={card.href}
              className="bg-white rounded-xl border shadow-sm p-5 hover:border-purple-300 hover:shadow transition block"
            >
              <h2 className="font-semibold text-gray-800 mb-1">{card.title}</h2>
              <p className="text-sm text-gray-500">{card.description}</p>
            </Link>
          ) : (
            <div key={card.title} className="bg-white rounded-xl border shadow-sm p-5">
              <h2 className="font-semibold text-gray-800 mb-1">{card.title}</h2>
              <p className="text-sm text-gray-500">{card.description}</p>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
