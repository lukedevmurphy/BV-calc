"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

export const SLIDE_WIDTH = 1280;
export const SLIDE_HEIGHT = 720;

/**
 * A fixed logical 16:9 canvas scaled as one unit to its responsive frame.
 * Text, charts, columns, and spacing therefore never reflow across viewports.
 */
export default function ScaledSlide({ children }: { children: ReactNode }) {
  const frameRef = useRef<HTMLDivElement>(null);
  // Render visibly at full logical size on the first frame. The outer frame
  // clips it until measurement completes, which is preferable to a blank slide
  // when ResizeObserver is delayed or unavailable.
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const measure = () => {
      const width = frame.getBoundingClientRect().width;
      if (width > 0) setScale(width / SLIDE_WIDTH);
    };
    const animationFrame = requestAnimationFrame(measure);

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(measure);
      observer.observe(frame);
      return () => {
        cancelAnimationFrame(animationFrame);
        observer.disconnect();
      };
    }

    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <div ref={frameRef} className="relative aspect-[16/9] w-full overflow-hidden">
      <div
        className="absolute left-0 top-0 h-[720px] w-[1280px] origin-top-left"
        style={{
          transform: `scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
