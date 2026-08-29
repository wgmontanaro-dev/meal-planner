"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from "react";
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
import { RecipeImageThumbnail } from "@/components/recipes/recipe-image";
import { FORM_DIALOG_CONTENT_CLASS } from "@/components/shared/dialog-classes";
import {
  createRecipe,
  importRecipeFromUrlAction,
  updateRecipe,
} from "@/lib/recipes/actions";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  IMAGE_TYPE_MESSAGE,
  MAX_IMAGE_LABEL,
} from "@/lib/validation/image";
import type { RecipeImageUrls } from "@/lib/images/types";
import {
  initialImportRecipeState,
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
  WEEKNIGHT_FAVOURITE_LABELS,
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
  childFriendly: "",
  weeknightFavourite: "",
  preparationType: "",
  ingredients: [{ name: "", quantity: "" }],
};

/**
 * Native confirm shown when the recipe form is dismissed with unsaved edits
 * (SPEC.md section 13.6). Returns true when the user chooses to discard.
 * Exported so each dialog wrapper can guard its own dismissal paths.
 */
export function confirmDiscard(): boolean {
  return window.confirm("Discard your changes? Your edits will not be saved.");
}

export function recipeToFormValues(recipe: RecipeWithIngredients): RecipeFormValues {
  return {
    title: recipe.title,
    summaryDescription: recipe.summaryDescription ?? "",
    sourceUrl: recipe.sourceUrl ?? "",
    instructions: recipe.instructions ?? "",
    prepTimeCategory: recipe.prepTimeCategory ?? "",
    cuisine: recipe.cuisine ?? "",
    storageType: recipe.storageType ?? "",
    dietType: recipe.dietType ?? "",
    childFriendly: recipe.childFriendly ?? "",
    weeknightFavourite: recipe.weeknightFavourite ?? "",
    preparationType: recipe.preparationType ?? "",
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
  "weeknightFavourite",
  "preparationType",
  "instructions",
  "image",
] as const;

function ImageField({
  currentImage,
  recipeTitle,
  error,
  discoveredImageUrl,
}: {
  currentImage: RecipeImageUrls | null;
  recipeTitle: string;
  error?: string;
  discoveredImageUrl?: string | null;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-muted-foreground">Image</h3>

      {!currentImage && discoveredImageUrl ? (
        <div className="flex items-center gap-3 rounded-lg border border-dashed border-border p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={discoveredImageUrl}
            alt=""
            className="size-16 shrink-0 rounded object-cover"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
          <p className="text-xs text-muted-foreground">
            Found an image on the source page. It’ll be added when you save, unless you
            choose your own below.
          </p>
        </div>
      ) : null}

      {currentImage ? (
        <div className="flex items-center gap-3">
          <RecipeImageThumbnail urls={currentImage} title={recipeTitle} size="md" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="removeImage" className="size-4" />
            Remove current image
          </label>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="recipe-image">
          {currentImage ? "Replace image" : "Upload an image"} (optional)
        </Label>
        <Input
          id="recipe-image"
          name="image"
          type="file"
          accept={ALLOWED_IMAGE_MIME_TYPES.join(",")}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "recipe-image-error" : "recipe-image-hint"}
        />
        <p id="recipe-image-hint" className="text-xs text-muted-foreground">
          {IMAGE_TYPE_MESSAGE} Maximum {MAX_IMAGE_LABEL}.
        </p>
        {error ? (
          <p id="recipe-image-error" role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function FormFields({
  values,
  state,
  currentImage,
  recipeTitle,
  discoveredImageUrl,
  onDirty,
}: {
  values: RecipeFormValues;
  state: RecipeFormState;
  currentImage: RecipeImageUrls | null;
  recipeTitle: string;
  discoveredImageUrl?: string | null;
  onDirty: () => void;
}) {
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
        <IngredientEditor
          initialValues={values.ingredients}
          errors={state.ingredientErrors}
          onDirty={onDirty}
        />
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
          onValueChange={onDirty}
        />
        <CategorySelect
          id="recipe-cuisine"
          name="cuisine"
          label="Cuisine"
          options={CUISINES}
          labels={CUISINE_LABELS}
          defaultValue={values.cuisine || undefined}
          error={state.fieldErrors?.cuisine}
          onValueChange={onDirty}
        />
        <CategorySelect
          id="recipe-storageType"
          name="storageType"
          label="Storage type"
          options={STORAGE_TYPES}
          labels={STORAGE_TYPE_LABELS}
          defaultValue={values.storageType || undefined}
          error={state.fieldErrors?.storageType}
          onValueChange={onDirty}
        />
        <CategorySelect
          id="recipe-dietType"
          name="dietType"
          label="Diet type"
          options={DIET_TYPES}
          labels={DIET_TYPE_LABELS}
          defaultValue={values.dietType || undefined}
          error={state.fieldErrors?.dietType}
          onValueChange={onDirty}
        />
        <CategorySelect
          id="recipe-childFriendly"
          name="childFriendly"
          label="Child-friendly"
          options={TERNARY_CATEGORIES}
          labels={CHILD_FRIENDLY_LABELS}
          defaultValue={values.childFriendly || undefined}
          error={state.fieldErrors?.childFriendly}
          onValueChange={onDirty}
        />
        <CategorySelect
          id="recipe-weeknightFavourite"
          name="weeknightFavourite"
          label="Weeknight favourite"
          options={TERNARY_CATEGORIES}
          labels={WEEKNIGHT_FAVOURITE_LABELS}
          defaultValue={values.weeknightFavourite || undefined}
          error={state.fieldErrors?.weeknightFavourite}
          onValueChange={onDirty}
        />
        <CategorySelect
          id="recipe-preparationType"
          name="preparationType"
          label="Preparation type"
          options={PREPARATION_TYPES}
          labels={PREPARATION_TYPE_LABELS}
          defaultValue={values.preparationType || undefined}
          error={state.fieldErrors?.preparationType}
          onValueChange={onDirty}
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

      <Separator />

      <ImageField
        currentImage={currentImage}
        recipeTitle={recipeTitle}
        error={state.fieldErrors?.image}
        discoveredImageUrl={discoveredImageUrl}
      />
    </div>
  );
}

export function RecipeForm({
  action,
  submitLabel,
  pendingLabel,
  values,
  currentImage,
  recipeTitle,
  onClose,
  onDirtyChange,
  importedImageUrl,
}: {
  action: (state: RecipeFormState, formData: FormData) => Promise<RecipeFormState>;
  submitLabel: string;
  pendingLabel: string;
  values: RecipeFormValues;
  currentImage: RecipeImageUrls | null;
  recipeTitle: string;
  onClose: () => void;
  /** Reports whether the form has unsaved edits, so a wrapper dialog can
   *  guard its own Escape / backdrop / close-button dismissal. */
  onDirtyChange?: (dirty: boolean) => void;
  /** An image URL found by the "import from URL" flow, attached on save. */
  importedImageUrl?: string | null;
}) {
  const [state, formAction, pending] = useActionState(action, initialRecipeFormState);
  const currentValues = state.values ?? values;
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  // Cover a full-page unload (tab close, refresh) while edits are pending
  // (SPEC.md section 13.6). A server-action redirect is an RSC navigation,
  // not an unload, so `createRecipe`'s redirect does not trigger this.
  useEffect(() => {
    if (!dirty) return;
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // `updateRecipe` returns a success state instead of redirecting, so the
  // caller can close its dialog. (`createRecipe` still redirects, so this
  // never fires for the add form.) `onClose` here is the wrappers' raw
  // close, which bypasses the unsaved-changes guard — the save succeeded,
  // so there is nothing to discard. The dialog unmounting also tears down
  // the beforeunload listener below.
  useEffect(() => {
    if (state.status === "success") {
      onClose();
    }
  }, [state, onClose]);

  function requestClose() {
    if (dirty && !confirmDiscard()) return;
    onClose();
  }

  return (
    <form
      action={formAction}
      onChange={() => setDirty(true)}
      className="flex flex-col gap-6"
    >
      {importedImageUrl ? (
        <input type="hidden" name="importedImageUrl" value={importedImageUrl} />
      ) : null}
      <FormFields
        values={currentValues}
        state={state}
        currentImage={currentImage}
        recipeTitle={recipeTitle}
        discoveredImageUrl={importedImageUrl}
        onDirty={() => setDirty(true)}
      />
      {state.status === "error" && !state.fieldErrors ? (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      ) : null}
      <div className="-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={requestClose} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? pendingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}

type ImportedPayload = {
  values: RecipeFormValues;
  importedImageUrl: string | null;
  warnings: string[];
};

type AddStep =
  | { kind: "start" }
  | { kind: "manual" }
  | ({ kind: "imported" } & ImportedPayload);

/** First screen of the Add Recipe dialog: paste a link, or switch to manual. */
function AddRecipeStart({
  onImported,
  onManual,
}: {
  onImported: (payload: ImportedPayload) => void;
  onManual: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    importRecipeFromUrlAction,
    initialImportRecipeState
  );

  useEffect(() => {
    if (state.status === "success" && state.values) {
      onImported({
        values: state.values,
        importedImageUrl: state.importedImageUrl ?? null,
        warnings: state.warnings ?? [],
      });
    }
  }, [state, onImported]);

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} className="flex flex-col gap-3">
        <Label htmlFor="import-url">Recipe web address</Label>
        <Input
          id="import-url"
          name="url"
          type="url"
          inputMode="url"
          autoFocus
          defaultValue={state.url ?? ""}
          placeholder="https://example.com/best-lasagne"
          aria-invalid={state.status === "error"}
          aria-describedby={state.status === "error" ? "import-url-error" : "import-url-hint"}
        />
        <p id="import-url-hint" className="text-xs text-muted-foreground">
          The ingredients and method come first; the title, image, prep time, cuisine and
          diet type are filled in when the page provides them.
        </p>
        {state.status === "error" ? (
          <p id="import-url-error" role="alert" className="text-sm text-destructive">
            {state.message}
          </p>
        ) : null}
        <Button type="submit" disabled={pending} className="self-start">
          {pending ? "Fetching…" : "Import recipe"}
        </Button>
      </form>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <Separator className="flex-1" />
        or
        <Separator className="flex-1" />
      </div>

      <Button type="button" variant="outline" onClick={onManual} className="self-start">
        Enter the details manually
      </Button>
    </div>
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
  const [step, setStep] = useState<AddStep>({ kind: "start" });
  const dirtyRef = useRef(false);

  function closeNow() {
    dirtyRef.current = false;
    setStep({ kind: "start" });
    setOpen(false);
  }

  // The Dialog's own dismissal (Escape, backdrop, close button); guard here
  // since the form's Cancel button guards itself.
  function changeOpen(next: boolean) {
    if (!next) {
      if (dirtyRef.current && !confirmDiscard()) return;
      closeNow();
      return;
    }
    setOpen(true);
  }

  function backToStart() {
    dirtyRef.current = false;
    setStep({ kind: "start" });
  }

  const handleImported = useCallback((payload: ImportedPayload) => {
    setStep({ kind: "imported", ...payload });
  }, []);

  const description =
    step.kind === "imported"
      ? "Here’s what we could read from the page. Check it over, then save."
      : step.kind === "manual"
        ? "Add a recipe to the shared library so it can be planned on the calendar."
        : "Import a recipe from a web page, or enter the details yourself.";

  return (
    <Dialog open={isOpen} onOpenChange={changeOpen}>
      {trigger ? <DialogTrigger render={trigger} /> : null}
      <DialogContent className={FORM_DIALOG_CONTENT_CLASS}>
        <div className="flex flex-col gap-6 p-4">
          <DialogHeader>
            <DialogTitle>
              {step.kind === "imported" ? "Review imported recipe" : "Add recipe"}
            </DialogTitle>
            <DialogDescription>{description}</DialogDescription>
            {step.kind !== "start" ? (
              <button
                type="button"
                onClick={backToStart}
                className="self-start text-sm text-primary underline-offset-4 hover:underline"
              >
                ‹ Back
              </button>
            ) : null}
          </DialogHeader>

          {!isOpen ? null : step.kind === "start" ? (
            <AddRecipeStart onImported={handleImported} onManual={() => setStep({ kind: "manual" })} />
          ) : step.kind === "imported" ? (
            <>
              {step.warnings.length > 0 ? (
                <ul className="flex flex-col gap-1 rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
                  {step.warnings.map((warning) => (
                    <li key={warning}>• {warning}</li>
                  ))}
                </ul>
              ) : null}
              <RecipeForm
                action={createRecipe}
                submitLabel="Save recipe"
                pendingLabel="Saving…"
                values={step.values}
                currentImage={null}
                recipeTitle={step.values.title}
                importedImageUrl={step.importedImageUrl}
                onClose={closeNow}
                onDirtyChange={(next) => {
                  dirtyRef.current = next;
                }}
              />
            </>
          ) : (
            <RecipeForm
              action={createRecipe}
              submitLabel="Save recipe"
              pendingLabel="Saving…"
              values={EMPTY_VALUES}
              currentImage={null}
              recipeTitle=""
              onClose={closeNow}
              onDirtyChange={(next) => {
                dirtyRef.current = next;
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function EditRecipeFormDialog({
  recipe,
  imageUrls,
  trigger,
  open,
  onOpenChange,
}: {
  recipe: RecipeWithIngredients;
  imageUrls: RecipeImageUrls | null;
  trigger?: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const boundUpdateRecipe = updateRecipe.bind(null, recipe.id);
  const dirtyRef = useRef(false);

  function handleOpenChange(next: boolean) {
    if (!next && dirtyRef.current && !confirmDiscard()) return;
    setOpen(next);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
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
              currentImage={imageUrls}
              recipeTitle={recipe.title}
              onClose={() => setOpen(false)}
              onDirtyChange={(next) => {
                dirtyRef.current = next;
              }}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
