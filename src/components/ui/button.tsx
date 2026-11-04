import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// States from the Figma handoff page "Every state, once" (file "Beaver Bids
// UI", node 34:7640; docs/plans/form-states-plan.md): signal fill with a
// white condensed bold uppercase label, 56 px tall, square corners. Hover
// darkens to signal-press with no lift, shadow or transform. Disabled is a
// solid stone-light fill with a hairline border and soft grey text, no
// opacity, and is only for a cooldown, never to police a half-filled form.
// Working (`busy`) keeps the hover red, adds the square spinner and keeps
// focus. Secondary is a 1 px asphalt border that fills with stone-light on
// hover. Focus is a 2 px asphalt outline with a 3 px offset, never removed.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-3 border bg-clip-padding font-sans font-condensed font-bold uppercase whitespace-nowrap transition-colors outline-none select-none focus-visible:outline-2 focus-visible:outline-asphalt focus-visible:outline-offset-3 disabled:pointer-events-none disabled:border-hairline disabled:bg-stone-light disabled:text-ink-soft aria-disabled:pointer-events-none aria-busy:pointer-events-none aria-busy:cursor-progress [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-signal text-white hover:bg-signal-press active:bg-signal-press aria-busy:border-transparent aria-busy:bg-signal-press aria-busy:text-white",
        secondary:
          "border-asphalt bg-transparent text-asphalt hover:bg-stone-light aria-expanded:bg-stone-light aria-busy:border-asphalt aria-busy:bg-stone-light aria-busy:text-asphalt",
        outline:
          "border-line bg-surface text-asphalt hover:border-asphalt aria-expanded:border-asphalt aria-busy:border-asphalt aria-busy:bg-surface aria-busy:text-asphalt",
        ghost: "border-transparent text-asphalt hover:bg-stone-light aria-expanded:bg-stone-light aria-busy:border-transparent aria-busy:text-asphalt",
        text: "border-transparent text-asphalt underline-offset-4 hover:text-signal hover:underline aria-busy:border-transparent aria-busy:text-asphalt",
        destructive:
          "border-transparent bg-signal text-white hover:bg-signal-press active:bg-signal-press aria-busy:border-transparent aria-busy:bg-signal-press aria-busy:text-white",
        link: "border-transparent text-signal underline-offset-4 hover:underline aria-busy:border-transparent aria-busy:text-signal",
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

// The working state's square spinner: 14 px, 2 px border in the current
// text colour, one turn every 0.8 s. Decorative; the label says what is
// happening and aria-busy says that it is.
function ButtonSpinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      data-slot="button-spinner"
      className={cn("inline-block size-3.5 shrink-0 animate-spin-square border-2 border-current", className)}
    />
  )
}

type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    // The request this button started is in flight. The caller swaps the
    // label for the verb in progress ("Creating your account"); the button
    // adds the spinner, announces aria-busy, ignores clicks and keeps focus
    // (focusable while disabled) so the screen reader stays on it.
    busy?: boolean
  }

function Button({
  className,
  variant = "default",
  size = "default",
  busy = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={busy || disabled}
      focusableWhenDisabled={busy}
      aria-busy={busy || undefined}
      {...props}
    >
      {busy ? <ButtonSpinner /> : null}
      {children}
    </ButtonPrimitive>
  )
}

export { Button, ButtonSpinner, buttonVariants }
