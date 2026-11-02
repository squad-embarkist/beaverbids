"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { FieldError, FieldHint, fieldDescribedBy as describedBy } from "@/components/ui/field";

// Field chrome for the questionnaire. The label, hint and error line are
// the shared ones from src/components/ui/field.tsx (Figma node 34:7640),
// re-exported here so the step forms keep one import. Option cards are
// native inputs inside a label, so they register with React Hook Form
// directly and work with the keyboard and screen readers without extra
// wiring.

export function useErrorText() {
  const t = useTranslations("Questionnaire.errors");
  // Zod messages are keys; an unknown key falls back to the generic line.
  return (key: string | undefined): string | undefined => {
    if (!key) return undefined;
    return t.has(key as "invalid") ? t(key as "invalid") : t("invalid");
  };
}

export { FieldError, FieldHint, FieldLabel } from "@/components/ui/field";
export { describedBy };

// A group of option cards. `role="radiogroup"` lets aria-invalid apply; a
// checkbox group stays a plain fieldset and relies on the error text.
export function OptionGroup({
  id,
  legend,
  hint,
  error,
  radio,
  children,
  className,
}: {
  id: string;
  legend: string;
  hint?: string;
  error?: string;
  radio?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <fieldset
      id={id}
      role={radio ? "radiogroup" : undefined}
      aria-invalid={radio && error ? true : undefined}
      aria-describedby={describedBy(id, hint, error)}
      className="flex min-w-0 flex-col gap-3"
    >
      <legend className="mb-3 font-mono text-mono-xs font-medium uppercase text-ink-strong">{legend}</legend>
      {hint ? <FieldHint id={`${id}-hint`}>{hint}</FieldHint> : null}
      <div className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-3", className)}>{children}</div>
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </fieldset>
  );
}

// Selected: asphalt card with paper text and a 2 px inset ring, so the
// state is colour, weight and the tick together (docs/ui-ux-guide.md).
// Focus: 2 px asphalt outline, 3 px offset. Disabled: stone-light fill and
// a hairline border, no opacity (Figma node 34:7640).
export const OptionCard = React.forwardRef<HTMLInputElement, React.ComponentProps<"input"> & { label: React.ReactNode }>(
  function OptionCard({ label, className, ...input }, ref) {
    return (
      <label
        className={cn(
          "flex min-h-11 cursor-pointer items-center gap-3 border border-line bg-surface px-4 py-3 text-base leading-6 text-asphalt transition-colors",
          "hover:border-asphalt has-checked:border-asphalt has-checked:bg-asphalt has-checked:text-paper has-checked:ring-2 has-checked:ring-asphalt has-checked:ring-inset",
          "has-focus-visible:outline-2 has-focus-visible:outline-asphalt has-focus-visible:outline-offset-3",
          "has-disabled:cursor-not-allowed has-disabled:border-hairline has-disabled:bg-stone-light has-disabled:text-ink-strong",
          className,
        )}
      >
        <input ref={ref} className="size-4 shrink-0 accent-signal" {...input} />
        <span>{label}</span>
      </label>
    );
  },
);

// A single yes/no checkbox on its own row.
export const CheckRow = React.forwardRef<HTMLInputElement, React.ComponentProps<"input"> & { label: React.ReactNode; hint?: string }>(
  function CheckRow({ label, hint, id, className, ...input }, ref) {
    const hintId = hint && id ? `${id}-hint` : undefined;
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <label htmlFor={id} className="flex min-h-11 cursor-pointer items-start gap-3 text-base leading-6 text-asphalt">
          <input ref={ref} id={id} type="checkbox" aria-describedby={hintId} className="mt-1 size-4 shrink-0 accent-signal" {...input} />
          <span>{label}</span>
        </label>
        {hint ? <FieldHint id={hintId!}>{hint}</FieldHint> : null}
      </div>
    );
  },
);
