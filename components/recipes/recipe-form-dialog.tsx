"use client";

import { useActionState, useEffect, useRef, useState, type ReactElement } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { CategorySelect } from "@/components/recipes/category-select";
import { IngredientEditor } from "@/components/recipes/ingredient-editor";
import { FORM_DIALOG_CONTENT_CLASS } from "@/components/shared/dialog-classes";
import { createRecipe, updateRecipe } from "@/lib/recipes/actions";
import {
  initialRecipeFormState,
  type RecipeFormState,
  type RecipeFormValues,
} from "@/lib/recipes/types";
import {
  CUISINE_LABELS,
  CUISINES,
  DIET_TYPE_LABELS,
  DIET_TYPES,
  PREPARATION_TYPE_LABELS,
  PREPARATION_TYPES,
  PREP_TIME_CATEGORIES,
  PREP_TIME_LABELS,
  STORAGE_TYPE_LABELS,
  STORAGE_TYPES,
  CHILD_FRIENDLY_LABELS,
  TERNARY_CATEGORIES,
} from "@/lib/constants/categories";
import type { RecipeWithIngredients } from "@/lib/database/types";

const EMPTY_VALUES: RecipeFormValues = {
  title: "",
  summaryDescription: "",
  sourceUrl: "",
  instructions: "",
  prepTimeCategory: "",
  cuisine: "",
  storageType: "",
  dietType: "",
  childFriendly: "NOT_SPECIFIED",
  preparationType: "NOT_SPECIFIED",
  ingredients: [{ name: "", quantity: "" }],
};

function recipeToFormValues(recipe: RecipeWithIngredients): RecipeFormValues {
  return {
    title: recipe.title,
    summaryDescription: recipe.summaryDescription ?? "",
    sourceUrl: recipe.sourceUrl ?? "",
    instructions: recipe.instructions ?? "",
    prepTimeCategory: recipe.prepTimeCategory,
    cuisine: recipe.cuisine,
    storageType: recipe.storageType,
    dietType: recipe.dietType,
    childFriendly: recipe.childFriendly,
    preparationType: recipe.preparationType,
    ingredients:
      recipe.ingredients.length > 0
        ? recipe.ingredients.map((ingredient) => ({
            name: ingredient.name,
            quantity: ingredient.quantity ?? "",
          }))
        : [{ name: "", quantity: "" }],
  };
}

// Order in which fields are checked to decide where focus lands after a
// failed submission (SPEC.md section 13.5: move focus to the first
// invalid field).
const FIELD_FOCUS_ORDER = [
  "title",
  "sourceUrl",
  "summaryDescription",
  "ingredients",
  "prepTimeCategory",
  "cuisine",
  "storageType",
  "dietType",
  "childFriendly",
  "preparationType",
  "instructions",
] as const;

function FormFields({ values, state }: { values: RecipeFormValues; state: RecipeFormState }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status !== "error" || !containerRef.current) {
      return;
    }
    const firstInvalidField = FIELD_FOCUS_ORDER.find(
      (field) => state.fieldErrors?.[field] || (field === "ingredients" && state.ingredientErrors)
    );
    if (!firstInvalidField) {
      return;
    }
    const target = containerRef.current.querySelector<HTMLElement>(
      firstInvalidField === "ingredients"
        ? '[name="ingredientName"]'
        : `#recipe-${firstInvalidField}`
    );
    target?.focus();
  }, [state]);

  return (
    <div ref={containerRef} className="flex flex-col gap-6">
      <section className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-muted-foreground">Basic details</h3>

        <div className="flex flex-col gap-2">
          <Label htmlFor="recipe-title">Title</Label>
          <Input
            id="recipe-title"
            name="title"
            required
            defaultValue={values.title}
            aria-invalid={Boolean(state.fieldErrors?.title)}
            aria-describedby={state.fieldErrors?.title ? "recipe-title-error" : undefined}
          />
          {state.fieldErrors?.title ? (
            <p id="recipe-title-error" role="alert" className="text-sm text-destructive">
              {state.fieldErrors.title}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="recipe-sourceUrl">Source URL</Label>
          <Input
            id="recipe-sourceUrl"
            name="sourceUrl"
            type="url"
            placeholder="https://example.com/recipe"
            defaultValue={values.sourceUrl}
            aria-invalid={Boolean(state.fieldErrors?.sourceUrl)}
            aria-describedby={state.fieldErrors?.sourceUrl ? "recipe-sourceUrl-error" : undefined}
          />
          {state.fieldErrors?.sourceUrl ? (
            <p id="recipe-sourceUrl-error" role="alert" className="text-sm text-destructive">
              {state.fieldErrors.sourceUrl}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="recipe-summaryDescription">Summary description</Label>
          <Textarea
            id="recipe-summaryDescription"
            name="summaryDescription"
            defaultValue={values.summaryDescription}
            aria-invalid={Boolean(state.fieldErrors?.summaryDescription)}
            aria-describedby={
              state.fieldErrors?.summaryDescription ? "recipe-summaryDescription-error" : undefined
            }
          />
          {state.fieldErrors?.summaryDescription ? (
            <p
              id="recipe-summaryDescription-error"
              role="alert"
              className="text-sm text-destructive"
            >
              {state.fieldErrors.summaryDescription}
            </p>
          ) : null}
        </div>
      </section>

      <Separator />

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-muted-foreground">Ingredients</h3>
        <IngredientEditor initialValues={values.ingredients} errors={state.ingredientErrors} />
        {state.fieldErrors?.ingredients ? (
          <p role="alert" className="text-sm text-destructive">
            {state.fieldErrors.ingredients}
          </p>
        ) : null}
      </section>

      <Separator />

      <section className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-muted-foreground">Categories</h3>
        <CategorySelect
          id="recipe-prepTimeCategory"
          name="prepTimeCategory"
          label="Preparation time"
          options={PREP_TIME_CATEGORIES}
          labels={PREP_TIME_LABELS}
          defaultValue={values.prepTimeCategory || undefined}
          error={state.fieldErrors?.prepTimeCategory}
        />
        <CategorySelect
          id="recipe-cuisine"
          name="cuisine"
          label="Cuisine"
          options={CUISINES}
          labels={CUISINE_LABELS}
          defaultValue={values.cuisine || undefined}
          error={state.fieldErrors?.cuisine}
        />
        <CategorySelect
          id="recipe-storageType"
          name="storageType"
          label="Storage type"
          options={STORAGE_TYPES}
          labels={STORAGE_TYPE_LABELS}
          defaultValue={values.storageType || undefined}
          error={state.fieldErrors?.storageType}
        />
        <CategorySelect
          id="recipe-dietType"
          name="dietType"
          label="Diet type"
          options={DIET_TYPES}
          labels={DIET_TYPE_LABELS}
          defaultValue={values.dietType || undefined}
          error={state.fieldErrors?.dietType}
        />
        <CategorySelect
          id="recipe-childFriendly"
          name="childFriendly"
          label="Child-friendly"
          options={TERNARY_CATEGORIES}
          labels={CHILD_FRIENDLY_LABELS}
          defaultValue={values.childFriendly || "NOT_SPECIFIED"}
          error={state.fieldErrors?.childFriendly}
        />
        <CategorySelect
          id="recipe-preparationType"
          name="preparationType"
          label="Preparation type"
          options={PREPARATION_TYPES}
          labels={PREPARATION_TYPE_LABELS}
          defaultValue={values.preparationType || "NOT_SPECIFIED"}
          error={state.fieldErrors?.preparationType}
        />
      </section>

      <Separator />

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-muted-foreground">Instructions</h3>
        <Label htmlFor="recipe-instructions" className="sr-only">
          Instructions
        </Label>
        <Textarea
          id="recipe-instructions"
          name="instructions"
          rows={6}
          defaultValue={values.instructions}
          aria-invalid={Boolean(state.fieldErrors?.instructions)}
          aria-describedby={
            state.fieldErrors?.instructions ? "recipe-instructions-error" : undefined
          }
        />
        {state.fieldErrors?.instructions ? (
          <p id="recipe-instructions-error" role="alert" className="text-sm text-destructive">
            {state.fieldErrors.instructions}
          </p>
        ) : null}
      </section>
    </div>
  );
}

function RecipeForm({
  action,
  submitLabel,
  pendingLabel,
  values,
  onClose,
}: {
  action: (state: RecipeFormState, formData: FormData) => Promise<RecipeFormState>;
  submitLabel: string;
  pendingLabel: string;
  values: RecipeFormValues;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, initialRecipeFormState);
  const currentValues = state.values ?? values;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <FormFields values={currentValues} state={state} />
      {state.status === "error" && !state.fieldErrors ? (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      ) : null}
      <div className="-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? pendingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}

export function AddRecipeFormDialog({
  trigger,
  open,
  onOpenChange,
}: {
  trigger?: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger render={trigger} /> : null}
      <DialogContent
        className={FORM_DIALOG_CONTENT_CLASS}
      >
        <div className="flex flex-col gap-6 p-4">
          <DialogHeader>
            <DialogTitle>Add recipe</DialogTitle>
            <DialogDescription>
              Add a recipe to the shared library so it can be planned on the calendar.
            </DialogDescription>
          </DialogHeader>
          {isOpen ? (
            <RecipeForm
              action={createRecipe}
              submitLabel="Save recipe"
              pendingLabel="Saving…"
              values={EMPTY_VALUES}
              onClose={() => setOpen(false)}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function EditRecipeFormDialog({
  recipe,
  trigger,
  open,
  onOpenChange,
}: {
  recipe: RecipeWithIngredients;
  trigger?: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const boundUpdateRecipe = updateRecipe.bind(null, recipe.id);

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger render={trigger} /> : null}
      <DialogContent
        className={FORM_DIALOG_CONTENT_CLASS}
      >
        <div className="flex flex-col gap-6 p-4">
          <DialogHeader>
            <DialogTitle>Edit recipe</DialogTitle>
            <DialogDescription>Update this recipe&apos;s details.</DialogDescription>
          </DialogHeader>
          {isOpen ? (
            <RecipeForm
              action={boundUpdateRecipe}
              submitLabel="Save changes"
              pendingLabel="Saving…"
              values={recipeToFormValues(recipe)}
              onClose={() => setOpen(false)}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
