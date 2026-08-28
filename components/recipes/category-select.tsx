"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ANY_VALUE = "__any__";

export function CategorySelect({
  id,
  name,
  label,
  options,
  labels,
  defaultValue,
  value,
  onValueChange,
  clearable,
  error,
}: {
  id: string;
  name: string;
  label: string;
  options: readonly string[];
  labels: Record<string, string>;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string | undefined) => void;
  /** Adds an "Any" option that clears the filter. Used by recipe filters, not the recipe form. */
  clearable?: boolean;
  error?: string;
}) {
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Select
        name={clearable ? undefined : name}
        defaultValue={value === undefined ? defaultValue : undefined}
        value={value === undefined ? undefined : (value ?? ANY_VALUE)}
        onValueChange={
          onValueChange
            ? (nextValue) =>
                onValueChange(nextValue === ANY_VALUE ? undefined : (nextValue as string))
            : undefined
        }
      >
        <SelectTrigger
          id={id}
          className="w-full"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
        >
          <SelectValue placeholder={`Choose ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {clearable ? <SelectItem value={ANY_VALUE}>Any {label.toLowerCase()}</SelectItem> : null}
          {options.map((optionValue) => (
            <SelectItem key={optionValue} value={optionValue}>
              {labels[optionValue]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
