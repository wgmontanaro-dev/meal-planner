import { z } from "zod";

/** Trims a string and validates a maximum length, without altering internal whitespace or line breaks. */
export function trimmedText(maxLength: number, tooLongMessage: string) {
  return z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().max(maxLength, tooLongMessage));
}

/** Same as trimmedText, but an empty result becomes null (SPEC section 11.2/11.3/11.5: "store null when empty"). */
export function optionalTrimmedText(maxLength: number, tooLongMessage: string) {
  return trimmedText(maxLength, tooLongMessage).transform((value) =>
    value.length > 0 ? value : null
  );
}
