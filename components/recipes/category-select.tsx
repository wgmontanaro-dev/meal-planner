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
  const placeholder = clearable
    ? `Any ${label.toLowerCase()}`
    : `Choose ${label.toLowerCase()}`;

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
          {/* Base UI renders the raw stored value here unless given a
              formatter, which is why an unmapped select shows e.g.
              "FROM_15_TO_30" instead of "15 to 30 minutes". */}
          <SelectValue placeholder={placeholder}>
            {(selected) => {
              const key = selected == null ? "" : String(selected);
              if (key === "" || key === ANY_VALUE) return placeholder;
              return labels[key] ?? key;
            }}
          </SelectValue>
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
