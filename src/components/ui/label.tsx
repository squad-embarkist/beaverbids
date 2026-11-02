"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// A plain label for controls that are not fields with a mono label above
// them (checkbox rows, settings). Field labels use FieldLabel from field.tsx.
// A disabled control turns its label ink-soft; no opacity (Figma node 34:7640).
function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-5 font-medium text-asphalt select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:text-ink-soft peer-disabled:cursor-not-allowed peer-disabled:text-ink-soft",
        className
      )}
      {...props}
    />
  )
}

export { Label }
