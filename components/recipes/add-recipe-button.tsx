"use client";

import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddRecipeFormDialog } from "@/components/recipes/recipe-form-dialog";
import { cn } from "@/lib/utils";

export function AddRecipeButton({
  className,
  floating,
}: {
  className?: string;
  floating?: boolean;
}) {
  return (
    <AddRecipeFormDialog
      trigger={
        floating ? (
          <Button
            size="icon-lg"
            className={cn("rounded-full shadow-lg", className)}
            aria-label="Add recipe"
          >
            <PlusIcon />
          </Button>
        ) : (
          <Button className={className}>
            <PlusIcon aria-hidden="true" />
            Add recipe
          </Button>
        )
      }
    />
  );
}
