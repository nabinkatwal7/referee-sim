import type { CharacterAnimation } from "./Character";
import type { PlayerFSMState } from "./Player/ai";
import type { KeeperFSMState } from "./Player/goalkeeper";

const JOG_THRESHOLD = 2.2;
const SPRINT_THRESHOLD = 4.0;

const locoFromSpeed = (speed: number): CharacterAnimation => {
  if (speed < 0.35) return "idle";
  if (speed >= SPRINT_THRESHOLD) return "sprint";
  if (speed >= JOG_THRESHOLD) return "walk"; // ponytail: no jog clip — walk reads mid-tempo
  return "walk";
};

// Maps FSM → CharacterAnimation for the procedural humanoid
// (walk/sprint cycles, kick / melee one-shots, etc.).
export const mapPlayerAnimation = (
  fsmState: PlayerFSMState,
  speed: number,
): CharacterAnimation => {
  switch (fsmState) {
    case "idle":
      return "idle";
    case "move":
    case "press":
    case "recover":
    case "dribble":
      return locoFromSpeed(speed);
    case "receive":
      return speed > 1.2 ? locoFromSpeed(speed) : "pick-up";
    case "pass":
    case "shoot":
      return "attack-kick-right";
    case "tackle":
      return "attack-melee-right";
    case "celebrate":
      return "emote-yes";
  }
};

export const mapKeeperAnimation = (
  fsmState: KeeperFSMState,
  speed: number,
): CharacterAnimation => {
  switch (fsmState) {
    case "idle":
      return "idle";
    case "track":
      return locoFromSpeed(Math.min(speed, JOG_THRESHOLD + 0.1));
    case "intercept":
      return "sprint";
    case "dive":
      return "attack-melee-right";
    case "catch":
      return "pick-up";
    case "kick":
      return "attack-kick-right";
  }
};

export const mapRefereeAnimation = (speed: number): CharacterAnimation =>
  locoFromSpeed(speed);
