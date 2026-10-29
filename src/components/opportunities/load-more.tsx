"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { loadMoreOpportunities } from "@/app/(app)/opportunities/actions";
import { ButtonLink } from "@/components/ui/button-link";

// "Show more" appends the next page under the rows already on screen, so
// nothing the user has read disappears. Each click asks the server action
// for the next chunk (rendered by the same list component) and moves focus
// to the first new row. Without JavaScript the control is a plain link to
// the next page.
export function LoadMore({ baseSearch, cursor, fallbackHref }: { baseSearch: string; cursor: string; fallbackHref: string }) {
  const t = useTranslations("Opportunities");
  const [chunks, setChunks] = useState<ReactNode[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(cursor);
  const [loaded, setLoaded] = useState(0);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const chunksRef = useRef<HTMLDivElement>(null);
  // Set when a chunk arrives; the effect focuses its first title link once
  // React has committed the new rows.
  const [focusRequest, setFocusRequest] = useState<{ count: number; seq: number } | null>(null);

  useEffect(() => {
    if (!focusRequest || focusRequest.count === 0) return;
    const links = chunksRef.current?.querySelectorAll<HTMLAnchorElement>("table a[href^='/opportunities/'], ul a[href^='/opportunities/']");
    if (!links || links.length === 0) return;
    // Both the table and the card list carry the links; one of them is
    // display:none, so take the visible one nearest the end.
    const visible = Array.from(links).filter((a) => a.offsetParent !== null);
    const firstNew = visible[visible.length - focusRequest.count];
    firstNew?.focus();
  }, [focusRequest]);

  const search = (c: string) => (baseSearch ? `${baseSearch}&cursor=${encodeURIComponent(c)}` : `cursor=${encodeURIComponent(c)}`);

  const load = () => {
    if (!nextCursor) return;
    const target = nextCursor;
    setFailed(false);
    startTransition(async () => {
      try {
        const result = await loadMoreOpportunities(search(target));
        setChunks((prev) => [...prev, result.rows]);
        setLoaded((n) => n + result.count);
        setNextCursor(result.nextCursor);
        setFocusRequest((prev) => ({ count: result.count, seq: (prev?.seq ?? 0) + 1 }));
      } catch {
        setFailed(true);
      }
    });
  };

  return (
    <>
      <div ref={chunksRef} className="flex flex-col gap-6">
        {chunks.map((chunk, i) => (
          <div key={i}>{chunk}</div>
        ))}
      </div>
      <p aria-live="polite" data-slot="load-more-status" className="sr-only">
        {loaded > 0 ? t("loadedMore", { count: loaded }) : ""}
      </p>
      {failed ? (
        <p role="alert" className="text-center text-sm leading-5 text-asphalt">
          {t("loadMoreFailed")}
        </p>
      ) : null}
      {nextCursor ? (
        <ButtonLink
          href={fallbackHref}
          variant="secondary"
          className="self-center"
          aria-busy={pending}
          aria-disabled={pending}
          onClick={(event) => {
            event.preventDefault();
            if (!pending) load();
          }}
        >
          {pending ? t("loadingMore") : t("showMore")}
        </ButtonLink>
      ) : null}
    </>
  );
}
