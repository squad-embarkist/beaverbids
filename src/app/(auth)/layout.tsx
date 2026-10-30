import Link from "next/link";
import { Wordmark } from "@/components/wordmark";

// Sign in and create account: a single centred card on paper, nothing else
// around it (docs/ui-ux-guide.md, screen patterns).
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-12">
      <Link href="/" className="rounded-lg text-asphalt">
        <Wordmark className="text-2xl" />
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
