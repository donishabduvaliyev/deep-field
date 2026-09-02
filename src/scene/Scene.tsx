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

/**
 * Measured, not guessed: drop resolution in two steps if frames slip,
 * climb back up if they recover, and bail out of WebGL entirely if a
 * device is stuck at the floor and still can't hold a usable frame rate.
 */
function PerfGuard({
  onTierChange, onCritical,
}: { onTierChange: (tier: number) => void; onCritical: () => void }) {
  const setDpr = useThree((s) => s.setDpr);
  const acc = useRef({ frames: 0, time: 0, step: 0, good: 0, bad: 0 });

  useFrame((_, delta) => {
    const a = acc.current;
    a.frames++; a.time += delta;
    if (a.time < 1) return;
    const fps = a.frames / a.time;
    a.frames = 0; a.time = 0;
    const cap = Math.min(window.devicePixelRatio || 1, 1.75);

    if (fps < 40 && a.step === 0) {
      a.step = 1; a.good = 0;
      setDpr(Math.max(1, cap * 0.75));
      onTierChange(1);
    } else if (fps < 32 && a.step === 1) {
      a.step = 2; a.good = 0;
      setDpr(1);
      onTierChange(2);
    } else if (fps >= 48 && a.step > 0) {
      // recovery is deliberately slower than the drop: a few seconds of
      // real headroom, not one lucky frame, before quality climbs back
      a.good++;
      if (a.good >= 4) {
        a.step--; a.good = 0;
        setDpr(a.step === 0 ? cap : Math.max(1, cap * 0.75));
        onTierChange(a.step);
      }
    } else {
      a.good = 0;
    }

    // already at the floor and still under 24fps for five seconds
    // straight: the 3D take itself is too much for this device
    if (a.step === 2 && fps < 24) {
      a.bad++;
      if (a.bad >= 5) onCritical();
    } else {
      a.bad = 0;
    }
  }, 2);
  return null;
}

/** Baseline particle budget for a full-quality run, scaled down per tier below. */
function dustBudget(base: number, tier: number) {
  if (tier <= 0) return base;
  return Math.round(base * (tier === 1 ? 0.6 : 0.35));
}

export function Scene({
  scroll, pointer, reduced, onCriticalPerf,
}: {
  scroll: React.RefObject<ScrollState>;
  pointer: React.RefObject<{ x: number; y: number; sx: number; sy: number }>;
  reduced: boolean;
  onCriticalPerf: () => void;
}) {
  const shop = useMemo(() => buildShop(), []);
  const focusRef = useRef(16);
  const baseCount = useRef(window.innerWidth < 900 ? 2200 : 7000).current;
  const [tier, setTier] = useState(0);
  const count = dustBudget(baseCount, tier);

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
      <PerfGuard onTierChange={setTier} onCritical={onCriticalPerf} />
    </Canvas>
  );
}
