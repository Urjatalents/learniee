import { COMPANY_INFO } from "@/lib/companyInfo";

/**
 * Contact details printed in the legal documents. The e-mail comes from the
 * same env var the invoices use (NEXT_PUBLIC_COMPANY_SUPPORT_EMAIL); the
 * phone/WhatsApp numbers are the public numbers already published on
 * learniee.com.
 */
export const LEGAL_CONTACT = {
  entity: "Learniee, a product of Urja Talents",
  email: COMPANY_INFO.email,
  whatsapp: "+91 98330 77682",
  phone: "+91 85915 84200",
  location: "Mumbai, Maharashtra, India",
} as const;

export const LEGAL_LAST_UPDATED = "30 September 2026";
