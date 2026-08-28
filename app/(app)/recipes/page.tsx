import type { Metadata } from "next";
import { RecipeLibrary } from "@/components/recipes/recipe-library";
import { RecipeFilters } from "@/components/recipes/recipe-filters";
import { AddRecipeButton } from "@/components/recipes/add-recipe-button";
import { listRecipes } from "@/lib/recipes/actions";
import type { RecipeFilters as RecipeFilterValues } from "@/lib/recipes/types";
import {
  CUISINES,
  DIET_TYPES,
  PREPARATION_TYPES,
  PREP_TIME_CATEGORIES,
  STORAGE_TYPES,
  TERNARY_CATEGORIES,
  parseCategoryValue,
} from "@/lib/constants/categories";

export const metadata: Metadata = {
  title: "Recipes — Meal Planner",
};

function readFilters(
  searchParams: Record<string, string | string[] | undefined>
): RecipeFilterValues {
  const readParam = (key: string) => {
    const value = searchParams[key];
    return typeof value === "string" ? value : undefined;
  };

  return {
    prepTimeCategory: parseCategoryValue(PREP_TIME_CATEGORIES, readParam("prepTimeCategory")),
    cuisine: parseCategoryValue(CUISINES, readParam("cuisine")),
    storageType: parseCategoryValue(STORAGE_TYPES, readParam("storageType")),
    dietType: parseCategoryValue(DIET_TYPES, readParam("dietType")),
    childFriendly: parseCategoryValue(TERNARY_CATEGORIES, readParam("childFriendly")),
    preparationType: parseCategoryValue(PREPARATION_TYPES, readParam("preparationType")),
  };
}

function hasActiveFilters(filters: RecipeFilterValues): boolean {
  return Object.values(filters).some((value) => value !== undefined);
}

export default async function RecipesPage(props: PageProps<"/recipes">) {
  const searchParams = await props.searchParams;
  const filters = readFilters(searchParams);
  const recipes = await listRecipes(filters);
  const filtersActive = hasActiveFilters(filters);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Recipes</h1>
        <AddRecipeButton className="hidden sm:inline-flex" />
      </div>

      <RecipeFilters filters={filters} />

      {recipes.length === 0 && !filtersActive ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
          <h2 className="text-lg font-medium">No recipes yet</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Recipes you add here can be used to plan meals on the calendar.
          </p>
          <AddRecipeButton />
        </div>
      ) : recipes.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center">
          <h2 className="text-lg font-medium">No recipes match these filters</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Try clearing a filter to see more recipes.
          </p>
        </div>
      ) : (
        <RecipeLibrary recipes={recipes} />
      )}

      {recipes.length > 0 || filtersActive ? (
        <AddRecipeButton className="fixed right-4 bottom-20 sm:hidden" floating />
      ) : null}
    </div>
  );
}
