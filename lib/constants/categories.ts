// Controlled category values for recipes. These must match the CHECK
// constraints in supabase/migrations/20260826201547_initial_schema.sql
// character for character. See SPEC.md section 10.

export const PREP_TIME_CATEGORIES = [
  "UNDER_15",
  "FROM_15_TO_30",
  "FROM_30_TO_60",
  "FROM_60_TO_90",
  "OVER_90",
] as const;

export type PrepTimeCategory = (typeof PREP_TIME_CATEGORIES)[number];

export const PREP_TIME_LABELS: Record<PrepTimeCategory, string> = {
  UNDER_15: "Under 15 minutes",
  FROM_15_TO_30: "15 to 30 minutes",
  FROM_30_TO_60: "30 to 60 minutes",
  FROM_60_TO_90: "60 to 90 minutes",
  OVER_90: "Over 90 minutes",
};

export const CUISINES = [
  "AFRICAN",
  "AMERICAN",
  "BRITISH",
  "CARIBBEAN",
  "CHINESE",
  "EASTERN_EUROPEAN",
  "FRENCH",
  "GREEK",
  "INDIAN",
  "ITALIAN",
  "JAPANESE",
  "KOREAN",
  "LATIN_AMERICAN",
  "MEDITERRANEAN",
  "MEXICAN",
  "MIDDLE_EASTERN",
  "NORTH_AFRICAN",
  "SCANDINAVIAN",
  "SOUTH_EAST_ASIAN",
  "SPANISH",
  "THAI",
  "VIETNAMESE",
  "OTHER",
] as const;

export type Cuisine = (typeof CUISINES)[number];

export const CUISINE_LABELS: Record<Cuisine, string> = {
  AFRICAN: "African",
  AMERICAN: "American",
  BRITISH: "British",
  CARIBBEAN: "Caribbean",
  CHINESE: "Chinese",
  EASTERN_EUROPEAN: "Eastern European",
  FRENCH: "French",
  GREEK: "Greek",
  INDIAN: "Indian",
  ITALIAN: "Italian",
  JAPANESE: "Japanese",
  KOREAN: "Korean",
  LATIN_AMERICAN: "Latin American",
  MEDITERRANEAN: "Mediterranean",
  MEXICAN: "Mexican",
  MIDDLE_EASTERN: "Middle Eastern",
  NORTH_AFRICAN: "North African",
  SCANDINAVIAN: "Scandinavian",
  SOUTH_EAST_ASIAN: "South East Asian",
  SPANISH: "Spanish",
  THAI: "Thai",
  VIETNAMESE: "Vietnamese",
  OTHER: "Other",
};

export const STORAGE_TYPES = ["STORE_CUPBOARD", "FRESH", "MIXED"] as const;

export type StorageType = (typeof STORAGE_TYPES)[number];

export const STORAGE_TYPE_LABELS: Record<StorageType, string> = {
  STORE_CUPBOARD: "Store cupboard",
  FRESH: "Fresh",
  MIXED: "Mixed",
};

export const DIET_TYPES = ["VEGETARIAN", "MEAT_OR_FISH", "FLEXIBLE"] as const;

export type DietType = (typeof DIET_TYPES)[number];

export const DIET_TYPE_LABELS: Record<DietType, string> = {
  VEGETARIAN: "Vegetarian",
  MEAT_OR_FISH: "Meat or fish",
  FLEXIBLE: "Flexible",
};

export const TERNARY_CATEGORIES = ["YES", "NO", "NOT_SPECIFIED"] as const;

export type TernaryCategory = (typeof TERNARY_CATEGORIES)[number];

export const CHILD_FRIENDLY_LABELS: Record<TernaryCategory, string> = {
  YES: "Yes",
  NO: "No",
  NOT_SPECIFIED: "Not specified",
};

export const PREPARATION_TYPES = [
  "PRE_PREPARED",
  "REQUIRES_PREPARATION",
  "NOT_SPECIFIED",
] as const;

export type PreparationType = (typeof PREPARATION_TYPES)[number];

export const PREPARATION_TYPE_LABELS: Record<PreparationType, string> = {
  PRE_PREPARED: "Pre-prepared",
  REQUIRES_PREPARATION: "Requires preparation or cooking",
  NOT_SPECIFIED: "Not specified",
};

/** Narrows an arbitrary string (e.g. from a URL search param) to a known category value, or undefined if it doesn't match. */
export function parseCategoryValue<T extends string>(
  allowedValues: readonly T[],
  value: string | undefined
): T | undefined {
  return allowedValues.includes(value as T) ? (value as T) : undefined;
}
