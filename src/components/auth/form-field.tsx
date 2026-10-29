"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormFieldProps = React.ComponentProps<"input"> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
};

// Visible label, error text tied to the field, no placeholder-only labels
// (docs/ui-ux-guide.md accessibility checklist).
export function FormField({ id, label, hint, error, ...inputProps }: FormFieldProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        {...inputProps}
      />
      {hint ? (
        <p id={hintId} className="text-sm leading-5 text-ink-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-sm leading-5 font-medium text-signal">
          {error}
        </p>
      ) : null}
    </div>
  );
}
