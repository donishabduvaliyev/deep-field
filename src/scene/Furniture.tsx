import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { shade } from "./shade";
import type { Box, Cyl } from "./shop";

/**
 * Every box and cylinder in the shop, batched by colour into one
 * instanced mesh each. Roughly eight draw calls for the entire interior.
 */
function useBatch<T extends { c: number }>(items: T[]) {
  return useMemo(() => {
    const byColour = new Map<number, T[]>();
    items.forEach((it) => {
      const arr = byColour.get(it.c) ?? [];
      arr.push(it);
      byColour.set(it.c, arr);
    });
    return [...byColour.entries()];
  }, [items]);
}

function Instances({
  geo, colour, items, kind,
}: {
  geo: THREE.BufferGeometry;
  colour: number;
  items: (Box | Cyl)[];
  kind: "box" | "round";
}) {
  const ref = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    items.forEach((it, i) => {
      e.set(it.rx, it.ry, 0);
      q.setFromEuler(e);
      const s =
        kind === "box"
          ? new THREE.Vector3(...(it as Box).s)
          : new THREE.Vector3((it as Cyl).r, (it as Cyl).h, (it as Cyl).r);
      m4.compose(new THREE.Vector3(...it.p), q, s);
      mesh.setMatrixAt(i, m4);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [items, kind]);

  return (
    <instancedMesh ref={ref} args={[geo, undefined, items.length]} frustumCulled={false}>
      <meshBasicMaterial attach="material" color={colour} vertexColors fog />
    </instancedMesh>
  );
}

export function Furniture({ boxes, cyls, taps }: { boxes: Box[]; cyls: Cyl[]; taps: Cyl[] }) {
  const geos = useMemo(
    () => ({
      box: shade(new THREE.BoxGeometry(1, 1, 1)),
      cyl: shade(new THREE.CylinderGeometry(1, 1, 1, 12)),
      // tapered: bowls, jars, the chair's flared cast base
      tap: shade(new THREE.CylinderGeometry(1, 0.42, 1, 14)),
    }),
    []
  );

  const boxBatches = useBatch(boxes);
  const cylBatches = useBatch(cyls);
  const tapBatches = useBatch(taps);

  return (
    <group>
      {boxBatches.map(([c, items]) => (
        <Instances key={`b${c}`} geo={geos.box} colour={c} items={items} kind="box" />
      ))}
      {cylBatches.map(([c, items]) => (
        <Instances key={`c${c}`} geo={geos.cyl} colour={c} items={items} kind="round" />
      ))}
      {tapBatches.map(([c, items]) => (
        <Instances key={`t${c}`} geo={geos.tap} colour={c} items={items} kind="round" />
      ))}
    </group>
  );
}
