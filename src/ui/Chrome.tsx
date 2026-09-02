import { useEffect, useRef, useState } from "react";

/** The 2.39:1 matte. It is a physical frame, not a filter — the titles
 *  and HUD are laid out inside it. */
export function Matte({ open, frame }: { open: boolean; frame: React.RefObject<{ top: number; bottom: number }> }) {
  const [bar, setBar] = useState(0);
  useEffect(() => {
    const layout = () => {
      const ideal = (window.innerHeight - window.innerWidth / 2.39) / 2;
      const h = open ? Math.max(0, Math.min(ideal, window.innerHeight * 0.19)) : 0;
      setBar(h);
      if (frame.current) { frame.current.top = h; frame.current.bottom = window.innerHeight - h; }
    };
    layout();
    window.addEventListener("resize", layout);
    return () => window.removeEventListener("resize", layout);
  }, [open, frame]);
  return (
    <>
      <div className="matte top" style={{ height: bar }} aria-hidden="true" />
      <div className="matte bot" style={{ height: bar }} aria-hidden="true" />
    </>
  );
}

export function Scrim({ shown }: { shown: boolean }) {
  return <div id="scrim" className={shown ? "on" : ""} aria-hidden="true" />;
}

/** A rangefinder, not a dot. */
export function Cursor({ pointer }: { pointer: React.RefObject<{ cx: number; cy: number }> }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let x = window.innerWidth / 2, y = window.innerHeight / 2, id = 0;
    const tick = () => {
      const p = pointer.current;
      if (p && ref.current) {
        x += (p.cx - x) * 0.2;
        y += (p.cy - y) * 0.2;
        ref.current.style.transform = `translate(${x}px, ${y}px)`;
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [pointer]);
  return <div id="cursor" ref={ref} aria-hidden="true" />;
}

export function Gate({ onRoll }: { onRoll: () => void }) {
  const [gone, setGone] = useState(false);
  return (
    <div id="gate" className={gone ? "gone" : ""}>
      <div className="board">
        <div className="top"><span>Roll A001</span><span>Take 01</span></div>
        <h1>Deep <b>Field</b></h1>
        <div className="sub">A film about a developer</div>
        <dl>
          <dt>Subject</dt><dd>Doniyor</dd>
          <dt>Location</dt><dd>A barbershop</dd>
          <dt>Format</dt><dd>2.39:1 Anamorphic</dd>
          <dt>Camera</dt><dd>One unbroken take</dd>
        </dl>
        <button id="enter" onClick={() => { setGone(true); onRoll(); }}>Roll Camera</button>
      </div>
    </div>
  );
}
