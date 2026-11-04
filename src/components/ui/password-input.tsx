"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

// A password field with the SHOW / HIDE toggle from the Figma handoff page
// (node 34:7640): the border, fill and focus outline sit on the wrapper,
// the input inside has none, and the toggle stands behind a hairline on
// the right. The toggle is a real button that reports its state through
// aria-pressed and names the field it controls.
function PasswordInput({ className, id, disabled, ...props }: Omit<React.ComponentProps<typeof Input>, "type">) {
  const t = useTranslations("Auth.password")
  const [shown, setShown] = React.useState(false)

  return (
    <span
      data-slot="password-input"
      data-disabled={disabled || undefined}
      className={cn(
        "group/field flex w-full border border-ink-strong bg-field transition-colors focus-within:outline-2 focus-within:outline-asphalt focus-within:outline-offset-3 has-[[aria-invalid=true]]:border-signal has-[[aria-invalid=true]]:shadow-[inset_0_0_0_1px_var(--signal)] has-[:disabled]:border-hairline has-[:disabled]:bg-stone-light",
        className
      )}
    >
      <Input
        id={id}
        type={shown ? "text" : "password"}
        disabled={disabled}
        className="min-w-0 flex-1 border-0 bg-transparent shadow-none focus-visible:outline-none aria-invalid:shadow-none disabled:bg-transparent"
        {...props}
      />
      <button
        type="button"
        aria-pressed={shown}
        aria-controls={id}
        disabled={disabled}
        onClick={() => setShown((value) => !value)}
        className="flex min-w-11 shrink-0 cursor-pointer items-center justify-center border-l border-hairline px-4 font-mono text-mono-xs font-medium uppercase text-ink-strong outline-none select-none transition-colors hover:text-asphalt focus-visible:-outline-offset-3 focus-visible:outline-2 focus-visible:outline-asphalt disabled:cursor-not-allowed disabled:text-ink-soft"
      >
        {shown ? t("hide") : t("show")}
      </button>
    </span>
  )
}

export { PasswordInput }
