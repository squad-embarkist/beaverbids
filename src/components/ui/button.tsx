import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

// Specs from docs/ui-ux-guide.md (Figma frame 1:957): signal fill with
// asphalt text in condensed bold uppercase, 56 px tall, square corners.
// Secondary is a 1 px asphalt border at 40 percent on no fill. The 40 px
// `sm` size is the header button. Focus rings are never removed.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 border bg-clip-padding font-sans font-condensed font-bold uppercase whitespace-nowrap transition-colors outline-none select-none focus-visible:outline-2 focus-visible:outline-asphalt focus-visible:ring-3 focus-visible:ring-asphalt/20 disabled:pointer-events-none disabled:opacity-50 aria-busy:cursor-progress [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-signal text-asphalt hover:bg-signal-press active:bg-signal-press",
        secondary:
          "border-asphalt/40 bg-transparent text-asphalt hover:border-asphalt aria-expanded:border-asphalt",
        outline:
          "border-line bg-surface text-asphalt hover:border-asphalt aria-expanded:border-asphalt",
        ghost: "border-transparent text-asphalt hover:bg-paper aria-expanded:bg-paper",
        text: "border-transparent text-asphalt underline-offset-4 hover:underline",
        destructive: "border-transparent bg-signal text-asphalt hover:bg-signal-press",
        link: "border-transparent text-signal underline-offset-4 hover:underline",
      },
      size: {
        default: "h-button px-7 text-button",
        sm: "h-10 px-4 text-button-sm",
        lg: "h-button px-8 text-button",
        icon: "size-control",
        "icon-sm": "size-10",
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
