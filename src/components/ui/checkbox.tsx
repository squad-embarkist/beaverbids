"use client"

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { CheckIcon } from "lucide-react"
import { cn } from "@/lib/utils"

// The checkbox drawn on the Log in frame (node 32:579): 16 px, white with
// a 1 px ink-strong border, signal fill with a white check when ticked.
// Square, since nothing but a score chip has a radius (the frame draws
// 2 px; docs/plans/account-flow-plan.md, section 8, item 12). Focus is the
// 2 px asphalt outline every control has; disabled follows the fields.
// Inside a form it posts its `name` with the value "on" when checked.
function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative flex size-4 shrink-0 cursor-pointer items-center justify-center border border-ink-strong bg-white text-white transition-colors outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:outline-2 focus-visible:outline-asphalt focus-visible:outline-offset-3 disabled:cursor-not-allowed disabled:border-hairline disabled:bg-stone-light data-checked:border-signal data-checked:bg-signal",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator data-slot="checkbox-indicator" className="grid place-content-center text-current transition-none [&>svg]:size-3.5">
        <CheckIcon strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
