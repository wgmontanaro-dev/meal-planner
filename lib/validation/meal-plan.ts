import { z } from "zod";
import { trimmedText } from "@/lib/validation/shared";

// Validation rules encoded here follow SPEC.md sections 9.3/9.4 (meal-plan
// entry integrity) and 17.1 (manual meal fields). All fields are validated
// server-side regardless of any client-side validation, per implementation
// principle 5.

export const MANUAL_TITLE_MAX_LENGTH = 100;

export const manualTitleSchema = trimmedText(
  MANUAL_TITLE_MAX_LENGTH,
  `Meal title must be ${MANUAL_TITLE_MAX_LENGTH} characters or fewer.`
).pipe(z.string().min(1, "Meal title is required."));

export const slotSchema = z.coerce
  .number()
  .int()
  .refine((value): value is 1 | 2 => value === 1 || value === 2, "Choose a valid meal slot.");

function isValidCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

export const mealDateSchema = z
  .string()
  .refine(isValidCalendarDate, "Enter a valid date.");

export const setManualMealSchema = z.object({
  mealDate: mealDateSchema,
  slot: slotSchema,
  manualTitle: manualTitleSchema,
});

export const setRecipeMealSchema = z.object({
  mealDate: mealDateSchema,
  slot: slotSchema,
  recipeId: z.uuid("Choose a recipe."),
});

export const removeMealSchema = z.object({
  mealDate: mealDateSchema,
  slot: slotSchema,
});
