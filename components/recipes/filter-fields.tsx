"use client";

import { CategorySelect } from "@/components/recipes/category-select";
import {
  CUISINE_LABELS,
  CUISINES,
  DIET_TYPE_LABELS,
  DIET_TYPES,
  PREPARATION_TYPE_LABELS,
  PREPARATION_TYPES,
  PREP_TIME_CATEGORIES,
  PREP_TIME_LABELS,
  STORAGE_TYPE_LABELS,
  STORAGE_TYPES,
  CHILD_FRIENDLY_LABELS,
  WEEKNIGHT_FAVOURITE_LABELS,
  TERNARY_CATEGORIES,
} from "@/lib/constants/categories";

// The seven controlled-category filters shared between the Recipe Library
// (SPEC.md section 12.6) and the meal-slot recipe picker (SPEC.md section
// 16.1) — reused as-is rather than rebuilt per surface.
export const FILTER_PARAM_KEYS = [
  "prepTimeCategory",
  "cuisine",
  "storageType",
  "dietType",
  "childFriendly",
  "weeknightFavourite",
  "preparationType",
] as const;

export type FilterKey = (typeof FILTER_PARAM_KEYS)[number];
export type DraftFilters = Partial<Record<FilterKey, string | undefined>>;

export function FilterFields({
  filters,
  onChange,
}: {
  filters: DraftFilters;
  onChange: (key: FilterKey, value: string | undefined) => void;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3">
      <CategorySelect
        id="filter-prepTimeCategory"
        name="prepTimeCategory"
        label="Preparation time"
        options={PREP_TIME_CATEGORIES}
        labels={PREP_TIME_LABELS}
        clearable
        value={filters.prepTimeCategory}
        onValueChange={(value) => onChange("prepTimeCategory", value)}
      />
      <CategorySelect
        id="filter-cuisine"
        name="cuisine"
        label="Cuisine"
        options={CUISINES}
        labels={CUISINE_LABELS}
        clearable
        value={filters.cuisine}
        onValueChange={(value) => onChange("cuisine", value)}
      />
      <CategorySelect
        id="filter-storageType"
        name="storageType"
        label="Storage type"
        options={STORAGE_TYPES}
        labels={STORAGE_TYPE_LABELS}
        clearable
        value={filters.storageType}
        onValueChange={(value) => onChange("storageType", value)}
      />
      <CategorySelect
        id="filter-dietType"
        name="dietType"
        label="Diet type"
        options={DIET_TYPES}
        labels={DIET_TYPE_LABELS}
        clearable
        value={filters.dietType}
        onValueChange={(value) => onChange("dietType", value)}
      />
      <CategorySelect
        id="filter-childFriendly"
        name="childFriendly"
        label="Child-friendly"
        options={TERNARY_CATEGORIES}
        labels={CHILD_FRIENDLY_LABELS}
        clearable
        value={filters.childFriendly}
        onValueChange={(value) => onChange("childFriendly", value)}
      />
      <CategorySelect
        id="filter-weeknightFavourite"
        name="weeknightFavourite"
        label="Weeknight favourite"
        options={TERNARY_CATEGORIES}
        labels={WEEKNIGHT_FAVOURITE_LABELS}
        clearable
        value={filters.weeknightFavourite}
        onValueChange={(value) => onChange("weeknightFavourite", value)}
      />
      <CategorySelect
        id="filter-preparationType"
        name="preparationType"
        label="Preparation type"
        options={PREPARATION_TYPES}
        labels={PREPARATION_TYPE_LABELS}
        clearable
        value={filters.preparationType}
        onValueChange={(value) => onChange("preparationType", value)}
      />
    </div>
  );
}
