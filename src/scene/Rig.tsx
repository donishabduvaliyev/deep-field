import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { FOCUS_KEYS, SCENES } from "../content/scenes";
import type { ScrollState } from "../lib/useScroll";

/**
 * One unbroken take. The camera walks a curve at eye height while a
 * separate aim curve decides what it looks at, so each room gets framed
 * the way an operator would frame it rather than pointing straight ahead.
 */
const FLIGHT = [
  [0.0, 0.2, 14], [1.0, 0.3, -9], [-0.5, 0.1, -32], [1.4, 0.4, -67],
  [-0.8, 0.2, -102], [1.6, 0.5, -140], [2.6, 0.3, -178], [7.4, 0.2, -216],
  [2.2, 0.4, -252], [1.0, 0.2, -287], [-0.9, 0.3, -322], [0.8, 0.1, -350],
  [-0.7, 0.4, -378], [0.6, 0.0, -400], [-0.5, 0.2, -422], [0.3, -0.2, -440],
  [0.0, -0.5, -458],
] as const;

const AIM = [
  [-3.6, -2.4, -12],   // the appointment book under the lamp
  [-4.4, -2.8, -15],
  [4.0, -2.0, -44],    // across to the waiting bench
  [7.4, -3.4, -64],    // and the street window
  [-4.0, 1.0, -116],   // the hall opens: mirrors down the left
  [-11.0, 1.4, -142],
  [-8.0, 0.2, -170],
  [-5.6, -1.2, -212],  // left, into the row of chairs
  [-5.0, -1.6, -232],
  [-6.6, -2.4, -262],  // the basins
  [-7.0, -2.6, -292],
  [-5.6, 1.2, -334],   // one mirror, close
  [-5.8, 1.4, -352],
  [0.0, -0.8, -394],   // the back room and its bare bulb
  [-3.4, -1.2, -430],  // the pole
  [-1.4, -1.6, -450],
  [0.0, -1.9, -466],   // the door
] as const;

function focusAt(p: number) {
  for (let i = 0; i < FOCUS_KEYS.length - 1; i++) {
    const a = FOCUS_KEYS[i], b = FOCUS_KEYS[i + 1];
    if (p >= a.p && p <= b.p) {
      let t = (p - a.p) / (b.p - a.p);
      t = t * t * (3 - 2 * t);            // focus pulls ease, they never snap
      return a.d + (b.d - a.d) * t;
    }
  }
  return FOCUS_KEYS[FOCUS_KEYS.length - 1].d;
}

/** low-frequency wobble: the operator is human, the frame never settles */
const wob = (t: number, a: number, b: number, c: number) =>
  Math.sin(t * a) * 0.6 + Math.sin(t * b + 1.7) * 0.3 + Math.sin(t * c + 4.1) * 0.1;

export function Rig({
  scroll, pointer, reduced, focusRef,
}: {
  scroll: React.RefObject<ScrollState>;
  pointer: React.RefObject<{ x: number; y: number; sx: number; sy: number }>;
  reduced: boolean;
  focusRef: React.RefObject<number>;
}) {
  const { camera } = useThree();
  const curves = useMemo(
    () => ({
      flight: new THREE.CatmullRomCurve3(FLIGHT.map((p) => new THREE.Vector3(...p)), false, "catmullrom", 0.28),
      aim: new THREE.CatmullRomCurve3(AIM.map((p) => new THREE.Vector3(...p)), false, "catmullrom", 0.28),
    }),
    []
  );
  const pos = useRef(new THREE.Vector3());
  const look = useRef(new THREE.Vector3());
  const fov = useRef(46);
  const focus = useRef(20);

  useFrame((state, delta) => {
    const s = scroll.current!;
    const pt = pointer.current!;
    const ease = reduced ? 1 : 1 - Math.pow(0.001, delta);   // frame-rate independent

    s.smooth += (s.raw - s.smooth) * (reduced ? 1 : Math.min(ease * 0.9, 1));
    pt.sx += (pt.x - pt.sx) * Math.min(ease * 0.7, 1);
    pt.sy += (pt.y - pt.sy) * Math.min(ease * 0.7, 1);

    const p = Math.min(Math.max(s.smooth, 0), 1);
    curves.flight.getPointAt(p, pos.current);
    curves.aim.getPointAt(p, look.current);

    const t = state.clock.elapsedTime;
    const hx = reduced ? 0 : wob(t, 0.43, 0.97, 2.31) * 0.42;
    const hy = reduced ? 0 : wob(t + 11, 0.37, 1.13, 2.07) * 0.3;
    const hr = reduced ? 0 : wob(t + 23, 0.29, 0.83, 1.77) * 0.0055;

    camera.position.set(
      pos.current.x + pt.sx * 2.2 + hx,
      pos.current.y - pt.sy * 1.4 + hy,
      pos.current.z
    );
    look.current.x += pt.sx * 3.4;
    look.current.y -= pt.sy * 2.2;
    camera.lookAt(look.current);
    camera.rotation.z += hr + pt.sx * 0.02;

    // a DP swaps glass between setups; they do not zoom
    const active = SCENES.findIndex((sc) => p >= sc.a && p < sc.b);
    const idx = active < 0 ? SCENES.length - 1 : active;
    s.active = idx;
    const target = (2 * Math.atan(24 / (2 * SCENES[idx].lens)) * 180) / Math.PI + 18;
    fov.current += (target - fov.current) * 0.02;
    const cam = camera as THREE.PerspectiveCamera;
    if (Math.abs(cam.fov - fov.current) > 0.01) {
      cam.fov = fov.current;
      cam.updateProjectionMatrix();
    }

    focus.current += (focusAt(p) - focus.current) * 0.035;
    (focusRef as React.MutableRefObject<number>).current = focus.current;
  }, 0);

  return null;
}
