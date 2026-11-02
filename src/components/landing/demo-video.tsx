"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

// The demo video player. Before playback it is the Figma frame as drawn: the
// 620 × 611 photo as the poster, the mono "Demo · 1:30" label bottom left and
// the 80 px signal play button (node 1:1151) centred on it. A click swaps in a
// native <video> with the browser controls. Without a video URL the button
// renders as drawn but disabled, named "coming soon" for assistive tech.
export function DemoVideo({ src }: { src: string | null }) {
  const t = useTranslations("Landing.demo");
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!playing) return;
    const video = videoRef.current;
    if (!video) return;
    video.focus();
    // Started from the click, so autoplay policies allow it; if a browser
    // still refuses, the controls are there to press play again.
    video.play().catch(() => undefined);
  }, [playing]);

  return (
    <div className="relative h-[320px] overflow-hidden bg-asphalt md:h-[480px] lg:h-auto lg:min-h-[611px]">
      {playing && src ? (
        <video
          ref={videoRef}
          src={src}
          poster="/landing/demo.jpg"
          controls
          playsInline
          preload="metadata"
          aria-label={t("videoLabel")}
          className="absolute inset-0 h-full w-full object-contain"
        />
      ) : (
        <>
          <Image
            src="/landing/demo.jpg"
            alt={t("photoAlt")}
            width={620}
            height={611}
            sizes="(min-width: 1024px) 620px, 100vw"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Button
              type="button"
              size="icon"
              aria-label={src ? t("play") : t("comingSoon")}
              disabled={!src}
              onClick={() => setPlaying(true)}
              className="size-20"
            >
              <span className="flex w-[42px] pl-1">
                <Image src="/landing/play.svg" alt="" width={32} height={32} className="size-8" />
              </span>
            </Button>
          </div>
          <p className="absolute bottom-4 left-4 font-mono text-mono-xs uppercase text-paper">{t("label")}</p>
        </>
      )}
    </div>
  );
}
