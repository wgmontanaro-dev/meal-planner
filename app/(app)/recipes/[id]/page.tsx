import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { EditRecipeFormDialog } from "@/components/recipes/recipe-form-dialog";
import { DeleteRecipeDialog } from "@/components/recipes/delete-recipe-dialog";
import { RecipeDetailView } from "@/components/recipes/recipe-detail-view";
import { getRecipe } from "@/lib/recipes/actions";
import { signRecipeImageUrls } from "@/lib/images/urls";

type RecipeDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata(props: RecipeDetailPageProps): Promise<Metadata> {
  const { id } = await props.params;
  const recipe = await getRecipe(id);
  return { title: recipe ? `${recipe.title} — Meal Planner` : "Recipe not found — Meal Planner" };
}

export default async function RecipeDetailPage(props: RecipeDetailPageProps) {
  const { id } = await props.params;
  const recipe = await getRecipe(id);

  if (!recipe) {
    notFound();
  }

  const imageUrls = await signRecipeImageUrls(recipe.imageStoragePath);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-8">
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" render={<Link href="/recipes" />}>
          Back
        </Button>
      </div>

      <RecipeDetailView recipe={recipe} imageUrls={imageUrls} titleAs="h1" />

      <Separator />

      <div className="flex gap-2">
        <EditRecipeFormDialog
          recipe={recipe}
          imageUrls={imageUrls}
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
