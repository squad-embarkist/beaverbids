import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

// 50 px tall, paper fill, 1 px muted border at 40 percent, square corners
// (Figma frame 1:957). Focus: 2 px asphalt outline plus a visible ring.
// Invalid: signal red border, paired with error text.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-control w-full min-w-0 border border-ink-muted/40 bg-paper px-4 text-base text-asphalt transition-colors outline-none placeholder:text-ink-muted/60 focus-visible:outline-2 focus-visible:outline-asphalt focus-visible:ring-3 focus-visible:ring-asphalt/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-stone-light disabled:opacity-60 aria-invalid:border-signal aria-invalid:ring-3 aria-invalid:ring-signal/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
