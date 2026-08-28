"use client";

import { Refrigerator } from "lucide-react";
import { RecipeImageThumbnail } from "@/components/recipes/recipe-image";
import {
  CUISINE_LABELS,
  DIET_TYPE_LABELS,
  STORAGE_TYPE_LABELS,
} from "@/lib/constants/categories";
import { stockImageFor } from "@/lib/recipes/stock-image";
import type { RecipeWithImage } from "@/lib/recipes/types";

function SourceLink({ sourceUrl }: { sourceUrl: string | null }) {
  if (!sourceUrl) {
    return <span className="text-[0.7rem] text-muted-foreground">No source</span>;
  }
  return (
    <a
      href={sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={sourceUrl}
      className="text-[0.7rem] font-medium text-primary underline-offset-4 hover:underline"
    >
      View source
    </a>
  );
}

function RecipeCard({
  recipe,
  onEdit,
}: {
  recipe: RecipeWithImage;
  onEdit: (recipeId: string) => void;
}) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-colors hover:border-primary">
      <RecipeImageThumbnail
        urls={recipe.imageUrls}
        title={recipe.title}
        size="cover"
        fallback={stockImageFor(recipe)}
        className="aspect-auto h-24"
      />

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <button
          type="button"
          onClick={() => onEdit(recipe.id)}
          className="line-clamp-2 text-left font-heading text-sm leading-snug font-semibold underline-offset-4 hover:text-primary hover:underline"
        >
          {recipe.title}
        </button>

        <div className="flex flex-wrap gap-1">
          <span className="rounded bg-primary-container px-1.5 py-0.5 text-[0.65rem] font-medium text-primary-container-foreground">
            {DIET_TYPE_LABELS[recipe.dietType]}
          </span>
          <span className="rounded bg-secondary px-1.5 py-0.5 text-[0.65rem] text-secondary-foreground">
            {CUISINE_LABELS[recipe.cuisine]}
          </span>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-[0.7rem] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Refrigerator className="size-3" aria-hidden="true" />
            {STORAGE_TYPE_LABELS[recipe.storageType]}
          </span>
          <SourceLink sourceUrl={recipe.sourceUrl} />
        </div>
      </div>
    </article>
  );
}

export function RecipeLibrary({
  recipes,
  onEdit,
}: {
  recipes: RecipeWithImage[];
  onEdit: (recipeId: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {recipes.map((recipe) => (
        <RecipeCard key={recipe.id} recipe={recipe} onEdit={onEdit} />
      ))}
    </div>
  );
}
