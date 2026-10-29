import * as React from "react"
import { cn } from "cn"
import { ChevronDownIcon } from "lucide-react"

// A native select styled like Input, for short option lists that must work
// with plain form submission and React Hook Form's register.
function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <span className="relative flex w-full">
      <select
        data-slot="native-select"
        className={cn(
          "h-control w-full min-w-0 appearance-none border border-ink-muted/40 bg-paper pr-10 pl-4 text-base text-asphalt transition-colors outline-none focus-visible:outline-2 focus-visible:outline-asphalt focus-visible:ring-3 focus-visible:ring-asphalt/20 disabled:cursor-not-allowed disabled:bg-stone-light disabled:opacity-60 aria-invalid:border-signal aria-invalid:ring-3 aria-invalid:ring-signal/20",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon aria-hidden className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-ink-muted" />
    </span>
  )
}

export { NativeSelect }
