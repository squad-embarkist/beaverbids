import Link from "next/link";
import { Wordmark } from "@/components/wordmark";

// Asphalt bar with the paper wordmark. The right-hand slot is for the
// signed-in user's details, which stream in behind their own Suspense
// boundary so the bar itself stays in the static shell.
export function TopBar({ children }: { children?: React.ReactNode }) {
  return (
    <header className="bg-asphalt text-paper">
      <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center justify-between gap-4 px-4 md:px-8">
        <Link href="/dashboard" className="rounded-lg">
          <Wordmark />
        </Link>
        <div className="flex items-center gap-4">{children}</div>
      </div>
    </header>
  );
}
