"use client";

import * as React from "react";
import { FieldError, FieldHint, FieldLabel, fieldDescribedBy } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";

type FormFieldProps = React.ComponentProps<"input"> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
};

// Visible label, error text tied to the field, no placeholder-only labels
// (docs/ui-ux-guide.md accessibility checklist). A password field gets the
// SHOW / HIDE toggle from the Figma handoff page (node 34:7640).
export function FormField({ id, label, hint, error, type, ...inputProps }: FormFieldProps) {
  const control = {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": fieldDescribedBy(id, hint, error),
    ...inputProps,
  };

  return (
    <div className="group flex flex-col gap-2" data-disabled={inputProps.disabled || undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {type === "password" ? <PasswordInput {...control} /> : <Input type={type} {...control} />}
      {hint ? <FieldHint id={`${id}-hint`}>{hint}</FieldHint> : null}
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </div>
  );
}
