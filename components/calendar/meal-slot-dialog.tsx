"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FilterFields, type DraftFilters } from "@/components/recipes/filter-fields";
import { FORM_DIALOG_CONTENT_CLASS } from "@/components/shared/dialog-classes";
import { setManualMeal, setRecipeMeal, removeMeal } from "@/lib/meal-plans/actions";
import { initialMealSlotState, type RecipeSummary } from "@/lib/meal-plans/types";
import { MANUAL_TITLE_MAX_LENGTH } from "@/lib/validation/meal-plan";
import { matchesFilters } from "@/lib/recipes/filter";
import { formatDateLong } from "@/lib/dates/calendar";
import {
  CUISINE_LABELS,
  DIET_TYPE_LABELS,
  PREP_TIME_LABELS,
} from "@/lib/constants/categories";
import type { MealPlanEntryWithRecipe } from "@/lib/database/types";

type DialogMode = "choose" | "actions" | "pick-recipe" | "manual-edit";

export type SelectedSlot = {
  mealDate: string;
  slot: 1 | 2;
  entry: MealPlanEntryWithRecipe | null;
};

function slotLabel(slot: 1 | 2): string {
  return slot === 1 ? "Meal 1" : "Meal 2";
}

function RecipePickerList({
  recipes,
  mealDate,
  slot,
  onDone,
}: {
  recipes: RecipeSummary[];
  mealDate: string;
  slot: 1 | 2;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(setRecipeMeal, initialMealSlotState);
  const [filters, setFilters] = useState<DraftFilters>({});

  useEffect(() => {
    if (state.status === "success") {
      onDone();
    }
  }, [state, onDone]);

  if (recipes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <p className="text-sm text-muted-foreground">
          You don&apos;t have any recipes yet. Add one to the library, then come back to assign it
          to this meal.
        </p>
        <Button render={<Link href="/recipes" />}>Go to recipes</Button>
      </div>
    );
  }

  const visibleRecipes = recipes.filter((recipe) => matchesFilters(recipe, filters));

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="mealDate" value={mealDate} />
      <input type="hidden" name="slot" value={slot} />

      <FilterFields
        filters={filters}
        onChange={(key, value) => setFilters((current) => ({ ...current, [key]: value }))}
      />

      {state.status === "error" ? (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      ) : null}

      {visibleRecipes.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No recipes match these filters.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visibleRecipes.map((recipe) => (
            <li key={recipe.id}>
              <Button
                type="submit"
                name="recipeId"
                value={recipe.id}
                variant="outline"
                disabled={pending}
                className="h-auto w-full flex-col items-start gap-1 whitespace-normal px-3 py-2 text-left"
              >
                <span className="font-medium">{recipe.title}</span>
                <span className="flex flex-wrap gap-1">
                  <Badge variant="outline">{PREP_TIME_LABELS[recipe.prepTimeCategory]}</Badge>
                  <Badge variant="outline">{CUISINE_LABELS[recipe.cuisine]}</Badge>
                  <Badge variant="outline">{DIET_TYPE_LABELS[recipe.dietType]}</Badge>
                </span>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}

function ManualMealForm({
  mealDate,
  slot,
  initialTitle,
  onDone,
}: {
  mealDate: string;
  slot: 1 | 2;
  initialTitle: string;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(setManualMeal, initialMealSlotState);

  useEffect(() => {
    if (state.status === "success") {
      onDone();
    }
  }, [state, onDone]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="mealDate" value={mealDate} />
      <input type="hidden" name="slot" value={slot} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="manual-meal-title">Meal title</Label>
        <Input
          id="manual-meal-title"
          name="manualTitle"
          required
          maxLength={MANUAL_TITLE_MAX_LENGTH}
          defaultValue={initialTitle}
          placeholder="e.g. Dinner out"
          aria-invalid={Boolean(state.fieldErrors?.manualTitle)}
          aria-describedby={state.fieldErrors?.manualTitle ? "manual-meal-title-error" : undefined}
        />
        {state.fieldErrors?.manualTitle ? (
          <p id="manual-meal-title-error" role="alert" className="text-sm text-destructive">
            {state.fieldErrors.manualTitle}
          </p>
        ) : null}
      </div>

      {state.status === "error" && !state.fieldErrors ? (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save meal"}
        </Button>
      </div>
    </form>
  );
}

function RemoveMealButton({
  mealDate,
  slot,
  onDone,
}: {
  mealDate: string;
  slot: 1 | 2;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(removeMeal, initialMealSlotState);

  useEffect(() => {
    if (state.status === "success") {
      onDone();
    }
  }, [state, onDone]);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="mealDate" value={mealDate} />
      <input type="hidden" name="slot" value={slot} />
      {state.status === "error" ? (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      ) : null}
      <Button type="submit" variant="destructive" disabled={pending} className="w-full">
        {pending ? "Removing…" : "Remove meal"}
      </Button>
    </form>
  );
}

function DialogBody({
  selected,
  recipes,
  onClose,
}: {
  selected: SelectedSlot;
  recipes: RecipeSummary[];
  onClose: () => void;
}) {
  const [mode, setMode] = useState<DialogMode>(selected.entry ? "actions" : "choose");
  const { mealDate, slot, entry } = selected;

  if (mode === "choose") {
    return (
      <div className="flex flex-col gap-2">
        <Button variant="outline" onClick={() => setMode("pick-recipe")}>
          Select from recipe library
        </Button>
        <Button variant="outline" onClick={() => setMode("manual-edit")}>
          Enter meal manually
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
    );
  }

  if (mode === "pick-recipe") {
    return <RecipePickerList recipes={recipes} mealDate={mealDate} slot={slot} onDone={onClose} />;
  }

  if (mode === "manual-edit") {
    return (
      <ManualMealForm
        mealDate={mealDate}
        slot={slot}
        initialTitle={entry?.entryType === "manual" ? (entry.manualTitle ?? "") : ""}
        onDone={onClose}
      />
    );
  }

  // mode === "actions"
  if (!entry) {
    return null;
  }

  if (entry.entryType === "recipe") {
    return (
      <div className="flex flex-col gap-2">
        <Button render={<Link href={`/recipes/${entry.recipeId}`} />} variant="outline">
          View recipe
        </Button>
        <Button variant="outline" onClick={() => setMode("choose")}>
          Replace meal
        </Button>
        <RemoveMealButton mealDate={mealDate} slot={slot} onDone={onClose} />
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button variant="outline" onClick={() => setMode("manual-edit")}>
        Edit title
      </Button>
      <Button variant="outline" onClick={() => setMode("choose")}>
        Replace meal
      </Button>
      <RemoveMealButton mealDate={mealDate} slot={slot} onDone={onClose} />
      <Button variant="ghost" onClick={onClose}>
        Cancel
      </Button>
    </div>
  );
}

export function MealSlotDialog({
  selected,
  recipes,
  onOpenChange,
}: {
  selected: SelectedSlot | null;
  recipes: RecipeSummary[];
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={selected !== null} onOpenChange={onOpenChange}>
      <DialogContent className={FORM_DIALOG_CONTENT_CLASS}>
        <div className="flex flex-col gap-6 p-4">
          <DialogHeader>
            <DialogTitle>
              {selected ? `${slotLabel(selected.slot)} — ${formatDateLong(selected.mealDate)}` : ""}
            </DialogTitle>
            <DialogDescription>
              {selected?.entry
                ? "View, replace or remove this meal."
                : "Choose how to fill this meal slot."}
            </DialogDescription>
          </DialogHeader>
          {selected ? (
            <DialogBody
              key={`${selected.mealDate}-${selected.slot}`}
              selected={selected}
              recipes={recipes}
              onClose={() => onOpenChange(false)}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
