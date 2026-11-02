import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "@/lib/utils"

// Field states from the Figma handoff page "Every state, once" (node
// 34:7640): 1 px ink-strong border on the field fill, square, 50 px tall
// (docs/ui-ux-guide.md). Placeholder in ink-soft, value in asphalt. Focus:
// 2 px asphalt outline with a 3 px offset, never removed. Error: a 2 px
// signal edge (border plus inset shadow, so nothing shifts), paired with
// FieldError under the field. Disabled: stone-light fill, hairline border,
// value in ink-strong, no opacity; used while a request is in flight.
const inputClassName =
  "h-control w-full min-w-0 border border-ink-strong bg-field px-4 text-base text-asphalt transition-colors outline-none placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-asphalt focus-visible:outline-offset-3 disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-hairline disabled:bg-stone-light disabled:text-ink-strong aria-invalid:border-signal aria-invalid:shadow-[inset_0_0_0_1px_var(--signal)]"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return <InputPrimitive type={type} data-slot="input" className={cn(inputClassName, className)} {...props} />
}

export { Input, inputClassName }
