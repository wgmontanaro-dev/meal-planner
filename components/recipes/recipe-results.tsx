"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RecipeLibrary } from "@/components/recipes/recipe-library";
import { RecipeTable } from "@/components/recipes/recipe-table";
import type { RecipeView } from "@/components/recipes/recipe-view-toggle";
import type { RecipeWithImage } from "@/lib/recipes/types";

/**
 * Wraps the recipe list/table with an instant title search, mirroring the
 * search in the calendar's meal-slot picker. Category filtering still
 * happens server-side (URL params); this narrows that result by title in
 * the browser.
 */
export function RecipeResults({
  recipes,
  view,
}: {
  recipes: RecipeWithImage[];
  view: RecipeView;
}) {
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const filtered = query
    ? recipes.filter((recipe) => recipe.title.toLowerCase().includes(query))
    : recipes;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:max-w-xs">
        <Label htmlFor="recipe-search">Search by title</Label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="recipe-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="e.g. curry"
            className="pl-9"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
          No recipes match your search.
        </p>
      ) : view === "list" ? (
        <RecipeTable recipes={filtered} />
      ) : (
        <RecipeLibrary recipes={filtered} />
      )}
    </div>
  );
}
