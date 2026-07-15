import type { PlayerRef } from "./brain";

const COLLISION_PROXIMITY = 1.0; // meters between players to count as contact
const MIN_FORCE = 4; // relative closing speed (m/s) to count as "high force" at all
const MEDIUM_FORCE = 7;
const HIGH_FORCE = 11;
const BALL_EXCLUSION_RADIUS = 5; // if the ball is this close to either player, it's a ball challenge, not this

export type FoulSeverity = "clean" | "foul" | "reckless";

export type PossibleFoulCandidate = {
  playerA: number;
  playerB: number;
  position: { x: number; z: number };
  force: number;
  severity: FoulSeverity;
};

const classifySeverity = (force: number): FoulSeverity => {
  if (force >= HIGH_FORCE) return "reckless";
  if (force >= MEDIUM_FORCE) return "foul";
  return "clean";
};

// Player collision -> (abstracted "foot hits leg", given our capsule
// geometry has no real feet/legs) -> no ball contact -> high force ->
// possible foul. Ground truth only, and deliberately hides its own
// `severity` from whoever renders the UI — that's the whole point of
// handing the call to the player instead of a dice roll.
export const detectPlayerCollisions = (
  players: (PlayerRef | null)[],
  ballPos: { x: number; z: number },
): PossibleFoulCandidate | null => {
  let best: PossibleFoulCandidate | null = null;

  for (let i = 0; i < players.length; i++) {
    const a = players[i];
    if (!a) continue;
    const aPos = a.body.translation();
    if (
      Math.hypot(aPos.x - ballPos.x, aPos.z - ballPos.z) < BALL_EXCLUSION_RADIUS
    )
      continue;

    for (let j = i + 1; j < players.length; j++) {
      const b = players[j];
      if (!b || b.team === a.team) continue; // only opponent-vs-opponent counts as a foul
      const bPos = b.body.translation();
      if (
        Math.hypot(bPos.x - ballPos.x, bPos.z - ballPos.z) <
        BALL_EXCLUSION_RADIUS
      )
        continue;

      const dist = Math.hypot(aPos.x - bPos.x, aPos.z - bPos.z);
      if (dist > COLLISION_PROXIMITY) continue;

      const aVel = a.body.linvel();
      const bVel = b.body.linvel();
      const force = Math.hypot(aVel.x - bVel.x, aVel.z - bVel.z);
      if (force < MIN_FORCE) continue;

      if (!best || force > best.force) {
        best = {
          playerA: i,
          playerB: j,
          position: { x: (aPos.x + bPos.x) / 2, z: (aPos.z + bPos.z) / 2 },
          force,
          severity: classifySeverity(force),
        };
      }
    }
  }

  return best;
};
