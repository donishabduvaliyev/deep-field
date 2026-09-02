import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { END_Z, FOG_COLOR, FOG_DENSITY, SODIUM } from "./constants";
import { FOG_FN, SPRITE, VERT_UV } from "./glsl";
import type { Mirror, Practical } from "./shop";

const fogU = () => ({ uFogCol: { value: FOG_COLOR }, uFogDen: { value: FOG_DENSITY } });

/* ------------------------------------------------------------------ *
 * Practicals: every light in frame is a real fixture, and each throws a
 * volumetric shaft. The shaft is a billboarded card with a cone falloff —
 * far cheaper than raymarching and, in this much haze, indistinguishable.
 * ------------------------------------------------------------------ */
function Shaft({ p, w, h, colour, seed }: { p: [number, number, number]; w: number; h: number; colour: number; seed: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uCol: { value: new THREE.Color(colour) }, uSeed: { value: seed } },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: /* glsl */ `
          uniform float uTime, uSeed; uniform vec3 uCol; varying vec2 vUv;
          void main(){
            vec2 uv = vUv;
            float d = 1.0 - uv.y;                 // uv.y == 1 is the emitter
            float spread = 0.055 + d*0.42;
            float cone = 1.0 - smoothstep(spread*0.30, spread, abs(uv.x-0.5));
            float fall = pow(1.0 - d, 1.8);
            float mote = 0.84 + 0.16*sin(uv.y*34.0 - uTime*0.55 + uSeed*7.0);
            float a = cone*fall*mote*0.30;
            if(a < 0.003) discard;
            gl_FragColor = vec4(uCol, a);
          }`,
      }),
    [colour, seed]
  );

  useFrame((state) => {
    mat.uniforms.uTime.value = state.clock.elapsedTime;
    if (ref.current) ref.current.quaternion.copy(state.camera.quaternion);
  });

  return (
    <mesh ref={ref} material={mat} position={[p[0], p[1] - h / 2, p[2]]} frustumCulled={false}>
      <planeGeometry args={[w, h]} />
    </mesh>
  );
}

export function Practicals({ items }: { items: Practical[] }) {
  const bulbs = useRef<THREE.Mesh[]>([]);
  // a round source seen edge-on disappears, so bulbs face the camera
  useFrame((state) => {
    bulbs.current.forEach((m) => m && m.quaternion.copy(state.camera.quaternion));
  });

  return (
    <group>
      {items.map((L, i) => {
        const round = Math.abs(L.w - L.h) < 0.01;
        return (
          <group key={i}>
            <mesh
              ref={(el) => { if (round && el) bulbs.current[i] = el; }}
              position={L.p} rotation={[0, L.ry, 0]}
            >
              <planeGeometry args={[L.w, L.h]} />
              <meshBasicMaterial color={L.color} fog transparent opacity={0.95} side={THREE.DoubleSide} />
            </mesh>
            <Shaft p={L.p} w={L.sw} h={L.sh} colour={L.color} seed={i * 1.7} />
          </group>
        );
      })}
    </group>
  );
}

/* ------------------------------------------------------------------ */
export function Mirrors({ items }: { items: Mirror[] }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true, side: THREE.DoubleSide,
        uniforms: fogU(),
        vertexShader: VERT_UV,
        fragmentShader: /* glsl */ `
          ${FOG_FN}
          varying vec2 vUv; varying float vZ;
          void main(){
            vec2 uv = vUv;
            float e = min(min(uv.x,1.0-uv.x), min(uv.y,1.0-uv.y));
            float frame  = smoothstep(0.045, 0.0, e);
            float glass  = 0.020 + 0.055*pow(uv.y, 2.2);
            float bounce = pow(max(1.0-abs(uv.y-0.86)/0.16, 0.0), 2.0)*0.5;  // the strip light
            float smear  = pow(max(1.0-abs(uv.x-0.30)/0.30, 0.0), 3.0)*0.10;
            vec3 col = vec3(0.30,0.36,0.40)*glass + vec3(1.0,0.68,0.36)*(bounce+smear);
            col += vec3(0.55,0.38,0.22)*frame*0.7;
            gl_FragColor = vec4(applyFog(col, vZ), 0.94);
          }`,
      }),
    []
  );
  return (
    <group>
      {items.map((m, i) => (
        <mesh key={i} material={mat} position={m.p} rotation={[0, m.ry, 0]}>
          <planeGeometry args={[m.s[0], m.s[1]]} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
export function Pole({ at }: { at: [number, number, number] }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, ...fogU() },
        vertexShader: VERT_UV,
        fragmentShader: /* glsl */ `
          ${FOG_FN}
          uniform float uTime; varying vec2 vUv; varying float vZ;
          void main(){
            // helix: offset the band by the angle around the cylinder
            float s = fract(vUv.y*3.2 + vUv.x*1.0 - uTime*0.16);
            vec3 col = s < 0.34 ? vec3(0.62,0.10,0.10)
                     : (s < 0.67 ? vec3(0.72,0.70,0.66) : vec3(0.10,0.18,0.42));
            float round = sin(vUv.x*3.14159);
            col *= 0.28 + 0.72*round;
            col += vec3(1.0,0.72,0.42)*pow(round, 7.0)*0.30;
            gl_FragColor = vec4(applyFog(col, vZ), 1.0);
          }`,
      }),
    []
  );
  useFrame((s) => { mat.uniforms.uTime.value = s.clock.elapsedTime; });
  return (
    <mesh material={mat} position={at}>
      <cylinderGeometry args={[0.62, 0.62, 5.4, 18, 1, true]} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
export function Door() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, side: THREE.DoubleSide,
        uniforms: { uTime: { value: 0 }, uCol: { value: SODIUM }, ...fogU() },
        vertexShader: VERT_UV,
        fragmentShader: /* glsl */ `
          ${FOG_FN}
          uniform float uTime; uniform vec3 uCol; varying vec2 vUv; varying float vZ;
          void main(){
            // a doorway is a dark recess with a lit edge: the light is the
            // frame, not the hole
            float e = min(min(vUv.x,1.0-vUv.x), min(vUv.y,1.0-vUv.y));
            float edge  = smoothstep(0.055, 0.0, e);
            float glass = smoothstep(0.22, 0.055, e)*0.13;
            float bar   = smoothstep(0.012, 0.0, abs(vUv.y-0.62))*0.5;   // push bar
            float breathe = 0.92 + 0.08*sin(uTime*0.5);
            vec3 col = uCol*(edge*1.15 + glass + bar*0.6)*breathe;
            float a = edge*0.90 + glass*0.60 + bar*0.35;
            if(a < 0.004) discard;
            gl_FragColor = vec4(applyFog(col, vZ), a);
          }`,
      }),
    []
  );
  useFrame((s) => { mat.uniforms.uTime.value = s.clock.elapsedTime; });
  return (
    <mesh material={mat} position={[0, -1.9, END_Z + 0.5]}>
      <planeGeometry args={[5.4, 10.0]} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
export function Fan({ at }: { at: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((s) => { if (ref.current) ref.current.rotation.y = s.clock.elapsedTime * 0.55; });
  return (
    <group ref={ref} position={at}>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} rotation={[0, (i * Math.PI) / 2, 0]}>
          <boxGeometry args={[7, 0.1, 0.9]} />
          <meshBasicMaterial color={0x07080a} fog />
        </mesh>
      ))}
      <mesh>
        <cylinderGeometry args={[0.5, 0.5, 0.7, 10]} />
        <meshBasicMaterial color={0x07080a} fog />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
export function Dust({ count }: { count: number }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uDpr: { value: Math.min(window.devicePixelRatio || 1, 1.75) }, ...fogU() },
        vertexShader: /* glsl */ `
          attribute float aSeed; attribute float aSize;
          uniform float uTime, uDpr, uFogDen;
          varying float vA;
          void main(){
            vec3 p = position;
            p.y -= mod(uTime*(0.22 + aSeed*0.30) + aSeed*18.0, 18.0) - 9.0;
            p.x += sin(uTime*0.24 + aSeed*24.0)*0.8;
            p.z += cos(uTime*0.17 + aSeed*17.0)*0.7;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = min(aSize*uDpr*(120.0/max(-mv.z, 1.0)), 7.0*uDpr);
            vA = exp(-uFogDen*uFogDen*mv.z*mv.z) * (0.25 + 0.75*aSeed);
          }`,
        fragmentShader: /* glsl */ `
          ${SPRITE}
          varying float vA;
          void main(){
            float a = sprite(gl_PointCoord);
            if(a < 0.02) discard;
            gl_FragColor = vec4(vec3(0.80,0.74,0.66), a*vA*0.20);
          }`,
      }),
    []
  );

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    const size = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 22;
      pos[i * 3 + 1] = Math.random() * 15 - 7;
      pos[i * 3 + 2] = -Math.random() * 490 + 15;
      seed[i] = Math.random();
      size[i] = 0.35 + Math.random() * 1.2;
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    return g;
  }, [count]);

  useFrame((s) => { mat.uniforms.uTime.value = s.clock.elapsedTime; });
  return <points geometry={geo} material={mat} frustumCulled={false} />;
}
