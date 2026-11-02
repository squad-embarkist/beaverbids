import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronDownIcon } from "lucide-react"

// A native select styled like Input, for short option lists that must work
// with plain form submission and React Hook Form's register. Same states as
// Input (Figma node 34:7640).
function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <span className="relative flex w-full">
      <select
        data-slot="native-select"
        className={cn(
          "peer h-control w-full min-w-0 appearance-none border border-ink-strong bg-field pr-10 pl-4 text-base text-asphalt transition-colors outline-none focus-visible:outline-2 focus-visible:outline-asphalt focus-visible:outline-offset-3 disabled:cursor-not-allowed disabled:border-hairline disabled:bg-stone-light disabled:text-ink-strong aria-invalid:border-signal aria-invalid:shadow-[inset_0_0_0_1px_var(--signal)]",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon aria-hidden className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-ink-strong peer-disabled:text-ink-soft" />
    </span>
  )
}

export { NativeSelect }
