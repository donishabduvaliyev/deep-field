import { useMemo } from "react";
import * as THREE from "three";
import { FLOOR_Y, FOG_COLOR, FOG_DENSITY, ZONES } from "./constants";
import { FOG_FN, VERT_WORLD } from "./glsl";

const fogUniforms = () => ({
  uFogCol: { value: FOG_COLOR },
  uFogDen: { value: FOG_DENSITY },
});

/** Four floor treatments: wood, barbershop check, small wet tile, concrete. */
function makeFloorMat(kind: number) {
  return new THREE.ShaderMaterial({
    uniforms: { uKind: { value: kind }, ...fogUniforms() },
    vertexShader: VERT_WORLD,
    fragmentShader: /* glsl */ `
      ${FOG_FN}
      uniform float uKind; varying vec3 vP; varying float vZ;
      float grid(vec2 uv, float s){ vec2 f = fract(uv/s); return min(min(f.x,1.0-f.x), min(f.y,1.0-f.y)); }
      void main(){
        vec3 col;
        if(uKind < 0.5){                                  // wood boards
          float b = fract(vP.x*0.28);
          float seam = smoothstep(0.045, 0.0, min(b, 1.0-b));
          float grain = 0.5 + 0.5*sin(vP.y*3.1 + floor(vP.x*0.28)*11.0);
          col = mix(vec3(0.040,0.028,0.019), vec3(0.055,0.038,0.025), grain);
          col *= 1.0 - seam*0.55;
        } else if(uKind < 1.5){                           // barbershop check
          vec2 g = floor(vec2(vP.x, vP.y)/3.2);
          float chk = mod(g.x + g.y, 2.0);
          col = mix(vec3(0.017,0.019,0.022), vec3(0.058,0.061,0.066), chk);
          col *= smoothstep(0.0, 0.035, grid(vec2(vP.x,vP.y), 3.2))*0.55 + 0.45;
        } else if(uKind < 2.5){                           // small wet tile
          col = vec3(0.030,0.036,0.038);
          col *= smoothstep(0.0, 0.06, grid(vec2(vP.x,vP.y), 1.1))*0.5 + 0.5;
          col += vec3(0.10,0.22,0.26) * pow(max(1.0-abs(vP.x)/4.0, 0.0), 2.0) * 0.5;
        } else {                                          // poured concrete
          float n = fract(sin(dot(floor(vec2(vP.x,vP.y)*1.4), vec2(12.99,78.23)))*43758.5);
          col = vec3(0.026,0.026,0.027) + n*0.010;
        }
        // every ceiling lamp pools on the floor beneath it
        float lz = mod(-vP.y + 20.0, 50.0);
        float pool = pow(max(1.0-abs(lz-25.0)/9.0, 0.0), 2.6) * pow(max(1.0-abs(vP.x)/5.5, 0.0), 1.8);
        col += vec3(1.0,0.60,0.28) * pool * 0.34;
        gl_FragColor = vec4(applyFog(col, vZ), 1.0);
      }`,
  });
}

/** Papered wall with wainscot, white subway tile, or bare block. */
function makeWallMat(kind: number) {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { uKind: { value: kind }, ...fogUniforms() },
    vertexShader: VERT_WORLD,
    fragmentShader: /* glsl */ `
      ${FOG_FN}
      uniform float uKind; varying vec3 vP; varying float vZ;
      void main(){
        float y = vP.y; vec3 col;
        if(uKind < 1.5){
          float stripe = step(0.5, fract(vP.x*0.42));
          vec3 up = mix(vec3(0.030,0.028,0.027), vec3(0.043,0.039,0.036), stripe);
          col = mix(vec3(0.014,0.015,0.017), up, step(-1.2, y));
          col += vec3(0.30,0.20,0.12) * smoothstep(0.10, 0.0, abs(y+1.2)) * 0.30;
        } else if(uKind < 2.5){
          float row = floor(y*1.5);
          float ox = mod(row, 2.0)*0.5;
          vec2 f = fract(vec2(vP.x*0.75 + ox, y*1.5));
          float gt = min(min(f.x,1.0-f.x), min(f.y,1.0-f.y));
          col = vec3(0.085,0.093,0.096) * (smoothstep(0.0,0.07,gt)*0.55 + 0.45);
        } else {
          float n = fract(sin(dot(floor(vec2(vP.x,y)*0.8), vec2(41.3,289.1)))*43758.5);
          col = vec3(0.022,0.023,0.024) + n*0.009;
          col *= smoothstep(0.0, 0.05, min(fract(y*0.35), 1.0-fract(y*0.35)))*0.4 + 0.6;
        }
        gl_FragColor = vec4(applyFog(col, vZ), 1.0);
      }`,
  });
}

export function Architecture() {
  const { floorMats, wallMats, ceilMat, planeGeo } = useMemo(() => {
    const f: Record<number, THREE.Material> = {};
    const w: Record<number, THREE.Material> = {};
    [0, 1, 2, 3].forEach((k) => { f[k] = makeFloorMat(k); w[k] = makeWallMat(k); });
    return {
      floorMats: f,
      wallMats: w,
      ceilMat: new THREE.MeshBasicMaterial({ color: 0x090a0c, fog: true }),
      planeGeo: new THREE.PlaneGeometry(1, 1),
    };
  }, []);

  return (
    <group>
      {ZONES.map(([name, z0, z1, hw, cy, fk, wk]) => {
        const len = Math.abs(z1 - z0), mid = (z0 + z1) / 2;
        return (
          <group key={name}>
            <mesh geometry={planeGeo} material={floorMats[fk]}
                  position={[0, FLOOR_Y, mid]} rotation={[-Math.PI / 2, 0, 0]}
                  scale={[hw * 2, len, 1]} />
            <mesh geometry={planeGeo} material={ceilMat}
                  position={[0, cy, mid]} rotation={[Math.PI / 2, 0, 0]}
                  scale={[hw * 2, len, 1]} />
            {[-1, 1].map((s) => (
              <mesh key={s} geometry={planeGeo} material={wallMats[wk]}
                    position={[s * hw, (cy + FLOOR_Y) / 2, mid]}
                    rotation={[0, s > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}
                    scale={[len, cy - FLOOR_Y, 1]} />
            ))}
          </group>
        );
      })}
    </group>
  );
}
