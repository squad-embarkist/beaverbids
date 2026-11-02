import Image from "next/image";
import { cn } from "@/lib/utils";

// The beaver logo and "BEAVERBIDS" in expanded ExtraBold, as in the Figma
// header (node 1:983: 32 px logo, 8 px gap, 20 px wordmark on paper) and
// footer (node 1:1348: 33 × 32 outlined logo, 10 px gap, 24 px wordmark on
// asphalt). Neither carries a tag any more.
export function BrandLockup({
  brand,
  size = "default",
  tone = "light",
  className,
  brandClassName,
}: {
  brand: string;
  size?: "default" | "lg";
  tone?: "light" | "dark";
  className?: string;
  // Extra classes for the wordmark text, for example `max-sm:sr-only` in the
  // header where the name does not fit beside the button on narrow phones.
  brandClassName?: string;
}) {
  const dark = tone === "dark";
  return (
    <span
      className={cn("flex items-center whitespace-nowrap", size === "lg" ? "gap-2.5" : "gap-2", className)}
    >
      <Image
        src={dark ? "/landing/logo-dark.svg" : "/landing/logo.svg"}
        alt=""
        width={dark ? 33 : 32}
        height={32}
        className={cn("h-8 shrink-0", dark ? "w-[33px]" : "w-8")}
      />
      <span
        className={cn(
          "font-heading font-expanded font-extrabold",
          size === "lg" ? "text-wordmark-lg" : "text-wordmark",
          dark ? "text-paper" : "text-asphalt",
          brandClassName,
        )}
      >
        {brand}
      </span>
    </span>
  );
}
