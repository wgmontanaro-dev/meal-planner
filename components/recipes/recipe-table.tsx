"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  categoryLabel,
  CUISINE_LABELS,
  DIET_TYPE_LABELS,
  PREP_TIME_LABELS,
  STORAGE_TYPE_LABELS,
  CHILD_FRIENDLY_LABELS,
  PREPARATION_TYPE_LABELS,
  PREP_TIME_CATEGORIES,
} from "@/lib/constants/categories";
import type { RecipeWithImage } from "@/lib/recipes/types";

type SortDir = "asc" | "desc";
type ColumnKey =
  | "title"
  | "cuisine"
  | "prepTimeCategory"
  | "dietType"
  | "storageType"
  | "childFriendly"
  | "preparationType"
  | "source";

type Column = {
  key: ColumnKey;
  label: string;
  /** Text shown / matched by the text filter / used as the default sort key. */
  text: (recipe: RecipeWithImage) => string;
  /** Overrides the sort key where lexical order isn't what we want. */
  sortKey?: (recipe: RecipeWithImage) => number | string;
  filter: "text" | "select" | "source";
};

const PREP_ORDER = new Map(PREP_TIME_CATEGORIES.map((value, index) => [value, index]));

const COLUMNS: Column[] = [
  { key: "title", label: "Recipe", text: (r) => r.title, filter: "text" },
  {
    key: "cuisine",
    label: "Cuisine",
    text: (r) => categoryLabel(CUISINE_LABELS, r.cuisine),
    filter: "select",
  },
  {
    key: "prepTimeCategory",
    label: "Prep time",
    text: (r) => categoryLabel(PREP_TIME_LABELS, r.prepTimeCategory),
    sortKey: (r) => (r.prepTimeCategory ? PREP_ORDER.get(r.prepTimeCategory) ?? 99 : 99),
    filter: "select",
  },
  {
    key: "dietType",
    label: "Diet",
    text: (r) => categoryLabel(DIET_TYPE_LABELS, r.dietType),
    filter: "select",
  },
  {
    key: "storageType",
    label: "Storage",
    text: (r) => categoryLabel(STORAGE_TYPE_LABELS, r.storageType),
    filter: "select",
  },
  {
    key: "childFriendly",
    label: "Child-friendly",
    text: (r) => categoryLabel(CHILD_FRIENDLY_LABELS, r.childFriendly),
    filter: "select",
  },
  {
    key: "preparationType",
    label: "Preparation",
    text: (r) => categoryLabel(PREPARATION_TYPE_LABELS, r.preparationType),
    filter: "select",
  },
  {
    key: "source",
    label: "Source",
    text: (r) => (r.sourceUrl ? "Link" : "—"),
    sortKey: (r) => (r.sourceUrl ? 0 : 1),
    filter: "source",
  },
];

const CONTROL_CLASS =
  "h-7 w-full min-w-24 rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

function compare(a: number | string, b: number | string): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

export function RecipeTable({
  recipes,
  onEdit,
}: {
  recipes: RecipeWithImage[];
  onEdit: (recipeId: string) => void;
}) {
  const [sort, setSort] = useState<{ key: ColumnKey; dir: SortDir } | null>(null);
  const [filters, setFilters] = useState<Partial<Record<ColumnKey, string>>>({});

  function toggleSort(key: ColumnKey) {
    setSort((current) => {
      if (!current || current.key !== key) return { key, dir: "asc" };
      if (current.dir === "asc") return { key, dir: "desc" };
      return null; // asc -> desc -> off
    });
  }

  function setFilter(key: ColumnKey, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function clearAll() {
    setSort(null);
    setFilters({});
  }

  const optionsByColumn = useMemo(() => {
    const map = new Map<ColumnKey, string[]>();
    for (const column of COLUMNS) {
      if (column.filter !== "select") continue;
      map.set(
        column.key,
        [...new Set(recipes.map(column.text))].sort((a, b) => a.localeCompare(b))
      );
    }
    return map;
  }, [recipes]);

  const rows = useMemo(() => {
    let list = recipes;

    for (const column of COLUMNS) {
      const value = filters[column.key];
      if (!value) continue;
      if (column.filter === "text") {
        const query = value.toLowerCase();
        list = list.filter((recipe) => column.text(recipe).toLowerCase().includes(query));
      } else if (column.filter === "source") {
        list = list.filter((recipe) => (value === "yes" ? !!recipe.sourceUrl : !recipe.sourceUrl));
      } else {
        list = list.filter((recipe) => column.text(recipe) === value);
      }
    }

    if (sort) {
      const column = COLUMNS.find((c) => c.key === sort.key);
      if (column) {
        const key = column.sortKey ?? ((recipe: RecipeWithImage) => column.text(recipe).toLowerCase());
        list = [...list].sort((a, b) => {
          const result = compare(key(a), key(b));
          return sort.dir === "asc" ? result : -result;
        });
      }
    }

    return list;
  }, [recipes, filters, sort]);

  const activeCount = Object.values(filters).filter(Boolean).length + (sort ? 1 : 0);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          Showing {rows.length} of {recipes.length}
        </span>
        {activeCount > 0 ? (
          <button
            type="button"
            onClick={clearAll}
            className="font-medium text-primary hover:underline"
          >
            Clear sort &amp; filters
          </button>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/60 align-top">
              {COLUMNS.map((column) => {
                const direction = sort?.key === column.key ? sort.dir : null;
                const SortIcon =
                  direction === "asc" ? ArrowUp : direction === "desc" ? ArrowDown : ChevronsUpDown;
                return (
                  <th key={column.key} className="px-3 py-2 text-left font-medium">
                    <button
                      type="button"
                      onClick={() => toggleSort(column.key)}
                      aria-label={`Sort by ${column.label}`}
                      className={cn(
                        "flex items-center gap-1 text-xs tracking-wide uppercase",
                        direction ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {column.label}
                      <SortIcon className="size-3" aria-hidden="true" />
                    </button>

                    <div className="mt-1.5">
                      {column.filter === "text" ? (
                        <input
                          type="search"
                          value={filters[column.key] ?? ""}
                          onChange={(event) => setFilter(column.key, event.target.value)}
                          placeholder="Filter…"
                          aria-label={`Filter by ${column.label}`}
                          className={CONTROL_CLASS}
                        />
                      ) : column.filter === "source" ? (
                        <select
                          value={filters[column.key] ?? ""}
                          onChange={(event) => setFilter(column.key, event.target.value)}
                          aria-label={`Filter by ${column.label}`}
                          className={CONTROL_CLASS}
                        >
                          <option value="">All</option>
                          <option value="yes">With link</option>
                          <option value="no">Without link</option>
                        </select>
                      ) : (
                        <select
                          value={filters[column.key] ?? ""}
                          onChange={(event) => setFilter(column.key, event.target.value)}
                          aria-label={`Filter by ${column.label}`}
                          className={CONTROL_CLASS}
                        >
                          <option value="">All</option>
                          {(optionsByColumn.get(column.key) ?? []).map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((recipe) => (
              <tr
                key={recipe.id}
                className="border-b border-border last:border-0 hover:bg-muted/40"
              >
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => onEdit(recipe.id)}
                    className="text-left font-medium underline-offset-4 hover:text-primary hover:underline"
                  >
                    {recipe.title}
                  </button>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {categoryLabel(CUISINE_LABELS, recipe.cuisine)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {categoryLabel(PREP_TIME_LABELS, recipe.prepTimeCategory)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {categoryLabel(DIET_TYPE_LABELS, recipe.dietType)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {categoryLabel(STORAGE_TYPE_LABELS, recipe.storageType)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {categoryLabel(CHILD_FRIENDLY_LABELS, recipe.childFriendly)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {categoryLabel(PREPARATION_TYPE_LABELS, recipe.preparationType)}
                </td>
                <td className="px-3 py-2">
                  {recipe.sourceUrl ? (
                    <a
                      href={recipe.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={recipe.sourceUrl}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      Link
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={COLUMNS.length}
                  className="px-3 py-6 text-center text-sm text-muted-foreground"
                >
                  No recipes match the column filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
