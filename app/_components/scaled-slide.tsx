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
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const measure = () => setScale(frame.clientWidth / SLIDE_WIDTH);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={frameRef} className="relative aspect-[16/9] w-full overflow-hidden">
      <div
        className="absolute left-0 top-0 h-[720px] w-[1280px] origin-top-left"
        style={{
          transform: `scale(${scale || 1})`,
          visibility: scale ? "visible" : "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}
