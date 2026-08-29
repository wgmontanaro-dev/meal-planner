import type { Metadata } from "next";
import { RecipeResults } from "@/components/recipes/recipe-results";
import { RecipeViewToggle, type RecipeView } from "@/components/recipes/recipe-view-toggle";
import { RecipeFilters } from "@/components/recipes/recipe-filters";
import { AddRecipeButton } from "@/components/recipes/add-recipe-button";
import { listRecipes } from "@/lib/recipes/actions";
import { signRecipeImageUrls } from "@/lib/images/urls";
import type {
  RecipeFilters as RecipeFilterValues,
  RecipeWithImage,
} from "@/lib/recipes/types";
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
    weeknightFavourite: parseCategoryValue(TERNARY_CATEGORIES, readParam("weeknightFavourite")),
    preparationType: parseCategoryValue(PREPARATION_TYPES, readParam("preparationType")),
  };
}

function hasActiveFilters(filters: RecipeFilterValues): boolean {
  return Object.values(filters).some((value) => value !== undefined);
}

/** Card / list toggle hrefs, preserving any active filter params. */
function buildViewHrefs(searchParams: Record<string, string | string[] | undefined>) {
  const preserved = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (key !== "view" && typeof value === "string") {
      preserved.set(key, value);
    }
  }
  const base = preserved.toString();
  const withCard = new URLSearchParams(base);
  withCard.set("view", "card");
  return {
    // List is the default, so it gets the clean URL; card carries ?view=card.
    listHref: base ? `/recipes?${base}` : "/recipes",
    cardHref: `/recipes?${withCard.toString()}`,
  };
}

export default async function RecipesPage(props: PageProps<"/recipes">) {
  const searchParams = await props.searchParams;
  const filters = readFilters(searchParams);
  const recipeRows = await listRecipes(filters);
  const recipes: RecipeWithImage[] = await Promise.all(
    recipeRows.map(async (recipe) => ({
      ...recipe,
      imageUrls: await signRecipeImageUrls(recipe.imageStoragePath),
    }))
  );
  const filtersActive = hasActiveFilters(filters);
  const view: RecipeView = searchParams.view === "card" ? "card" : "list";
  const { cardHref, listHref } = buildViewHrefs(searchParams);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-8">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Recipes</h1>
        <div className="flex items-center gap-2">
          <RecipeViewToggle view={view} cardHref={cardHref} listHref={listHref} />
          <AddRecipeButton className="hidden sm:inline-flex" />
        </div>
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
        <RecipeResults recipes={recipes} view={view} />
      )}

      {recipes.length > 0 || filtersActive ? (
        <AddRecipeButton className="fixed right-4 bottom-20 sm:hidden" floating />
      ) : null}
    </div>
  );
}
