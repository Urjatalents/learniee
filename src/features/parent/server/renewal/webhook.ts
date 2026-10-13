import { getRazorpayClient } from "@/lib/razorpay";
import "server-only";
import { applyPaidRenewal, ensureRenewalInvoice, findCycleForPayment } from './apply';
import { RenewalError } from './plan';

/**
 * Reconciliation path used ONLY by the Razorpay webhook
 * (src/app/api/webhooks/razorpay/route.ts) for `payment.captured`
 * events on `kind: "cycle_renewal"` orders.
 *
 * This is the safety net for "the parent paid for a renewal, closed
 * the tab, and never hit `/renew/verify`": without it the money is
 * captured but no next `EnrollmentCycle` exists. There's no
 * browser-side checkout signature here — the webhook route is the
 * trust boundary (it verifies `X-Razorpay-Signature` against the raw
 * body before calling this), and the order is re-fetched from Razorpay
 * with our own API key so its notes can't be forged by a client.
 *
 * Returns the cycle for a recognised renewal (newly created, or
 * already created by /verify), or `null` if this order isn't a
 * renewal / isn't paid / can't be applied. The webhook route then
 * moves on to the other order kinds.
 *
 * Failure policy:
 *  - `RenewalError` (enrollment ended, moved on, amount drifted,
 *    double payment...) is a case a retry can never fix. It's logged
 *    with a `[renewal-reconcile]` prefix — search the logs for it to
 *    find payments that need a manual refund — and `null` is returned
 *    so Razorpay gets a 200 and stops retrying.
 *  - Anything else (DB blip, Razorpay API timeout) is rethrown so the
 *    webhook route answers 500 and Razorpay retries later.
 *  - The same applies if the cycle was created but its Invoice could
 *    not be: the retry's fast path re-runs invoice generation.
 */
export async function reconcileRenewalFromWebhook(
  orderId: string,
  paymentId: string,
) {
  // Fast path: /verify (or an earlier delivery of this webhook)
  // already turned this payment into a cycle.
  const existing = await findCycleForPayment(paymentId);

  if (existing) {
    const invoiceOk = await ensureRenewalInvoice({ cycle: existing, orderId, paymentId });

    if (!invoiceOk) {
      throw new Error(
        `Renewal invoice still missing for order ${orderId} — failing so Razorpay redelivers.`,
      );
    }

    return existing;
  }

  const razorpay = getRazorpayClient();
  const order = await razorpay.orders.fetch(orderId);

  if (order.status !== "paid") {
    return null;
  }

  const notes = (order.notes ?? {}) as Record<string, unknown>;

  if (notes.kind !== "cycle_renewal") {
    return null;
  }

  const parentId = String(notes.parentId ?? "");
  const enrollmentId = String(notes.enrollmentId ?? "");

  if (!parentId || !enrollmentId) {
    console.error(
      `[renewal-reconcile] NEEDS MANUAL REVIEW: renewal order missing notes (order ${orderId}, payment ${paymentId})`,
    );
    return null;
  }

  try {
    const { cycle, invoiceOk } = await applyPaidRenewal({
      order,
      paymentId,
      parentId,
      enrollmentId,
    });

    if (!invoiceOk) {
      // The cycle is safely created; failing here only makes Razorpay
      // redeliver the webhook, whose fast path above retries the invoice.
      throw new Error(
        `Renewal invoice not generated for order ${orderId} — failing so Razorpay redelivers.`,
      );
    }

    return cycle;
  } catch (error) {
    if (error instanceof RenewalError) {
      console.error(
        `[renewal-reconcile] NEEDS MANUAL REVIEW: payment captured but renewal not applied — ${error.message} (order ${orderId}, payment ${paymentId}, enrollment ${enrollmentId}, parent ${parentId})`,
      );
      return null;
    }

    throw error;
  }
}
