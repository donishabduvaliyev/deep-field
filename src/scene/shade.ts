import * as THREE from "three";

/**
 * Flat colour makes every object a silhouette — a basin and a crate look
 * identical. So shading is baked into the geometry as vertex colours:
 * up-faces catch the overhead lamps and go warm, flanks fall off,
 * undersides go almost black. Costs nothing at runtime, and it is the
 * only reason any of this furniture reads as an object.
 */
export function shade(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const nrm = g.attributes.normal.array as ArrayLike<number>;
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  const cool = [0.82, 0.2, 0.53]; // direction of the cold window fill

  for (let i = 0; i < n; i++) {
    const nx = nrm[i * 3], ny = nrm[i * 3 + 1], nz = nrm[i * 3 + 2];
    const key = Math.max(ny, 0);                                  // lamps overhead
    const fill = Math.max(nx * cool[0] + ny * cool[1] + nz * cool[2], 0);
    const side = Math.max(-nz, 0);                                // turned to camera
    const under = Math.max(-ny, 0);
    let base = 0.2 + key * 1.05 + fill * 0.26 + side * 0.16 - under * 0.12;
    if (base < 0.06) base = 0.06;
    col[i * 3] = base * (1 + key * 0.16 + fill * 0.02);
    col[i * 3 + 1] = base * (1 + key * 0.02 + fill * 0.06);
    col[i * 3 + 2] = base * (1 - key * 0.14 + fill * 0.16);
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return g;
}
