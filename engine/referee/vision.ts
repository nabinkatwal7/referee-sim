import * as THREE from "three";
import type { Vec2 } from "../match/events";

export type Vision = {
  inView: boolean;
  distance: number;
  angle: number;
  obstructed: boolean;
  quality: number; // 0..1
};

export const REFEREE_FOV = (100 * Math.PI) / 180;
const SHARP_DISTANCE = 15;
const MAX_DISTANCE = 45;

const toTarget = new THREE.Vector3();

/**
 * Step 51 — Referee Vision.
 * Visible / distance / angle / obstructed → confidence (quality).
 */
export const computeVision = (
  refereePos: Vec2,
  refereeDir: THREE.Vector3,
  targetPos: Vec2,
  /** Other bodies that might block the line of sight (player xz). */
  blockers: Vec2[] = [],
): Vision => {
  toTarget.set(targetPos.x - refereePos.x, 0, targetPos.z - refereePos.z);
  const distance = toTarget.length();

  if (distance < 0.01) {
    return { inView: true, distance: 0, angle: 0, obstructed: false, quality: 1 };
  }

  toTarget.normalize();
  const angle = Math.acos(THREE.MathUtils.clamp(refereeDir.dot(toTarget), -1, 1));
  const halfFov = REFEREE_FOV / 2;
  const inView = angle <= halfFov;

  if (!inView) {
    return { inView, distance, angle, obstructed: false, quality: 0 };
  }

  // Obstruction: anyone near the ray segment between ref and target.
  let obstructed = false;
  const ux = toTarget.x;
  const uz = toTarget.z;
  for (const b of blockers) {
    const ox = b.x - refereePos.x;
    const oz = b.z - refereePos.z;
    const along = ox * ux + oz * uz;
    if (along < 1 || along > distance - 1) continue;
    const perp = Math.abs(ox * uz - oz * ux);
    if (perp < 0.9) {
      obstructed = true;
      break;
    }
  }

  const angleFactor = 1 - angle / halfFov;
  const distanceFactor =
    1 - THREE.MathUtils.clamp((distance - SHARP_DISTANCE) / (MAX_DISTANCE - SHARP_DISTANCE), 0, 1);
  let quality = THREE.MathUtils.clamp(angleFactor * 0.5 + distanceFactor * 0.5, 0, 1);
  if (obstructed) quality *= 0.45; // bad positioning / blocked view

  return { inView, distance, angle, obstructed, quality };
};

export const decideCall = (vision: Vision): boolean => {
  if (!vision.inView || vision.quality < 0.15) return false;
  return Math.random() < vision.quality;
};
