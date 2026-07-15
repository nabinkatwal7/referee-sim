import { interactionGroups } from "@react-three/rapier";

// Soft character feel: players/ref don't physically collide with each other.
// Spacing is AI repulsion (avoidance.ts). They still hit world + ball.
export const GROUP_WORLD = 0;
export const GROUP_PLAYER = 1;
export const GROUP_BALL = 2;

export const worldCollisionGroups = interactionGroups(
  [GROUP_WORLD],
  [GROUP_WORLD, GROUP_PLAYER, GROUP_BALL],
);

export const playerCollisionGroups = interactionGroups(
  [GROUP_PLAYER],
  [GROUP_WORLD, GROUP_BALL],
);

export const ballCollisionGroups = interactionGroups(
  [GROUP_BALL],
  [GROUP_WORLD, GROUP_PLAYER],
);
