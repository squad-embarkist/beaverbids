import * as React from "react"
import { cn } from "@/lib/utils"

// The chrome around a field, from the Figma handoff page "Every state,
// once" (node 34:7640): a mono uppercase label in ink-strong that fades to
// ink-soft when its control is disabled, a help line, and an error line in
// asphalt with an 8 px signal square before it. Errors sit under the field
// they belong to, never only at the top of the form, and every field keeps
// its label visible. One copy of each, shared by the sign in and create
// account forms, the questionnaire and the landing demo form.

export function fieldDescribedBy(id: string, hint?: React.ReactNode, error?: React.ReactNode): string | undefined {
  const ids = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean)
  return ids.length ? ids.join(" ") : undefined
}

function FieldLabel({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="field-label"
      className={cn(
        // Fades when the wrapper (`group`) carries data-disabled, since the
        // label comes before its control and cannot see it as a peer.
        "font-mono text-mono-xs font-medium uppercase text-ink-strong select-none group-data-[disabled=true]:text-ink-soft",
        className
      )}
      {...props}
    />
  )
}

function FieldHint({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="field-hint" className={cn("text-help text-ink-strong", className)} {...props} />
}

// Renders nothing without a message, so a call site can always place it.
function FieldError({ className, children, ...props }: React.ComponentProps<"p">) {
  if (!children) return null
  return (
    <p
      role="alert"
      data-slot="field-error"
      className={cn(
        "flex items-start gap-2.5 text-help text-asphalt before:mt-1.5 before:block before:size-2 before:shrink-0 before:bg-signal before:content-['']",
        className
      )}
      {...props}
    >
      <span>{children}</span>
    </p>
  )
}

export { FieldError, FieldHint, FieldLabel }
