/**
 * Everything you will actually want to edit lives in this file.
 * Copy, timing, lenses and focus are all here — no scene code below.
 *
 * `a` and `b` are scroll positions (0 = top, 1 = bottom). They are
 * derived from the room boundaries in src/scene/zones.ts, so if you
 * change a room's length, run the numbers printed by `zoneBounds()`
 * and paste them back in here.
 */

export type Line = { kind: "p"; text: string } | { kind: "meta"; text: string };

export interface Scene {
  id: string;
  slate: string;      // "Sc. 03 / ezkor"
  hud: string;        // short room name for the HUD
  title: string;      // supports <b>…</b> for the accent word
  lines: Line[];
  lens: number;       // focal length in mm, drives the FOV
  a: number;
  b: number;
}

export const SCENES: Scene[] = [
  {
    id: "origin",
    slate: "Sc. 01 / Origin",
    hud: "Origin",
    title: "I build for people who never <b>asked for software</b>.",
    lines: [
      { kind: "p", text: "Barbers. Salon owners. Businesses that run on a paper diary and one person's memory of who is coming in at four." },
      { kind: "meta", text: "Doniyor / Full-stack developer / YOUR CITY" },
    ],
    lens: 40, a: 0.0, b: 0.098,
  },
  {
    id: "craft",
    slate: "Sc. 02 / Craft",
    hud: "Craft",
    title: "The diary knows more than <b>it says</b>.",
    lines: [
      { kind: "p", text: "The Thursday walk-in. The barber who won't take anyone after eight. The cancellation that has to become an open hour in seconds." },
      { kind: "p", text: "Most of the work isn't the calendar. It's what the paper already knew." },
    ],
    lens: 28, a: 0.098, b: 0.246,
  },
  {
    id: "SmartChair",
    slate: "Sc. 03 / SmartChair",
    hud: "SmartChair",
    title: "Booking with <b>nothing to download</b>.",
    lines: [
      { kind: "p", text: "In Uzbekistan, Telegram isn't an app people have. It's <strong>the</strong> app. So SmartChair lives inside the chat — salons, barbers, nails, spa. Browse, book, done." },
      { kind: "meta", text: "React 19 · Vite · Tailwind · Telegram initData · Leaflet · uz / ru / en" },
    ],
    lens: 24, a: 0.246, b: 0.407,
  },
  {
    id: "slots",
    slate: "Sc. 04 / The Slot Engine",
    hud: "Slot Engine",
    title: "Four constraints, <b>one free hour</b>.",
    lines: [
      { kind: "p", text: "Chair capacity. Staff hours. Who's qualified. What's already booked. Every slot survives all four — or two people arrive for one chair at half past three." },
    ],
    lens: 50, a: 0.407, b: 0.564,
  },
  {
    id: "lifecycle",
    slate: "Sc. 05 / Lifecycle",
    hud: "Lifecycle",
    title: "Discover. Book. <b>Come back</b>.",
    lines: [
      { kind: "p", text: "Favourites, history, one-tap rebooking, reviews. And no payments — a booking is a request the shop confirms. One less integration, one less reason to abandon." },
    ],
    lens: 35, a: 0.564, b: 0.712,
  },
  {
    id: "surface",
    slate: "Sc. 06 / Surface",
    hud: "Surface",
    title: "Premium, inside a <b>chat window</b>.",
    lines: [
      { kind: "p", text: "Frosted glass, real dark mode, one disciplined accent. Three languages carried all the way through — because localisation is currency and phone formats, not a settings screen." },
    ],
    lens: 65, a: 0.712, b: 0.83,
  },
  {
    id: "system",
    slate: "Sc. 07 / System",
    hud: "System",
    title: "What I reach for <b>without thinking</b>.",
    lines: [
      { kind: "meta", text: "React · TypeScript · Tailwind · Node · REST · Telegram Bot API · Mini Apps · Postgres · Docker · Leaflet · Three.js · GLSL" },
    ],
    lens: 28, a: 0.83, b: 0.924,
  },
  {
    id: "end",
    slate: "Sc. 08 / End",
    hud: "Contact",
    title: "If it still runs on <b>paper</b>, let's talk.",
    lines: [],
    lens: 40, a: 0.924, b: 1.02,
  },
];

/** Focus-pull track. p = scroll position, d = focus distance in world units. */
export const FOCUS_KEYS: { p: number; d: number }[] = [
  { p: 0.0, d: 24 }, { p: 0.06, d: 9 },
  { p: 0.14, d: 18 }, { p: 0.21, d: 12 },
  { p: 0.3, d: 30 }, { p: 0.37, d: 14 },
  { p: 0.45, d: 22 }, { p: 0.53, d: 16 },
  { p: 0.62, d: 11 }, { p: 0.69, d: 19 },
  { p: 0.76, d: 7 },
  { p: 0.86, d: 10 }, { p: 0.93, d: 16 }, { p: 1.0, d: 12 },
];

export const CONTACT = [
  { label: "Email", href: "mailto:ilovedogskratos@gmail.com" },
  { label: "Telegram", href: "https://t.me/+998949827070" },
  { label: "GitHub", href: "https://github.com/donishabduvaliyev" },
  { label: "LinkedIn", href: "https://linkedin.com/in/donishabduvaliyev" },
];

export const SIGNOFF = "Namangan / Open to new work";
