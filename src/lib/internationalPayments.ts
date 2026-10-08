import "server-only";
import { round2 } from '@/lib/money';

/**
 * International-payment surcharge (added Sep 8, 2026, per direct
 * request): the extra cost of accepting a non-Indian card —
 * Razorpay's higher international transaction fee, plus any forex
 * spread — is now passed on to the parent as a surcharge added on
 * top of the base price, instead of Learniee absorbing it.
 *
 * This SUPERSEDES the older decision documented in the file header
 * of src/lib/razorpay.ts, which explicitly chose not to add any
 * markup and to let the parent's own bank handle conversion
 * invisibly. That comment is now stale — this file is the current
 * source of truth for how international payments are priced.
 *
 * Detection caveat: Razorpay only knows a card's issuing country
 * *after* a charge attempt, so we can't price the order differently
 * per-card before Checkout even opens. Instead this uses the
 * parent's own onboarding answer (self-declared "Indian" vs "NRI",
 * `ParentProfile.nriOrIndian`, falling back to `.country`) as a
 * proxy for "will this likely be an international card". This is an
 * approximation, not a guarantee — flagging it the same way
 * 06-OPEN-DECISIONS.md #37 flags the underlying pricing formula, so
 * it doesn't get treated as a settled fact later. Worth revisiting
 * once real payment data shows how often the self-declared flag and
 * the actual card country disagree.
 */

const DEFAULT_SURCHARGE_PCT = 3;

/** Reads the surcharge % from env so it can be tuned without a redeploy-and-code-change cycle. */
function getSurchargePercent(): number {
  const raw = process.env.RAZORPAY_INTERNATIONAL_SURCHARGE_PCT;
  const parsed = raw ? Number(raw) : DEFAULT_SURCHARGE_PCT;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_SURCHARGE_PCT;
}

export interface InternationalPricing {
  isInternationalPayment: boolean;
  /** Extra amount added on top of the base price, in rupees. Zero for domestic payments. */
  surchargeAmount: number;
  /** base + surchargeAmount — this is the amount actually charged via Razorpay. */
  amountPayable: number;
}

/**
 * Both fields are optional/free-text on `ParentProfile` (see
 * 03-DATA-MODEL.md) — an account that never filled either one is
 * treated as domestic (no surcharge), which matches the previous
 * no-surcharge-for-anyone default and avoids accidentally
 * overcharging incomplete profiles.
 */
export function isInternationalParent(parent: {
  nriOrIndian?: string | null;
  country?: string | null;
}): boolean {
  const nri = parent.nriOrIndian?.trim().toLowerCase();

  if (nri === "nri") {
    return true;
  }

  const country = parent.country?.trim().toLowerCase();

  if (country && country !== "india") {
    return true;
  }

  return false;
}

/** Rounds to 2 decimal places — matches the `Decimal(10,2)` precision of every money field. */
/**
 * Applies the international surcharge (if applicable) to a base
 * rupee amount. Call this AFTER computing the normal price
 * (course/demo formula) and BEFORE converting to paise for
 * Razorpay — same "compute once, reuse at order-create and
 * verify/webhook time" pattern as the rest of the pricing code, so
 * the charge can never drift between steps.
 */
export function priceWithInternationalSurcharge(
  baseAmount: number,
  isInternational: boolean,
): InternationalPricing {
  if (!isInternational) {
    return { isInternationalPayment: false, surchargeAmount: 0, amountPayable: baseAmount };
  }

  const surchargeAmount = round2(baseAmount * (getSurchargePercent() / 100));

  return {
    isInternationalPayment: true,
    surchargeAmount,
    amountPayable: round2(baseAmount + surchargeAmount),
  };
}
