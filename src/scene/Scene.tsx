import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Architecture } from "./Architecture";
import { Furniture } from "./Furniture";
import { Practicals, Mirrors, Pole, Door, Fan, Dust } from "./Fixtures";
import { Rig } from "./Rig";
import { Post } from "./Post";
import { buildShop } from "./shop";
import { FOG_COLOR, FOG_DENSITY } from "./constants";
import type { ScrollState } from "../lib/useScroll";

// The look was authored before three enabled colour management by
// default. Leaving it on re-interprets every literal colour and the
// whole grade shifts. Keep it off.
THREE.ColorManagement.enabled = false;

/** Measured, not guessed: drop resolution in two steps if frames slip. */
function PerfGuard() {
  const setDpr = useThree((s) => s.setDpr);
  const acc = useRef({ frames: 0, time: 0, step: 0 });

  useFrame((_, delta) => {
    const a = acc.current;
    a.frames++; a.time += delta;
    if (a.time >= 1) {
      const fps = a.frames / a.time;
      a.frames = 0; a.time = 0;
      const cap = Math.min(window.devicePixelRatio || 1, 1.75);
      if (fps < 40 && a.step === 0) { a.step = 1; setDpr(Math.max(1, cap * 0.75)); }
      else if (fps < 32 && a.step === 1) { a.step = 2; setDpr(1); }
    }
  }, 2);
  return null;
}

export function Scene({
  scroll, pointer, reduced,
}: {
  scroll: React.RefObject<ScrollState>;
  pointer: React.RefObject<{ x: number; y: number; sx: number; sy: number }>;
  reduced: boolean;
}) {
  const shop = useMemo(() => buildShop(), []);
  const focusRef = useRef(16);
  const [count] = useState(() => (window.innerWidth < 900 ? 2200 : 7000));

  return (
    <Canvas
      id="stage"
      flat
      dpr={[1, Math.min(window.devicePixelRatio || 1, 1.75)]}
      gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
      camera={{ fov: 46, near: 0.5, far: 700, position: [0, 0.2, 14] }}
      onCreated={({ gl, scene }) => {
        gl.setClearColor(0x05070a, 1);
        scene.fog = new THREE.FogExp2(FOG_COLOR.getHex(), FOG_DENSITY);
      }}
    >
      <Architecture />
      <Furniture boxes={shop.boxes} cyls={shop.cyls} taps={shop.taps} />
      <Mirrors items={shop.mirrors} />
      <Practicals items={shop.practicals} />
      <Fan at={shop.fanAt} />
      <Pole at={shop.poleAt} />
      <Door />
      <Dust count={count} />

      <Rig scroll={scroll} pointer={pointer} reduced={reduced} focusRef={focusRef} />
      <Post focusRef={focusRef} reduced={reduced} />
      <PerfGuard />
    </Canvas>
  );
}
