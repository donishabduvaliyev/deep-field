import { useEffect, useRef } from "react";

/**
 * Scroll progress as a ref, not state. The scene reads it every frame
 * inside useFrame; putting it in state would re-render React 60 times
 * a second for no reason.
 */
export interface ScrollState {
  raw: number;      // 0..1, unsmoothed
  smooth: number;   // eased, this is what the camera follows
  active: number;   // index of the current scene
}

export function useScrollState() {
  const ref = useRef<ScrollState>({ raw: 0, smooth: 0, active: 0 });

  useEffect(() => {
    const read = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      ref.current.raw = max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0;
    };
    read();
    window.addEventListener("scroll", read, { passive: true });
    window.addEventListener("resize", read);
    return () => {
      window.removeEventListener("scroll", read);
      window.removeEventListener("resize", read);
    };
  }, []);

  return ref;
}

export function usePointer() {
  const ref = useRef({ x: 0, y: 0, sx: 0, sy: 0, cx: 0, cy: 0 });
  useEffect(() => {
    const move = (e: PointerEvent) => {
      ref.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      ref.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
      ref.current.cx = e.clientX;
      ref.current.cy = e.clientY;
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);
  return ref;
}

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const isHandheld = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(max-width: 820px), (hover: none)").matches;
