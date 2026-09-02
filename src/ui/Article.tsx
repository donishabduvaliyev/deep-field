import { SCENES, CONTACT, SIGNOFF } from "../content/scenes";

/**
 * The same story as semantic HTML. This is what a screen reader reads,
 * what a crawler indexes, and what someone with prefers-reduced-motion
 * gets instead of the film. It is not a fallback bolted on — it carries
 * the identical copy from src/content/scenes.ts.
 */
export function Article({ visible }: { visible: boolean }) {
  return (
    <article id="article" className={visible ? "shown" : ""}>
      <header>
        <h1>Doniyor</h1>
        <p className="lede">
          Full-stack developer. I build for people who never asked for software.
        </p>
      </header>
      {SCENES.filter((s) => s.id !== "end").map((s) => (
        <section key={s.id}>
          <h2 dangerouslySetInnerHTML={{ __html: s.title.replace(/<\/?b>/g, "") }} />
          {s.lines.map((l, i) => (
            <p key={i} dangerouslySetInnerHTML={{ __html: l.text }} />
          ))}
        </section>
      ))}
      <section>
        <h2>Contact</h2>
        <ul className="links">
          {CONTACT.map((c) => (
            <li key={c.label}><a href={c.href} rel="noopener">{c.label}</a></li>
          ))}
        </ul>
        <p>{SIGNOFF}</p>
      </section>
    </article>
  );
}
