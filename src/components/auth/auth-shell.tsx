import type { ReactNode } from "react";

// The right side of every account screen: the form column centred in the
// space the side panel leaves, 460 px wide, 50 px gutters on desktop and
// 16 px on phones. The panel is rendered by the page so it can read its
// own data (the counts on Log in, the sender on Check inbox).
export function AuthShell({ panel, children }: { panel: ReactNode; children: ReactNode }) {
  return (
    <>
      {panel}
      <section className="flex flex-1 items-center justify-center px-4 py-10 sm:px-12 lg:py-14">
        <div className="flex w-full max-w-[460px] flex-col gap-[26px]">{children}</div>
      </section>
    </>
  );
}
