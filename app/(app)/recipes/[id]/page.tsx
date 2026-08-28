import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { EditRecipeFormDialog } from "@/components/recipes/recipe-form-dialog";
import { DeleteRecipeDialog } from "@/components/recipes/delete-recipe-dialog";
import { getRecipe } from "@/lib/recipes/actions";
import {
  CUISINE_LABELS,
  DIET_TYPE_LABELS,
  PREP_TIME_LABELS,
  STORAGE_TYPE_LABELS,
  CHILD_FRIENDLY_LABELS,
  PREPARATION_TYPE_LABELS,
} from "@/lib/constants/categories";

type RecipeDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata(props: RecipeDetailPageProps): Promise<Metadata> {
  const { id } = await props.params;
  const recipe = await getRecipe(id);
  return { title: recipe ? `${recipe.title} — Meal Planner` : "Recipe not found — Meal Planner" };
}

function formatIngredient(name: string, quantity: string | null): string {
  return quantity ? `${quantity} ${name}` : name;
}

export default async function RecipeDetailPage(props: RecipeDetailPageProps) {
  const { id } = await props.params;
  const recipe = await getRecipe(id);

  if (!recipe) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">{recipe.title}</h1>
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
        <Button variant="ghost" size="sm" render={<Link href="/recipes" />}>
          Back
        </Button>
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
        <h2 className="text-lg font-medium">Ingredients</h2>
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
            <h2 className="text-lg font-medium">Instructions</h2>
            <p className="whitespace-pre-line text-sm">{recipe.instructions}</p>
          </section>
        </>
      ) : null}

      <Separator />

      <div className="flex gap-2">
        <EditRecipeFormDialog
          recipe={recipe}
          trigger={<Button variant="outline">Edit recipe</Button>}
        />
        <DeleteRecipeDialog
          recipeId={recipe.id}
          recipeTitle={recipe.title}
          trigger={<Button variant="destructive">Delete recipe</Button>}
        />
      </div>
    </div>
  );
}
