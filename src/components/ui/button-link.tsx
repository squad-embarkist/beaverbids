import Link from "next/link"
import type { VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { buttonVariants } from "@/components/ui/button"

// A navigation link that looks like a button and stays a link: the
// anchor keeps its link role for assistive technology and the keyboard.
function ButtonLink({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<typeof Link> & VariantProps<typeof buttonVariants>) {
  return <Link data-slot="button-link" className={cn(buttonVariants({ variant, size, className }))} {...props} />
}

export { ButtonLink }
