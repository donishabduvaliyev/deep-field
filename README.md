# Deep Field

A cinematic portfolio for **Doniyor** — a single unbroken camera walk through
a barbershop, in eight rooms, told with real-time 3D and a film-emulation
post chain.

Vite · React 19 · TypeScript · React Three Fiber · three.js. No 3D assets,
no audio files, no image files — the entire shop and its soundscape are
generated in code.

---

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # -> dist/
npm run preview    # serve the production build locally
npm run typecheck  # tsc --noEmit, separate from the build on purpose
```

> `npm run build` deliberately does **not** run `tsc` first, so a stray type
> error can never block a deploy. Run `npm run typecheck` in CI instead.

---

## The first things you'll want to change

Everything you're likely to edit is in **`src/content/scenes.ts`** — all copy,
which room each chapter belongs to, the focal length per scene, and the focus
pull track. You should not need to open a scene file to change a word.

Two placeholders are waiting for you:

| Where | What |
|---|---|
| `src/content/scenes.ts` → scene `origin` | `YOUR CITY`, and the line about how you started |
| `src/content/scenes.ts` → `CONTACT` | real email, Telegram, GitHub, LinkedIn URLs |
| `index.html` | title, description, OG tags, and `public/og.jpg` (1200×630) |

---

## How it's put together

```
src/
  content/scenes.ts     ← all copy, timings, lenses, focus track
  scene/
    constants.ts        rooms, palette, fog
    shop.ts             THE WHOLE SHOP AS DATA — every chair, bottle, basin
    shade.ts            bakes lighting into geometry as vertex colours
    Architecture.tsx    floors, walls, ceilings (4 floor + 3 wall treatments)
    Furniture.tsx       batches shop.ts into ~8 instanced draw calls
    Fixtures.tsx        practicals + light shafts, mirrors, pole, door, fan, dust
    Rig.tsx             the camera walk, aim curve, lens changes, focus pulls
    Post.tsx            DOF, anamorphic bloom, halation, grade, weave, grain
    Scene.tsx           assembles the canvas + adaptive quality
  ui/                   titles, HUD, matte, scrim, cursor, slate, mobile, article
  audio/useAudio.ts     the synthesised shop
```

### Adding or moving furniture
Open `src/scene/shop.ts`. It's pure data — `box()`, `cyl()`, `tap()` (tapered),
`light()`, `mirror()`, plus `chair()` and `station()` helpers. Nothing in it
touches three.js, so you can move a basin without knowing the renderer.

### Changing a room's size
Rooms are the `ZONES` table in `src/scene/constants.ts`:
`[name, zStart, zEnd, halfWidth, ceilingY, floorKind, wallKind]`.
If you change a room's length, the titles will drift out of sync with the
thresholds. Fix it by running `zoneBounds()` from that same file in the console
and pasting the `a`/`b` values back into `scenes.ts`.

### Why the furniture is lit the way it is
There are no lights in the scene — not one. Flat colour makes every object a
silhouette, so `shade.ts` bakes the lighting into each geometry as vertex
colours: up-faces catch the overhead lamps and go warm, flanks fall off,
undersides go almost black. It costs nothing per frame and it is the only
reason a basin reads as a basin.

### The post chain
`Post.tsx` registers `useFrame` at priority 1, which tells react-three-fiber to
stop auto-rendering; it then runs four passes by hand — scene (with a depth
texture) → quarter-res horizontal blur → vertical blur → composite. The
horizontal blur is deliberately 2.6× wider than the vertical: that ratio *is*
the anamorphic look. The composite does depth-of-field, bloom streaks,
halation, the grade, oval lens falloff, gate weave and 24fps grain.

### Colour management
`Scene.tsx` sets `THREE.ColorManagement.enabled = false`. The grade was
authored against raw colour values; leaving management on re-interprets every
literal and the whole look shifts warm and dark. If you ever turn it back on,
expect to re-tune the grade in `Post.tsx`.

### Mobile and reduced motion
Phones and `prefers-reduced-motion` users don't get a broken version of the
scene — `App.tsx` routes them to `ui/MobileFilm.tsx`, a designed alternative
with the same copy, type and grade and no WebGL at all. `ui/Article.tsx`
carries the identical story as semantic HTML for screen readers and crawlers.

### Performance
The whole interior is roughly 45 draw calls. `PerfGuard` in `Scene.tsx`
measures real frame rate and steps the resolution down twice before you'd
notice a stutter.

---

## Deploying

It's a plain static build — `dist/` works on any host.

**Vercel** — import the repo; it detects Vite. Build `npm run build`,
output `dist`. Nothing else needed.

**Netlify** — build `npm run build`, publish `dist`. Or add:
```toml
[build]
  command = "npm run build"
  publish = "dist"
```

**GitHub Pages** — uncomment and set `base` in `vite.config.ts` to `"/<repo>/"`,
then publish `dist` with your workflow of choice.

---

## Known gaps

- Written without a runnable build in the authoring environment — `npm install`
  first and expect to nudge a dependency version. The three.js APIs used are
  stable across recent versions.
- Dependency versions are caret ranges. If R3F and three disagree, pin three to
  the version R3F's peer range asks for.
- No ezkor case-study page yet — that needs screenshots of the Mini App.
