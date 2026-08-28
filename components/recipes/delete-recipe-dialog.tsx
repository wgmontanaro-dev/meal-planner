"use client";

import { useActionState, type ReactElement } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteRecipe } from "@/lib/recipes/actions";
import { initialDeleteRecipeState } from "@/lib/recipes/types";

export function DeleteRecipeDialog({
  recipeId,
  recipeTitle,
  trigger,
}: {
  recipeId: string;
  recipeTitle: string;
  trigger: ReactElement;
}) {
  const [state, formAction, pending] = useActionState(deleteRecipe, initialDeleteRecipeState);

  return (
    <AlertDialog>
      <AlertDialogTrigger render={trigger} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete &ldquo;{recipeTitle}&rdquo;?</AlertDialogTitle>
          <AlertDialogDescription>
            This cannot be undone. The recipe and its ingredients will be permanently removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {state.status === "error" ? (
          <p role="alert" className="text-sm text-destructive">
            {state.message}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <form action={formAction}>
            <input type="hidden" name="recipeId" value={recipeId} />
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "Deleting…" : "Delete"}
            </Button>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
