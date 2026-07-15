import * as THREE from "three";
import type { RigidBody as RapierRigidBody } from "@dimforge/rapier3d-compat";
import type { Camera } from "three";

const WALK_SPEED = 3.5;
const SPRINT_SPEED = 7;

const forwardVec = new THREE.Vector3();
const rightVec = new THREE.Vector3();
const moveDir = new THREE.Vector3();
const worldUp = new THREE.Vector3(0, 1, 0);

export type RefereeInput = {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
};

// WASD/Shift translation relative to wherever the camera is currently
// facing. Pure function — no React, no hooks — driven by the engine's
// updateReferee phase instead of the component's own frame loop.
export const stepRefereeMovement = (body: RapierRigidBody, camera: Camera, input: RefereeInput) => {
  camera.getWorldDirection(forwardVec);
  forwardVec.y = 0;
  forwardVec.normalize();
  rightVec.crossVectors(forwardVec, worldUp).negate();

  moveDir.set(0, 0, 0);
  if (input.forward) moveDir.add(forwardVec);
  if (input.back) moveDir.sub(forwardVec);
  if (input.right) moveDir.add(rightVec);
  if (input.left) moveDir.sub(rightVec);

  const linvel = body.linvel();
  if (moveDir.lengthSq() > 0) {
    moveDir.normalize();
    const speed = input.sprint ? SPRINT_SPEED : WALK_SPEED;
    body.setLinvel({ x: moveDir.x * speed, y: linvel.y, z: moveDir.z * speed }, true);
  } else {
    body.setLinvel({ x: 0, y: linvel.y, z: 0 }, true);
  }
};
