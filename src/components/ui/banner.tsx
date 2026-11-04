import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { CheckIcon, TriangleAlertIcon } from "lucide-react"
import { cn } from "@/lib/utils"

// The four banners from the Figma handoff page "Every state, once" (node
// 34:7640). There is no green in this brand: success is asphalt, and red is
// for errors and for the one thing on a screen that needs attention.
//   error      signal fill, white text, warning icon
//   success    asphalt fill, paper text, check icon
//   note       stone-light fill, asphalt text, a 10 px ink-strong square
//   attention  field fill with a 2 px signal border, room for one action
const bannerVariants = cva("flex w-full gap-3.5 px-5 py-4 text-body-15 text-asphalt", {
  variants: {
    variant: {
      error: "items-start bg-signal text-white [&_a]:font-bold",
      success: "items-start bg-asphalt text-paper [&_a]:font-bold",
      note: "items-start bg-stone-light",
      attention: "items-center border-2 border-signal bg-field",
    },
  },
  defaultVariants: { variant: "note" },
})

type BannerProps = React.ComponentProps<"div"> &
  VariantProps<typeof bannerVariants> & {
    // An action for the attention banner, such as a small primary button.
    action?: React.ReactNode
  }

function BannerMark({ variant }: { variant: BannerProps["variant"] }) {
  if (variant === "error") return <TriangleAlertIcon aria-hidden className="mt-0.5 size-5 shrink-0" />
  if (variant === "success") return <CheckIcon aria-hidden className="mt-0.5 size-5 shrink-0" />
  if (variant === "note") return <span aria-hidden className="mt-2 block size-2.5 shrink-0 bg-ink-strong" />
  return null
}

// Pass role="alert" for a message that interrupts (a failed submit) and
// role="status" for one that does not (a saved password).
function Banner({ className, variant = "note", action, children, ...props }: BannerProps) {
  return (
    <div data-slot="banner" data-variant={variant} className={cn(bannerVariants({ variant }), className)} {...props}>
      <BannerMark variant={variant} />
      <div className="min-w-0 flex-1">{children}</div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

export { Banner, bannerVariants }
