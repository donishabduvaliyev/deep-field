import { useEffect, useRef } from "react";
import { SCENES, CONTACT, SIGNOFF } from "../content/scenes";

/**
 * Phones do not get a broken version of the desktop scene — they get a
 * designed one. Same story, same type, same grade, but the 3D walk is
 * replaced by scroll-snapped chapters over a slow gradient and grain.
 * No WebGL, no post chain, no depth pass.
 */
export function MobileFilm() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const els = root.current?.querySelectorAll<HTMLElement>(".m-chapter");
    if (!els) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.target.classList.toggle("on", e.isIntersecting)),
      { threshold: 0.45 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div id="mobile" ref={root}>
      <div className="m-grain" aria-hidden="true" />
      <header className="m-chapter m-title">
        <div className="slate">Roll A001 / Take 01</div>
        <h1>Deep <b>Field</b></h1>
        <p className="sub">A film about a developer</p>
      </header>

      {SCENES.map((sc) => (
        <section className="m-chapter" key={sc.id}>
          <div className="slate">{sc.slate}</div>
          <h2 dangerouslySetInnerHTML={{ __html: sc.title }} />
          {sc.lines.map((l, i) =>
            l.kind === "p" ? (
              <p key={i} dangerouslySetInnerHTML={{ __html: l.text }} />
            ) : (
              <div key={i} className="meta">{l.text}</div>
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
        </section>
      ))}
    </div>
  );
}
