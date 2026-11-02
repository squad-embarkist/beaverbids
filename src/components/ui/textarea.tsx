import * as React from "react"
import { cn } from "@/lib/utils"

// Same states as Input (Figma node 34:7640): ink-strong border on the field
// fill, square, 2 px asphalt outline with a 3 px offset on focus, a 2 px
// signal edge when invalid, stone-light with a hairline border when disabled.
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-28 w-full border border-ink-strong bg-field px-4 py-3 text-base leading-6 text-asphalt transition-colors outline-none placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-asphalt focus-visible:outline-offset-3 disabled:cursor-not-allowed disabled:border-hairline disabled:bg-stone-light disabled:text-ink-strong aria-invalid:border-signal aria-invalid:shadow-[inset_0_0_0_1px_var(--signal)]",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
