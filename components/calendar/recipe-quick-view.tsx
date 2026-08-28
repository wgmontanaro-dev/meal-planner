"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecipeDetailView } from "@/components/recipes/recipe-detail-view";
import { getRecipeForModal } from "@/lib/recipes/actions";
import type { RecipeWithIngredients } from "@/lib/database/types";
import type { RecipeImageUrls } from "@/lib/images/types";

type QuickViewState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; recipe: RecipeWithIngredients; imageUrls: RecipeImageUrls | null };

/**
 * Loads and shows a recipe read-only inside the meal-slot dialog, so the
 * user can check a planned recipe without leaving the calendar.
 */
export function RecipeQuickView({
  recipeId,
  onBack,
}: {
  recipeId: string;
  onBack: () => void;
}) {
  const [state, setState] = useState<QuickViewState>({ status: "loading" });

  useEffect(() => {
    // The component mounts fresh each time "View recipe" is chosen, so the
    // initial "loading" state is enough — no reset needed here.
    let active = true;
    getRecipeForModal(recipeId).then(
      (data) => {
        if (!active) return;
        setState(data ? { status: "ready", ...data } : { status: "error" });
      },
      () => {
        if (active) setState({ status: "error" });
      }
    );
    return () => {
      active = false;
    };
  }, [recipeId]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft aria-hidden="true" />
          Back
        </Button>
        <Button variant="outline" size="sm" render={<Link href={`/recipes/${recipeId}`} />}>
          Open full page
        </Button>
      </div>

      {state.status === "loading" ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Loading recipe…</p>
      ) : state.status === "error" ? (
        <p role="alert" className="py-10 text-center text-sm text-destructive">
          This recipe could not be loaded. It may have been deleted.
        </p>
      ) : (
        <RecipeDetailView recipe={state.recipe} imageUrls={state.imageUrls} titleAs="h2" />
      )}
    </div>
  );
}
