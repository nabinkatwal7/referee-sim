import * as THREE from "three";
import type { Vec2 } from "../match/events";

export type Vision = {
  inView: boolean; // outside the FOV cone entirely -> can't see it at all
  distance: number;
  angle: number; // radians off dead-center of view direction
  quality: number; // 0..1 — 0 = can't judge it, 1 = perfect view
};

export const REFEREE_FOV = (100 * Math.PI) / 180; // ~100 degree cone
const SHARP_DISTANCE = 15; // within this, distance barely hurts quality
const MAX_DISTANCE = 45; // beyond this, effectively can't judge it

const toTarget = new THREE.Vector3();

// Position + direction + FOV + distance, combined into one quality score.
// A bad angle (near the edge of the cone, or far away) makes `quality` low;
// outside the cone at all, `inView` is false and quality is 0.
export const computeVision = (
  refereePos: Vec2,
  refereeDir: THREE.Vector3, // normalized, flattened to XZ
  targetPos: Vec2,
): Vision => {
  toTarget.set(targetPos.x - refereePos.x, 0, targetPos.z - refereePos.z);
  const distance = toTarget.length();

  if (distance < 0.01) {
    return { inView: true, distance: 0, angle: 0, quality: 1 };
  }

  toTarget.normalize();
  const angle = Math.acos(THREE.MathUtils.clamp(refereeDir.dot(toTarget), -1, 1));
  const halfFov = REFEREE_FOV / 2;
  const inView = angle <= halfFov;

  if (!inView) {
    return { inView, distance, angle, quality: 0 };
  }

  const angleFactor = 1 - angle / halfFov; // 1 = dead center, 0 = edge of the cone
  const distanceFactor =
    1 - THREE.MathUtils.clamp((distance - SHARP_DISTANCE) / (MAX_DISTANCE - SHARP_DISTANCE), 0, 1);
  const quality = THREE.MathUtils.clamp(angleFactor * 0.5 + distanceFactor * 0.5, 0, 1);

  return { inView, distance, angle, quality };
};

// Whether the referee actually gets the call right, weighted by how well
// they saw it. A bad angle or a missed view means the call is more likely
// to go the wrong way (foul missed, offside missed, etc.).
export const decideCall = (vision: Vision): boolean => {
  if (!vision.inView) return false;
  return Math.random() < vision.quality;
};
