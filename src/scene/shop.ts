import { C, FLOOR_Y, END_Z, ZONES } from "./constants";

/**
 * The shop, as data. Nothing here touches three.js — it produces plain
 * arrays that the components turn into instanced meshes. Want to move a
 * chair or add a shelf? It is all in this file.
 */

export type Box = { c: number; p: [number, number, number]; s: [number, number, number]; ry: number; rx: number };
export type Cyl = { c: number; p: [number, number, number]; r: number; h: number; ry: number; rx: number };
export type Practical = { p: [number, number, number]; w: number; h: number; ry: number; color: number; sw: number; sh: number };
export type Mirror = { p: [number, number, number]; s: [number, number]; ry: number };

export interface Shop {
  boxes: Box[];
  cyls: Cyl[];
  taps: Cyl[];        // tapered cylinders: bowls, jars, chair bases
  practicals: Practical[];
  mirrors: Mirror[];
  fanAt: [number, number, number];
  poleAt: [number, number, number];
}

export function buildShop(): Shop {
  const boxes: Box[] = [], cyls: Cyl[] = [], taps: Cyl[] = [];
  const practicals: Practical[] = [], mirrors: Mirror[] = [];

  const box = (c: number, x: number, y: number, z: number, sx: number, sy: number, sz: number, ry = 0, rx = 0) =>
    boxes.push({ c, p: [x, y, z], s: [sx, sy, sz], ry, rx });
  const cyl = (c: number, x: number, y: number, z: number, r: number, h: number, ry = 0, rx = 0) =>
    cyls.push({ c, p: [x, y, z], r, h, ry, rx });
  const tap = (c: number, x: number, y: number, z: number, r: number, h: number, ry = 0, rx = 0) =>
    taps.push({ c, p: [x, y, z], r, h, ry, rx });
  const light = (x: number, y: number, z: number, w: number, h: number, ry: number, color: number, sw: number, sh: number) =>
    practicals.push({ p: [x, y, z], w, h, ry, color, sw, sh });
  const mirror = (x: number, y: number, z: number, w: number, h: number, ry = 0) =>
    mirrors.push({ p: [x, y, z], s: [w, h], ry });

  /* ---- thresholds: the wall and header caps that make each room a room ---- */
  for (let i = 0; i < ZONES.length - 1; i++) {
    const [, , z1, hw, cy] = ZONES[i];
    const [, , , nhw, ncy] = ZONES[i + 1];
    const minW = Math.min(hw, nhw), maxW = Math.max(hw, nhw);
    const minC = Math.min(cy, ncy), maxC = Math.max(cy, ncy);
    if (maxW - minW > 0.01) {
      [-1, 1].forEach((s) =>
        box(C.BLOCK, (s * (minW + maxW)) / 2, (FLOOR_Y + maxC) / 2, z1, maxW - minW, maxC - FLOOR_Y, 0.6)
      );
    }
    if (maxC - minC > 0.01) box(C.BLOCK, 0, (minC + maxC) / 2, z1, minW * 2, maxC - minC, 0.6);
    const fw = minW - 0.35, fh = minC - 0.5;
    box(C.WOOD2, -fw, (FLOOR_Y + fh) / 2, z1, 0.5, fh - FLOOR_Y, 0.7);
    box(C.WOOD2, fw, (FLOOR_Y + fh) / 2, z1, 0.5, fh - FLOOR_Y, 0.7);
    box(C.WOOD2, 0, fh, z1, fw * 2 + 0.5, 0.5, 0.7);
  }
  box(C.BLOCK, 0, 2, END_Z, 14, 20, 0.6);

  /* ---- a barber chair: base, column, pump lever, seat, raked back,
         headrest, armrests on posts, and the footrest that identifies it ---- */
  const chair = (x: number, z: number, yaw: number, recline = -0.16) => {
    const cs = Math.cos(yaw), sn = Math.sin(yaw);
    tap(C.CHROME, x, FLOOR_Y + 0.3, z, 2.0, 0.6);
    cyl(C.CHROME, x, FLOOR_Y + 0.75, z, 1.15, 0.4);
    cyl(C.CHROME, x, FLOOR_Y + 1.7, z, 0.48, 2.0);
    cyl(C.CHROME, x + 1.0 * sn, FLOOR_Y + 1.1, z - 1.0 * cs, 0.1, 1.5, yaw, 1.15);
    box(C.HIDE, x, FLOOR_Y + 2.95, z, 3.0, 0.85, 3.0, yaw);
    box(C.DARK, x, FLOOR_Y + 2.45, z, 3.2, 0.28, 3.2, yaw);
    box(C.HIDE, x - 1.25 * cs, FLOOR_Y + 4.75, z - 1.25 * sn, 3.0, 3.5, 0.8, yaw, recline);
    box(C.DARK, x - 1.42 * cs, FLOOR_Y + 4.75, z - 1.42 * sn, 3.2, 3.7, 0.22, yaw, recline);
    box(C.HIDE, x - 1.62 * cs, FLOOR_Y + 6.6, z - 1.62 * sn, 1.7, 1.0, 0.7, yaw, recline);
    box(C.DARK, x - 1.6 * sn, FLOOR_Y + 3.75, z + 1.6 * cs, 0.55, 0.38, 2.9, yaw);
    box(C.DARK, x + 1.6 * sn, FLOOR_Y + 3.75, z - 1.6 * cs, 0.55, 0.38, 2.9, yaw);
    box(C.CHROME, x + 1.9 * cs, FLOOR_Y + 1.45, z + 1.9 * sn, 1.7, 0.16, 1.1, yaw, 0.42);
    cyl(C.CHROME, x + 1.35 * cs, FLOOR_Y + 1.05, z + 1.35 * sn, 0.09, 1.0, yaw, 0.5);
  };

  /* ---- a wall station: mirror, strip light, counter, bottles ---- */
  const station = (z: number, wallX: number, side: number) => {
    mirror(wallX + side * 0.22, 1.4, z, 4.2, 5.6, (side * Math.PI) / 2);
    box(C.WOOD, wallX + side * 1.0, -2.6, z, 2.0, 0.28, 5.2);
    for (let k = 0; k < 4; k++)
      cyl(C.GLASS, wallX + side * (1.0 + (k % 2) * 0.5), -2.0, z - 1.7 + k * 1.1, 0.17, 0.8 + (k % 3) * 0.35);
    light(wallX + side * 0.5, 4.4, z, 0.5, 4.6, (side * Math.PI) / 2, 0xffc890, 9, 12);
  };

  /* ================= 01 RECEPTION — low, warm, wooden ================= */
  box(C.WOOD, -4.2, -4.6, -14, 5.0, 2.4, 3.2, 0.12);
  box(C.WOOD, -4.2, -3.3, -14, 5.4, 0.3, 3.6, 0.12);
  box(C.CLOTH, -4.4, -3.05, -14.4, 1.5, 0.14, 1.1, 0.3);       // the appointment book
  cyl(C.WOOD2, -2.6, -2.6, -15.6, 0.1, 1.4);
  light(-2.6, -1.8, -15.6, 0.9, 0.9, 0, 0xffc07a, 7, 7);        // lamp on the book
  cyl(C.GLASS, -6.6, -5.2, -19.5, 0.9, 3.4);                    // stool
  for (let i = 0; i < 5; i++) cyl(C.WOOD2, 6.2, 1.2, -8 - i * 2.6, 0.1, 0.7, 0, Math.PI / 2);
  light(0, 3.2, -22, 1.4, 1.4, 0, 0xffb066, 13, 12);
  box(C.WOOD, 6.4, 0.6, -26, 0.4, 3.0, 1.6);

  /* ================= 02 WAITING — daylight, a clock, benches ========== */
  for (let i = 0; i < 3; i++) {
    const z = -46 - i * 18;
    box(C.WOOD, 7.6, -5.1, z, 2.2, 0.4, 9);
    box(C.WOOD, 8.7, -3.9, z, 0.4, 2.4, 9);
    cyl(C.WOOD, 7.6, -6.2, z - 3.6, 0.16, 1.6);
    cyl(C.WOOD, 7.6, -6.2, z + 3.6, 0.16, 1.6);
  }
  box(C.WOOD, 5.0, -5.6, -70, 2.0, 0.25, 3.0);
  box(C.CLOTH, 5.0, -5.4, -70, 1.1, 0.06, 1.5, 0.4);
  box(C.CLOTH, 5.0, -5.3, -70.6, 1.0, 0.06, 1.4, -0.2);
  cyl(C.WOOD2, -8.6, 2.6, -60, 1.5, 0.24, 0, Math.PI / 2);      // wall clock
  light(8.9, 0.6, -52, 0.4, 8.0, -Math.PI / 2, 0x9fd0dc, 22, 20);
  light(8.9, 0.6, -86, 0.4, 8.0, -Math.PI / 2, 0x9fd0dc, 22, 20);
  light(0, 5.2, -66, 1.4, 1.4, 0, 0xffb066, 15, 15);
  for (let f = 0; f < 5; f++) box(C.WOOD2, -8.85, 1.4 + (f % 3) * 0.7, -40 - f * 13, 0.16, 1.9, 1.4);

  /* ================= 03 THE CUTTING FLOOR — the hall opens ============ */
  [-118, -142, -166].forEach((z, i) => {
    station(z, -14, 1);
    chair(-8.2, z, -Math.PI / 2 + (i % 2 ? 0.16 : -0.13));
  });
  for (let p = 0; p < 3; p++) light(0, 9.2, -112 - p * 26, 1.6, 1.6, 0, 0xffb066, 17, 19);
  for (let f = 0; f < 4; f++) box(C.WOOD2, 13.85, 2.0 + (f % 2) * 1.2, -112 - f * 17, 0.16, 2.2, 1.7);

  /* ================= 04 CAPACITY — a double-sided island, aisle right == */
  {
    const ZI = -226;
    box(C.WOOD, -4.5, -1.0, ZI, 17.0, 12.0, 1.8);
    box(C.WOOD2, -4.5, 5.2, ZI, 17.4, 0.5, 2.4);
    box(C.WOOD, -4.5, -3.0, ZI + 1.5, 17.0, 0.32, 2.2);
    box(C.WOOD, -4.5, -3.0, ZI - 1.5, 17.0, 0.32, 2.2);
    box(C.WOOD2, -4.5, -5.2, ZI, 17.0, 0.4, 3.6);
    [-10.0, -5.5, -1.0].forEach((x, i) => {
      mirror(x, 0.7, ZI + 0.95, 3.6, 5.2);
      chair(x, ZI + 7.0, 0.0 + (i % 2 ? 0.06 : -0.05));
      light(x, 7.4, ZI + 2.2, 1.2, 1.2, 0, i === 1 ? 0x6f8f96 : 0xffb066, 13, 15);
      cyl(C.GLASS, x - 1.1, -2.5, ZI + 1.5, 0.18, 0.9);
      cyl(C.GLASS, x + 0.1, -2.4, ZI + 1.5, 0.16, 1.1);
      box(C.WOOD2, x + 1.2, -2.72, ZI + 1.5, 0.8, 0.28, 0.5, 0.2);
      cyl(C.WOOD2, x + 1.2, -2.8, ZI + 2.0, 0.05, 1.2, 0, 1.3);
      box(C.CLOTH, x - 1.9, -2.68, ZI + 1.5, 1.0, 0.36, 1.4);
    });
    mirror(-5.5, 0.7, ZI - 0.95, 3.6, 5.2, Math.PI);
    chair(-5.5, ZI - 7.0, Math.PI);
    light(-5.5, 7.4, ZI - 2.2, 1.2, 1.2, 0, 0xffb066, 13, 15);
    box(C.WOOD, 13.2, -3.4, -212, 1.0, 4.6, 26);
    for (let k = 0; k < 8; k++) cyl(C.GLASS, 12.4, -0.9, -200 - k * 3.4, 0.18, 0.9 + (k % 3) * 0.3);
    for (let t = 0; t < 5; t++) box(C.CLOTH, 12.6, -0.85, -234 + t * 2.2, 1.2, 0.5, 1.6, 0.1);
    cyl(C.WOOD2, 10.4, -5.2, -238, 0.85, 3.2);
    light(9.0, 8.4, -206, 1.3, 1.3, 0, 0xffb066, 14, 16);
    light(9.0, 8.4, -244, 1.3, 1.3, 0, 0xffb066, 14, 16);
  }

  /* ================= 05 THE WASH — backwash units ===================== */
  [-272, -292, -312].forEach((z) => {
    const x = -6.6;
    box(C.CAB, x - 0.9, -4.9, z, 2.6, 4.2, 4.4);
    box(C.CAB, x - 0.9, -2.7, z, 2.8, 0.3, 4.6);
    tap(C.PORC, x, -1.85, z, 1.45, 1.5);                        // the ceramic bowl
    cyl(C.PORC, x, -2.55, z, 0.62, 0.5);
    box(C.PORC, x + 1.3, -1.55, z, 0.9, 0.55, 2.9);             // neck rest lip
    cyl(C.CHROME, x - 1.15, -0.75, z, 0.1, 1.7);
    box(C.CHROME, x - 0.8, 0.02, z, 0.9, 0.14, 0.14);           // spout
    cyl(C.CHROME, x - 1.15, -1.3, z - 0.45, 0.05, 1.5, 0, 0.9); // hose
    cyl(C.CHROME, x - 1.15, -1.55, z + 0.42, 0.07, 0.5, 0, 0.4);
    chair(-2.6, z, -Math.PI / 2, -0.62);                        // reclined into it
    box(C.CLOTH, -2.6, -0.35, z, 1.5, 0.22, 1.2, 0.05);
    light(x - 0.4, 3.2, z, 2.8, 0.5, 0, 0x9fd8e2, 11, 10);
  });
  box(C.CAB, 6.8, -1.2, -292, 1.2, 0.24, 12);
  for (let k = 0; k < 8; k++) tap(C.GLASS, 6.8, -0.6, -304 + k * 3.0, 0.3, 1.1);
  for (let s = 0; s < 4; s++) box(C.CLOTH, 6.8, -3.4 + s * 0.62, -276, 1.5, 0.55, 2.0);
  light(0, 4.0, -292, 5.0, 0.6, 0, 0x8fc4d0, 15, 12);

  /* ================= 06 ONE STATION — close enough to read =========== */
  {
    const z = -350, WX = -6;
    station(z, WX, 1);
    box(C.WOOD, WX + 1.3, -4.4, z, 2.6, 3.6, 6.4);
    box(C.WOOD, WX + 1.35, -2.5, z, 2.8, 0.28, 6.8);
    for (let d = 0; d < 3; d++) {
      box(C.WOOD2, WX + 2.62, -3.1 - d * 1.05, z, 0.14, 0.85, 6.0);
      cyl(C.CHROME, WX + 2.72, -3.1 - d * 1.05, z, 0.07, 1.2, 0, 1.5708);
    }
    tap(C.GLASS, WX + 1.5, -1.95, z - 2.2, 0.34, 1.0);                 // jar of combs
    for (let c = 0; c < 5; c++)
      cyl(C.CHROME, WX + 1.5 + (c - 2) * 0.12, -1.45, z - 2.2, 0.045, 1.3, 0, 0.12 * (c - 2));
    cyl(C.GLASS, WX + 1.5, -1.9, z - 0.9, 0.22, 1.1);
    cyl(C.GLASS, WX + 1.5, -2.0, z - 0.3, 0.19, 0.9);
    cyl(C.GLASS, WX + 1.5, -1.85, z + 0.3, 0.24, 1.2);
    box(C.WOOD2, WX + 1.5, -2.2, z + 1.4, 0.9, 0.32, 0.55, 0.05);      // clippers
    box(C.CHROME, WX + 1.5, -2.2, z + 1.75, 0.8, 0.18, 0.22, 0.05);
    cyl(C.WOOD2, WX + 1.5, -2.3, z + 2.4, 0.05, 1.5, 0, 1.35);
    box(C.CHROME, WX + 1.9, -2.28, z + 2.9, 0.55, 0.1, 0.2, 0.7);      // open scissors
    box(C.CHROME, WX + 1.9, -2.28, z + 2.9, 0.55, 0.1, 0.2, -0.5);
    box(C.CLOTH, WX + 1.5, -2.24, z - 3.1, 1.0, 0.2, 1.4);
    box(C.CLOTH, WX + 2.55, -3.0, z - 1.6, 0.24, 1.6, 1.5, 0.06);
    box(C.WOOD2, WX + 0.35, -0.6, z + 2.9, 0.2, 3.2, 1.9, 0.03);       // cape on a hook
    cyl(C.CHROME, WX + 0.35, 1.15, z + 2.9, 0.07, 0.6, 0, 1.5708);
    chair(-1.4, z, -Math.PI / 2 + 0.05);
    light(0, 3.0, -364, 1.1, 1.1, 0, 0xffb066, 11, 11);
  }

  /* ================= 07 THE BACK — concrete, one bare bulb =========== */
  for (let s = 0; s < 4; s++) {
    box(C.BLOCK, -5.4, -5.6 + s * 2.0, -398, 1.6, 0.16, 30);
    box(C.BLOCK, 5.4, -5.6 + s * 2.0, -398, 1.6, 0.16, 30);
  }
  for (let b = 0; b < 16; b++) {
    const sx = (b % 2 ? 1 : -1) * 5.2;
    const sy = -5.2 + Math.floor((b / 2) % 4) * 2.0;
    box(C.WOOD2, sx, sy, -386 - (b % 7) * 4.4, 1.2, 1.0, 1.4, (b % 3) * 0.1);
  }
  for (let t = 0; t < 7; t++) cyl(C.WOOD2, -4.6, -0.6, -388 - t * 3.2, 0.09, 1.1, 0, 0.2);
  cyl(C.WOOD2, 0, 2.2, -400, 0.05, 1.4);
  light(0, 1.0, -400, 0.8, 0.8, 0, 0xffd8a8, 9, 9);

  /* ================= 08 THE WAY OUT ================================== */
  cyl(0x22262a, -4.4, 1.9, -448, 0.78, 0.5);
  cyl(0x22262a, -4.4, -3.9, -448, 0.78, 0.5);
  light(-4.4, -1.0, -446.8, 1.3, 5.4, 0, 0xff9e4a, 7, 9);
  light(0, -1.9, END_Z + 1.4, 4.4, 8.6, 0, 0x86b6c4, 15, 14);   // daylight behind the door

  return {
    boxes, cyls, taps, practicals, mirrors,
    fanAt: [0, 9.6, -150],
    poleAt: [-4.4, -1.0, -448],
  };
}
