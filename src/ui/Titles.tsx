import { useEffect, useRef } from "react";
import { SCENES, CONTACT, SIGNOFF } from "../content/scenes";
import type { ScrollState } from "../lib/useScroll";

/**
 * Burned-in titles. Driven by rAF off the same scroll ref as the camera,
 * writing straight to style — putting eight sections in React state and
 * re-rendering on scroll would be the slowest thing on the page.
 */
export function Titles({ scroll, frame }: { scroll: React.RefObject<ScrollState>; frame: React.RefObject<{ top: number; bottom: number }> }) {
  const secs = useRef<(HTMLElement | null)[]>([]);
  const inners = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    let id = 0;
    const tick = () => {
      const p = scroll.current?.smooth ?? 0;
      const f = frame.current ?? { top: 0, bottom: window.innerHeight };
      SCENES.forEach((sc, i) => {
        const el = secs.current[i], inner = inners.current[i];
        if (!el || !inner) return;
        const local = (p - sc.a) / (sc.b - sc.a);
        let vis = 0;
        if (local > -0.3 && local < 1.3) {
          vis = Math.min(
            Math.max((local + 0.1) / 0.28, 0),
            Math.max((1.1 - local) / 0.28, 0),
            1
          );
        }
        el.style.opacity = vis.toFixed(3);
        el.style.visibility = vis > 0.01 ? "visible" : "hidden";
        el.style.top = f.top + "px";
        el.style.height = f.bottom - f.top + "px";
        el.style.paddingBottom = Math.max(52, (f.bottom - f.top) * 0.13) + "px";
        el.classList.toggle("on", vis > 0.55);
        inner.style.transform = `translate3d(0,${((1 - vis) * 18).toFixed(2)}px,0)`;
      });
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [scroll, frame]);

  return (
    <main id="narration" aria-hidden="true">
      {SCENES.map((sc, i) => (
        <section
          key={sc.id}
          className="chapter"
          ref={(el) => { secs.current[i] = el; }}
        >
          <div className="inner" ref={(el) => { inners.current[i] = el; }}>
            <div className="slate">{sc.slate}</div>
            <h2 dangerouslySetInnerHTML={{ __html: sc.title }} />
            {sc.lines.map((line, j) =>
              line.kind === "p" ? (
                <p key={j} dangerouslySetInnerHTML={{ __html: line.text }} />
              ) : (
                <div key={j} className="meta">{line.text}</div>
              )
            )}
            {sc.id === "end" && (
              <>
                <div className="reach">
                  {CONTACT.map((c) => (
                    <a key={c.label} href={c.href} rel="noopener">{c.label}</a>
                  ))}
                </div>
                <div className="signoff">{SIGNOFF}</div>
              </>
            )}
          </div>
        </section>
      ))}
    </main>
  );
}
