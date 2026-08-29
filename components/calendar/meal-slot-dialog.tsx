"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { Search } from "lucide-react";
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
import { toast } from "@/components/ui/toast";
import { FilterFields, type DraftFilters } from "@/components/recipes/filter-fields";
import { RecipeQuickView } from "@/components/calendar/recipe-quick-view";
import { FORM_DIALOG_CONTENT_CLASS } from "@/components/shared/dialog-classes";
import { setManualMeal, setRecipeMeal, removeMeal } from "@/lib/meal-plans/actions";
import { initialMealSlotState, type RecipeSummary } from "@/lib/meal-plans/types";
import { MANUAL_TITLE_MAX_LENGTH } from "@/lib/validation/meal-plan";
import { matchesFilters } from "@/lib/recipes/filter";
import { stockImageFor } from "@/lib/recipes/stock-image";
import { formatDateLong } from "@/lib/dates/calendar";
import type { MealPlanEntryWithRecipe } from "@/lib/database/types";

type DialogMode = "choose" | "actions" | "pick-recipe" | "manual-edit" | "view-recipe";

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
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (state.status === "success") {
      toast.add({ title: "Meal saved", type: "success" });
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

  const query = search.trim().toLowerCase();
  const visibleRecipes = recipes.filter(
    (recipe) =>
      matchesFilters(recipe, filters) &&
      (query === "" || recipe.title.toLowerCase().includes(query))
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="mealDate" value={mealDate} />
      <input type="hidden" name="slot" value={slot} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="recipe-picker-search">Search by title</Label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="recipe-picker-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              // Don't submit the form when pressing Enter in the search box.
              if (event.key === "Enter") event.preventDefault();
            }}
            placeholder="e.g. curry"
            className="pl-9"
          />
        </div>
      </div>

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
          No recipes match your search and filters.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-2">
          {visibleRecipes.map((recipe) => {
            const thumbSrc = recipe.imageUrls?.thumbUrl ?? stockImageFor(recipe).src;
            return (
              <li key={recipe.id}>
                <button
                  type="submit"
                  name="recipeId"
                  value={recipe.id}
                  disabled={pending}
                  className="flex h-full w-full flex-col gap-1.5 rounded-xl border border-border bg-card p-2 text-left transition-colors hover:border-primary focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-60"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- signed Storage URL or bundled SVG */}
                  <img
                    src={thumbSrc}
                    alt=""
                    className="h-16 w-full rounded-md object-cover"
                  />
                  <span className="line-clamp-2 text-xs font-medium text-foreground">
                    {recipe.title}
                  </span>
                </button>
              </li>
            );
          })}
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
      toast.add({ title: "Meal saved", type: "success" });
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
      toast.add({ title: "Meal removed", type: "success" });
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
  const { mealDate, slot, entry } = selected;
  // A back stack so every screen reached from the action menu can return one
  // step without closing the dialogue (SPEC.md section 18.1). "Cancel" shows
  // only on the first screen; deeper screens show "Back".
  const [stack, setStack] = useState<DialogMode[]>(() => (entry ? ["actions"] : ["choose"]));
  const mode = stack[stack.length - 1];
  const canGoBack = stack.length > 1;

  function push(next: DialogMode) {
    setStack((current) => [...current, next]);
  }
  function back() {
    setStack((current) => (current.length > 1 ? current.slice(0, -1) : current));
  }

  const backLink = (
    <button
      type="button"
      onClick={back}
      className="self-start text-sm text-primary underline-offset-4 hover:underline"
    >
      ‹ Back
    </button>
  );

  if (mode === "choose") {
    return (
      <div className="flex flex-col gap-2">
        <Button variant="outline" onClick={() => push("pick-recipe")}>
          Select from recipe library
        </Button>
        <Button variant="outline" onClick={() => push("manual-edit")}>
          Enter meal manually
        </Button>
        <Button variant="ghost" onClick={canGoBack ? back : onClose}>
          {canGoBack ? "Back" : "Cancel"}
        </Button>
      </div>
    );
  }

  if (mode === "pick-recipe") {
    return (
      <div className="flex flex-col gap-3">
        {backLink}
        <RecipePickerList recipes={recipes} mealDate={mealDate} slot={slot} onDone={onClose} />
      </div>
    );
  }

  if (mode === "manual-edit") {
    return (
      <div className="flex flex-col gap-3">
        {backLink}
        <ManualMealForm
          mealDate={mealDate}
          slot={slot}
          initialTitle={entry?.entryType === "manual" ? (entry.manualTitle ?? "") : ""}
          onDone={onClose}
        />
      </div>
    );
  }

  if (mode === "view-recipe" && entry?.recipeId) {
    return <RecipeQuickView recipeId={entry.recipeId} onBack={back} />;
  }

  // mode === "actions"
  if (!entry) {
    return null;
  }

  if (entry.entryType === "recipe") {
    return (
      <div className="flex flex-col gap-2">
        <Button variant="outline" onClick={() => push("view-recipe")}>
          View recipe
        </Button>
        <Button variant="outline" onClick={() => push("choose")}>
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
      <Button variant="outline" onClick={() => push("manual-edit")}>
        Edit title
      </Button>
      <Button variant="outline" onClick={() => push("choose")}>
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
