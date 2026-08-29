"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FORM_DIALOG_CONTENT_CLASS } from "@/components/shared/dialog-classes";
import {
  RecipeForm,
  confirmDiscard,
  recipeToFormValues,
} from "@/components/recipes/recipe-form-dialog";
import { getRecipeForModal, updateRecipe } from "@/lib/recipes/actions";
import type { RecipeWithIngredients } from "@/lib/database/types";
import type { RecipeImageUrls } from "@/lib/images/types";

type ModalState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; recipe: RecipeWithIngredients; imageUrls: RecipeImageUrls | null };

/**
 * Edits a recipe in place from the recipe list. Loads the full recipe on
 * mount, then shows the shared recipe form; closes on save (the form's
 * success effect) or when the dialog is dismissed.
 */
export function RecipeEditModal({
  recipeId,
  onClose,
}: {
  recipeId: string;
  onClose: () => void;
}) {
  const [state, setState] = useState<ModalState>({ status: "loading" });
  const dirtyRef = useRef(false);

  useEffect(() => {
    let active = true;
    getRecipeForModal(recipeId).then(
      (data) => {
        if (active) setState(data ? { status: "ready", ...data } : { status: "error" });
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
    <Dialog
      open
      onOpenChange={(next) => {
        if (next) return;
        if (dirtyRef.current && !confirmDiscard()) return;
        onClose();
      }}
    >
      <DialogContent className={FORM_DIALOG_CONTENT_CLASS}>
        <div className="flex flex-col gap-6 p-4">
          <DialogHeader>
            <DialogTitle>
              {state.status === "ready" ? `Edit ${state.recipe.title}` : "Edit recipe"}
            </DialogTitle>
            <DialogDescription>
              Make your changes and save, or close this dialog to discard them.
            </DialogDescription>
          </DialogHeader>

          {state.status === "loading" ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Loading recipe…</p>
          ) : state.status === "error" ? (
            <p role="alert" className="py-10 text-center text-sm text-destructive">
              This recipe could not be loaded. It may have been deleted.
            </p>
          ) : (
            <>
              <RecipeForm
                action={updateRecipe.bind(null, recipeId)}
                submitLabel="Save changes"
                pendingLabel="Saving…"
                values={recipeToFormValues(state.recipe)}
                currentImage={state.imageUrls}
                recipeTitle={state.recipe.title}
                onClose={onClose}
                onDirtyChange={(next) => {
                  dirtyRef.current = next;
                }}
              />
              <div className="text-center">
                <Button
                  variant="link"
                  size="sm"
                  render={
                    <Link
                      href={`/recipes/${recipeId}`}
                      onClick={(event) => {
                        if (dirtyRef.current && !confirmDiscard()) event.preventDefault();
                      }}
                    />
                  }
                >
                  Open full page (view or delete)
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
