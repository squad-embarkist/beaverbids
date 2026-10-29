import * as React from "react"
import { cn } from "cn"

// Same tokens as Input: paper fill, 1 px muted border at 40 percent, square
// corners, 2 px asphalt outline on focus, signal border when invalid.
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-28 w-full border border-ink-muted/40 bg-paper px-4 py-3 text-base leading-6 text-asphalt transition-colors outline-none placeholder:text-ink-muted/60 focus-visible:outline-2 focus-visible:outline-asphalt focus-visible:ring-3 focus-visible:ring-asphalt/20 disabled:cursor-not-allowed disabled:bg-stone-light disabled:opacity-60 aria-invalid:border-signal aria-invalid:ring-3 aria-invalid:ring-signal/20",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
