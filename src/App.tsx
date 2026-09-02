import { useEffect, useRef, useState } from "react";
import { Scene } from "./scene/Scene";
import { Titles } from "./ui/Titles";
import { Hud } from "./ui/Hud";
import { Matte, Scrim, Cursor, Gate } from "./ui/Chrome";
import { Article } from "./ui/Article";
import { MobileFilm } from "./ui/MobileFilm";
import { useAudio } from "./audio/useAudio";
import { isHandheld, prefersReducedMotion, usePointer, useScrollState } from "./lib/useScroll";

export default function App() {
  const scroll = useScrollState();
  const pointer = usePointer();
  const frame = useRef({ top: 0, bottom: typeof window === "undefined" ? 0 : window.innerHeight });
  const focusRef = useRef(16);

  const [reduced] = useState(prefersReducedMotion);
  const [handheld] = useState(isHandheld);
  const [rolling, setRolling] = useState(false);
  const audio = useAudio();

  // hand the mix the current room, once per change
  const lastRoom = useRef(-1);
  useEffect(() => {
    let id = 0;
    const tick = () => {
      const a = scroll.current?.active ?? 0;
      if (a !== lastRoom.current) { lastRoom.current = a; audio.setRoom(a); }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [scroll, audio]);

  // Phones and anyone who asked for less motion get the designed
  // alternative, not a degraded version of this one.
  if (handheld || reduced) {
    return (
      <>
        <MobileFilm />
        <Article visible={false} />
      </>
    );
  }

  return (
    <>
      <Scene scroll={scroll} pointer={pointer} reduced={reduced} />
      <Matte open={rolling} frame={frame} />
      <div id="runway" />
      <Scrim shown={rolling} />
      <Titles scroll={scroll} frame={frame} />
      <Hud scroll={scroll} frame={frame} focusRef={focusRef}
           soundOn={audio.on} onToggleSound={audio.toggle} />
      <Cursor pointer={pointer} />
      {!rolling && <Gate onRoll={() => setRolling(true)} />}
      <Article visible={false} />
    </>
  );
}
