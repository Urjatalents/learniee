/**
 * Single source of truth for "how do we show a person's name".
 *
 * Every caller must pass firstName + lastName (both required) plus
 * visibleName. Making lastName required here — instead of optional,
 * which is what caused the Sep 7 build break — means a mismatch
 * between a Prisma `select` and this signature fails `tsc` at the
 * call site immediately, instead of silently rendering "Firstname "
 * with a trailing space or (worse) getting "fixed" by loosening this
 * type again.
 *
 * If you need this for a new role/query, make sure the Prisma
 * `select`/`include` actually includes `lastName` — don't just widen
 * this signature to make the error go away.
 */
export function displayName(person: {
  firstName: string;
  lastName: string;
  visibleName: string | null;
}) {
  return person.visibleName?.trim() || `${person.firstName} ${person.lastName}`.trim();
}
