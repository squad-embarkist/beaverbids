import { cn } from "cn";

// The BeaverBids wordmark: expanded Archivo, heavy weight.
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-heading font-expanded text-xl font-extrabold tracking-tight", className)}>
      BeaverBids
    </span>
  );
}
