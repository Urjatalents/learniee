/**
 * Shape shared by the three public legal documents (Terms, Privacy, Refunds).
 *
 * Text may contain `[[label|/path]]` for an internal link. Clause numbers
 * (1.1, 1.2 …) are generated from position, so reordering never breaks them.
 */
export interface LegalClause {
  /** Bold lead-in, e.g. "Consent and responsibility." */
  lead?: string;
  text: string;
  /** Optional bullet points shown under the clause. */
  bullets?: string[];
}

export interface LegalSection {
  id: string;
  title: string;
  clauses: LegalClause[];
}

export interface LegalDocument {
  title: string;
  subtitle: string;
  lastUpdated: string;
  sections: LegalSection[];
}
