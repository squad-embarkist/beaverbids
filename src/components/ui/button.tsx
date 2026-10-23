import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

// Specs from docs/ui-ux-guide.md: 44 px tall, 4 px radius, one red primary
// action per screen, secondary with a 2 px asphalt border, text buttons for
// Skip and Back. Focus rings are never removed.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border-2 border-transparent bg-clip-padding font-sans font-semibold whitespace-nowrap transition-colors outline-none select-none focus-visible:outline-2 focus-visible:outline-asphalt focus-visible:ring-3 focus-visible:ring-asphalt/20 disabled:pointer-events-none disabled:opacity-50 aria-busy:cursor-progress [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-signal text-surface hover:bg-signal-press active:bg-signal-press",
        secondary:
          "border-asphalt bg-paper text-asphalt hover:bg-surface aria-expanded:bg-surface",
        outline:
          "border-line bg-surface text-asphalt hover:border-asphalt aria-expanded:border-asphalt",
        ghost: "text-asphalt hover:bg-paper aria-expanded:bg-paper",
        text: "text-asphalt underline-offset-4 hover:underline",
        destructive: "bg-signal text-surface hover:bg-signal-press",
        link: "text-signal underline-offset-4 hover:underline",
      },
      size: {
        default: "h-control px-4 text-base",
        sm: "h-9 px-3 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "size-control",
        "icon-sm": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
