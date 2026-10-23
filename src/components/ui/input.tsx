import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

// 44 px tall, white fill, 1 px line border. Focus: 2 px asphalt outline plus
// a visible ring. Invalid: signal red border, paired with error text.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-control w-full min-w-0 rounded-lg border border-line bg-surface px-3 text-base text-asphalt transition-colors outline-none placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-asphalt focus-visible:ring-3 focus-visible:ring-asphalt/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-paper disabled:opacity-60 aria-invalid:border-signal aria-invalid:ring-3 aria-invalid:ring-signal/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
