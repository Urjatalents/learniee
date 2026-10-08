import {
    isInternationalParent,
    priceWithInternationalSurcharge,
} from "@/lib/internationalPayments";
import { prisma } from "@/lib/prisma";

/**
 * DECIDED (06-OPEN-DECISIONS.md #26): every ParentProfile gets 2
 * free demo sessions, then a flat ₹100 each. This is per ACCOUNT,
 * not per child — a parent with 3 children still only gets 2 free
 * demos total, shared across all of them.
 */
export const FREE_DEMOS_PER_ACCOUNT = 2;
const PAID_DEMO_PRICE = 100;
/**
 * Prices a paid demo for this parent, applying the international
 * surcharge if applicable — same pattern and same caveats as
 * enrollment.service.ts's priceEnrollment(). Called at order-create,
 * verify, and webhook-reconcile time so the charge can't drift
 * between steps.
 */
export async function priceDemoBooking(parentId: string) {
  const parent = await prisma.parentProfile.findUnique({
    where: { id: parentId },
    select: { nriOrIndian: true, country: true },
  });

  return priceWithInternationalSurcharge(
    PAID_DEMO_PRICE,
    parent ? isInternationalParent(parent) : false,
  );
}
export class DemoBookingError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
/**
 * Resolves the logged-in parent's DemoCoupon row, creating it on
 * first use. Accounts that onboarded before this feature existed
 * won't have a DemoCoupon row yet — this lazily backfills one
 * instead of requiring a one-off migration script to issue coupons
 * to every existing ParentProfile.
 */
export async function getOrCreateDemoCoupon(parentId: string) {
  const existing = await prisma.demoCoupon.findUnique({
    where: { parentId },
  });

  if (existing) {
    return existing;
  }

  return prisma.demoCoupon.create({
    data: {
      parentId,
      totalIssued: FREE_DEMOS_PER_ACCOUNT,
      usedCount: 0,
    },
  });
}
/**
 * The balance shape the Parent dashboard/course-detail page needs:
 * how many free demos are left, and what a paid demo costs once
 * they run out.
 */
export async function getDemoCouponBalance(parentId: string) {
  const coupon = await getOrCreateDemoCoupon(parentId);
  const remainingFree = Math.max(coupon.totalIssued - coupon.usedCount, 0);

  return {
    totalIssued: coupon.totalIssued,
    usedCount: coupon.usedCount,
    remainingFree,
    paidDemoPrice: PAID_DEMO_PRICE,
  };
}
