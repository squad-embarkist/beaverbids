import { cn } from "cn";

// "BEAVERBIDS" in expanded ExtraBold with the mono "· BIDDESK" tag beside it
// (Figma frame 1:957, header and footer). The tag hides on narrow phones so
// the header keeps room for the button.
export function BrandLockup({
  brand,
  tag,
  size = "default",
  tone = "light",
  className,
}: {
  brand: string;
  tag: string;
  size?: "default" | "lg";
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <span className={cn("flex items-baseline gap-2 whitespace-nowrap", className)}>
      <span
        className={cn(
          "font-heading font-expanded font-extrabold",
          size === "lg" ? "text-wordmark-lg" : "text-wordmark",
          tone === "dark" ? "text-paper" : "text-asphalt",
        )}
      >
        {brand}
      </span>
      <span className="font-mono text-mono-xs tracking-[0.2em] text-ink-muted max-sm:hidden">{tag}</span>
    </span>
  );
}
