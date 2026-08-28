import { RecipeImageThumbnail } from "@/components/recipes/recipe-image";
import { Separator } from "@/components/ui/separator";
import {
  CUISINE_LABELS,
  DIET_TYPE_LABELS,
  PREP_TIME_LABELS,
  STORAGE_TYPE_LABELS,
  CHILD_FRIENDLY_LABELS,
  PREPARATION_TYPE_LABELS,
} from "@/lib/constants/categories";
import { stockImageFor } from "@/lib/recipes/stock-image";
import type { RecipeWithIngredients } from "@/lib/database/types";
import type { RecipeImageUrls } from "@/lib/images/types";

function formatIngredient(name: string, quantity: string | null): string {
  return quantity ? `${quantity} ${name}` : name;
}

/**
 * Read-only rendering of a recipe (image, categories, ingredients,
 * instructions). Shared by the recipe detail page and the calendar's
 * quick-view modal so the two never drift.
 */
export function RecipeDetailView({
  recipe,
  imageUrls,
  titleAs = "h2",
}: {
  recipe: RecipeWithIngredients;
  imageUrls: RecipeImageUrls | null;
  titleAs?: "h1" | "h2";
}) {
  const TitleTag = titleAs;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-4">
        <RecipeImageThumbnail
          urls={imageUrls}
          title={recipe.title}
          size="lg"
          fallback={stockImageFor(recipe)}
        />
        <div className="flex flex-col gap-1">
          <TitleTag className="text-2xl font-bold tracking-tight">{recipe.title}</TitleTag>
          {recipe.sourceUrl ? (
            <a
              href={recipe.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={recipe.sourceUrl}
              className="text-sm text-primary underline-offset-4 hover:underline"
            >
              View source
            </a>
          ) : null}
        </div>
      </div>

      {recipe.summaryDescription ? (
        <p className="text-muted-foreground">{recipe.summaryDescription}</p>
      ) : null}

      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <div>
          <dt className="text-muted-foreground">Preparation time</dt>
          <dd>{PREP_TIME_LABELS[recipe.prepTimeCategory]}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Cuisine</dt>
          <dd>{CUISINE_LABELS[recipe.cuisine]}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Storage type</dt>
          <dd>{STORAGE_TYPE_LABELS[recipe.storageType]}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Diet type</dt>
          <dd>{DIET_TYPE_LABELS[recipe.dietType]}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Child-friendly</dt>
          <dd>{CHILD_FRIENDLY_LABELS[recipe.childFriendly]}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Preparation</dt>
          <dd>{PREPARATION_TYPE_LABELS[recipe.preparationType]}</dd>
        </div>
      </div>

      <Separator />

      <section className="flex flex-col gap-2">
        <h3 className="text-lg font-medium">Ingredients</h3>
        <ul className="list-disc space-y-1 pl-5">
          {recipe.ingredients.map((ingredient) => (
            <li key={ingredient.id}>{formatIngredient(ingredient.name, ingredient.quantity)}</li>
          ))}
        </ul>
      </section>

      {recipe.instructions ? (
        <>
          <Separator />
          <section className="flex flex-col gap-2">
            <h3 className="text-lg font-medium">Instructions</h3>
            <p className="text-sm whitespace-pre-line">{recipe.instructions}</p>
          </section>
        </>
      ) : null}
    </div>
  );
}
