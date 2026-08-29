"use client";

import { useId, useState } from "react";
import { ArrowDownIcon, ArrowUpIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type IngredientRow = { key: string; name: string; quantity: string };

let nextRowKey = 0;
function createRowKey(): string {
  nextRowKey += 1;
  return `row-${nextRowKey}`;
}

function toRows(values: { name: string; quantity: string }[]): IngredientRow[] {
  if (values.length === 0) {
    return [{ key: createRowKey(), name: "", quantity: "" }];
  }
  return values.map((value) => ({ key: createRowKey(), ...value }));
}

export function IngredientEditor({
  initialValues,
  errors,
  onDirty,
}: {
  initialValues: { name: string; quantity: string }[];
  errors?: Record<number, string>;
  /** Called on any structural change (add / remove / reorder) so the parent
   *  form can track unsaved edits; typing is caught by the form itself. */
  onDirty?: () => void;
}) {
  const [rows, setRows] = useState<IngredientRow[]>(() => toRows(initialValues));
  const legendId = useId();

  function updateRow(index: number, patch: Partial<IngredientRow>) {
    setRows((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row))
    );
  }

  function addRow() {
    setRows((current) => [...current, { key: createRowKey(), name: "", quantity: "" }]);
    onDirty?.();
  }

  function removeRow(index: number) {
    setRows((current) => {
      if (current.length <= 1) {
        return current;
      }
      return current.filter((_, rowIndex) => rowIndex !== index);
    });
    onDirty?.();
  }

  function moveRow(index: number, direction: -1 | 1) {
    setRows((current) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }
      const next = [...current];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    onDirty?.();
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend id={legendId} className="text-sm font-medium">
        Ingredients
      </legend>
      <div className="flex flex-col gap-3">
        {rows.map((row, index) => {
          const rowError = errors?.[index];
          const nameErrorId = `ingredient-${row.key}-error`;
          return (
            <div key={row.key} className="flex flex-col gap-1">
              <div className="flex items-start gap-2">
                <div className="flex flex-1 flex-col gap-1">
                  <Label htmlFor={`ingredient-name-${row.key}`} className="sr-only">
                    Ingredient name
                  </Label>
                  <Input
                    id={`ingredient-name-${row.key}`}
                    name="ingredientName"
                    placeholder="Ingredient name"
                    value={row.name}
                    onChange={(event) => updateRow(index, { name: event.target.value })}
                    aria-invalid={Boolean(rowError)}
                    aria-describedby={rowError ? nameErrorId : undefined}
                  />
                </div>
                <div className="flex w-28 flex-col gap-1 sm:w-36">
                  <Label htmlFor={`ingredient-quantity-${row.key}`} className="sr-only">
                    Quantity
                  </Label>
                  <Input
                    id={`ingredient-quantity-${row.key}`}
                    name="ingredientQuantity"
                    placeholder="Quantity"
                    value={row.quantity}
                    onChange={(event) => updateRow(index, { quantity: event.target.value })}
                  />
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => moveRow(index, -1)}
                    disabled={index === 0}
                    aria-label="Move ingredient up"
                  >
                    <ArrowUpIcon />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => moveRow(index, 1)}
                    disabled={index === rows.length - 1}
                    aria-label="Move ingredient down"
                  >
                    <ArrowDownIcon />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeRow(index)}
                    disabled={rows.length <= 1}
                    aria-label="Remove ingredient"
                  >
                    <XIcon />
                  </Button>
                </div>
              </div>
              {rowError ? (
                <p id={nameErrorId} role="alert" className="text-sm text-destructive">
                  {rowError}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={addRow} className="self-start">
        Add ingredient
      </Button>
    </fieldset>
  );
}
