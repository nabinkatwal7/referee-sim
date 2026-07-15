import type { CharacterAnimation } from "./Character";
import type { PlayerFSMState } from "./Player/ai";
import type { KeeperFSMState } from "./Player/goalkeeper";

const SPRINT_THRESHOLD = 4; // m/s — matches the midpoint between WALK_SPEED and RUN_SPEED

// Maps our FSM states onto the clips the Kenney model actually ships. A few
// are best-fit stand-ins rather than exact matches (no dedicated "shoot" or
// "tackle" clip exists) — see entities/Character.tsx for the full list.
export const mapPlayerAnimation = (
  fsmState: PlayerFSMState,
  speed: number,
): CharacterAnimation => {
  switch (fsmState) {
    case "idle":
      return "idle";
    case "move":
    case "press":
      return speed >= SPRINT_THRESHOLD ? "sprint" : "walk";
    case "recover":
      return "walk";
    case "receive":
      return "pick-up";
    case "dribble":
      return speed >= SPRINT_THRESHOLD ? "sprint" : "walk";
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
      return speed > 0.4 ? "walk" : "idle";
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

export const mapRefereeAnimation = (speed: number): CharacterAnimation => {
  if (speed < 0.3) return "idle";
  return speed >= SPRINT_THRESHOLD ? "sprint" : "walk";
};
