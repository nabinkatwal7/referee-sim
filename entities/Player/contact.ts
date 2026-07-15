// Step 49 — Contact System.
// Logical capsules per body part (no extra Rapier colliders — soft zones).

export type BodyPart = "foot" | "leg" | "body" | "head";

export type BodyZone = {
  part: BodyPart;
  /** Vertical offset from rigid-body origin (mid-capsule ~1m). */
  y: number;
  radius: number;
};

export const PLAYER_ZONES: BodyZone[] = [
  { part: "foot", y: -0.85, radius: 0.22 },
  { part: "leg", y: -0.45, radius: 0.28 },
  { part: "body", y: 0.05, radius: 0.38 },
  { part: "head", y: 0.75, radius: 0.22 },
];

export type ContactHit = {
  partA: BodyPart;
  partB: BodyPart;
  distance: number;
};

/** Closest zone pair between two players standing at (ax,az) / (bx,bz). */
export const closestContact = (
  ax: number,
  az: number,
  bx: number,
  bz: number,
): ContactHit => {
  let best: ContactHit = { partA: "body", partB: "body", distance: Infinity };
  for (const za of PLAYER_ZONES) {
    for (const zb of PLAYER_ZONES) {
      // Approximate 3D distance with flat XZ + Δy.
      const dx = ax - bx;
      const dy = za.y - zb.y;
      const dz = az - bz;
      const dist = Math.hypot(dx, dy, dz) - za.radius - zb.radius;
      if (dist < best.distance) {
        best = { partA: za.part, partB: zb.part, distance: dist };
      }
    }
  }
  return best;
};

export const isLegOrFoot = (p: BodyPart) => p === "foot" || p === "leg";
