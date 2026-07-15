import type { RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { applySteering } from "./avoidance";
import {
  createStamina,
  staminaSpeedFactor,
  stepStamina,
  type StaminaState,
} from "./stamina";
import type { Pos2 } from "../Ball/nearestPlayer";

const WALK_SPEED = 2.5;
const RUN_SPEED = 6;
const RUN_DISTANCE = 8;
const ARRIVE_RADIUS = 0.5;
const WANDER_RADIUS = 15;
const MIN_PAUSE = 1;
const MAX_PAUSE = 3;

export type PlayerFSMState =
  | "idle"
  | "move"
  | "receive"
  | "dribble"
  | "pass"
  | "shoot"
  | "tackle"
  | "celebrate"
  | "press"
  | "recover";

const FREEZE_STATES = new Set<PlayerFSMState>([
  "pass",
  "shoot",
  "tackle",
  "celebrate",
]);

const BRAIN_DRIVEN = new Set<PlayerFSMState>([
  "receive",
  "dribble",
  "press",
  "recover",
]);

export type PlayerAIState = {
  home: [number, number, number];
  target: THREE.Vector3;
  elapsed: number;
  pauseUntil: number;
  fsmState: PlayerFSMState;
  stateTimer: number;
  preferredFoot: 1 | -1;
  stamina: StaminaState;
};

const randomPause = () => MIN_PAUSE + Math.random() * (MAX_PAUSE - MIN_PAUSE);

const randomTarget = (home: [number, number, number]) => {
  const angle = Math.random() * Math.PI * 2;
  const radius = Math.random() * WANDER_RADIUS;
  return new THREE.Vector3(
    home[0] + Math.cos(angle) * radius,
    home[1],
    home[2] + Math.sin(angle) * radius,
  );
};

export const createPlayerAIState = (
  home: [number, number, number],
): PlayerAIState => ({
  home,
  target: randomTarget(home),
  elapsed: 0,
  pauseUntil: randomPause(),
  fsmState: "idle",
  stateTimer: 0,
  preferredFoot: Math.random() < 0.75 ? 1 : -1,
  stamina: createStamina(),
});

export const enterReactionState = (
  state: PlayerAIState,
  fsmState: Exclude<PlayerFSMState, "idle" | "move" | "receive" | "dribble">,
  duration: number,
) => {
  state.fsmState = fsmState;
  state.stateTimer = duration;
};

export const stepPlayerAI = (
  body: RapierRigidBody,
  state: PlayerAIState,
  delta: number,
  neighbors: Pos2[] = [],
) => {
  const linvel = body.linvel();
  const speed = Math.hypot(linvel.x, linvel.z);
  stepStamina(state.stamina, speed, delta);

  if (FREEZE_STATES.has(state.fsmState)) {
    body.setLinvel({ x: 0, y: linvel.y, z: 0 }, true);
    state.stateTimer -= delta;
    if (state.stateTimer <= 0) state.fsmState = "move";
    return;
  }

  if (BRAIN_DRIVEN.has(state.fsmState)) {
    return;
  }

  state.elapsed += delta;

  if (state.elapsed < state.pauseUntil) {
    state.fsmState = "idle";
    body.setLinvel({ x: 0, y: linvel.y, z: 0 }, true);
    return;
  }

  const pos = body.translation();
  const toTarget = new THREE.Vector3(
    state.target.x - pos.x,
    0,
    state.target.z - pos.z,
  );
  const distance = toTarget.length();

  if (distance < ARRIVE_RADIUS) {
    state.fsmState = "idle";
    body.setLinvel({ x: 0, y: linvel.y, z: 0 }, true);
    state.pauseUntil = state.elapsed + randomPause();
    state.target = randomTarget(state.home);
    return;
  }

  state.fsmState = "move";
  toTarget.normalize();
  const base = distance > RUN_DISTANCE ? RUN_SPEED : WALK_SPEED;
  const capped = base * staminaSpeedFactor(state.stamina);
  applySteering(body, { x: toTarget.x, z: toTarget.z }, capped, neighbors);
};
