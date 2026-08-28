import { z } from "zod";
import { mealDateSchema } from "@/lib/validation/meal-plan";

// SPEC.md section 20.2: both dates required, start on or before end, inclusive
// boundaries. The "not before the earliest retained date" rule depends on the
// current clock, so it is enforced in the server action (and the dialog),
// not in this static schema.
export const shoppingListRangeSchema = z
  .object({
    startDate: mealDateSchema,
    endDate: mealDateSchema,
  })
  .refine((value) => value.startDate <= value.endDate, {
    message: "The start date must be on or before the end date.",
    path: ["endDate"],
  });
