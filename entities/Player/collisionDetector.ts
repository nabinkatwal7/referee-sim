import type { PlayerRef } from "./brain";
import { scoreFoul, type FoulSeverity } from "./foulScore";
import { measureTackle, type TackleMetrics } from "./tackle";

const CONTACT_RANGE = 1.15;
const MIN_FORCE = 3.5;
const BALL_CHALLENGE_RADIUS = 2.2; // within this, treat as tackle/challenge with ball context

export type { FoulSeverity };

export type PossibleFoulCandidate = {
  playerA: number; // challenger (faster / aggressor)
  playerB: number; // victim
  position: { x: number; z: number };
  force: number;
  severity: FoulSeverity;
  foulScore: number;
  tackle: TackleMetrics;
};

const aggressorIndex = (
  i: number,
  j: number,
  iSpeed: number,
  jSpeed: number,
): { challenger: number; victim: number } =>
  iSpeed >= jSpeed ? { challenger: i, victim: j } : { challenger: j, victim: i };

// Steps 48–50: collision → tackle metrics → foul score 0..1 → severity.
export const detectPlayerCollisions = (
  players: (PlayerRef | null)[],
  ballPos: { x: number; z: number },
): PossibleFoulCandidate | null => {
  let best: PossibleFoulCandidate | null = null;

  for (let i = 0; i < players.length; i++) {
    const a = players[i];
    if (!a) continue;
    const aPos = a.body.translation();
    const aVel = a.body.linvel();

    for (let j = i + 1; j < players.length; j++) {
      const b = players[j];
      if (!b || b.team === a.team) continue;
      const bPos = b.body.translation();
      const dist = Math.hypot(aPos.x - bPos.x, aPos.z - bPos.z);
      if (dist > CONTACT_RANGE) continue;

      const bVel = b.body.linvel();
      const force = Math.hypot(aVel.x - bVel.x, aVel.z - bVel.z);
      if (force < MIN_FORCE) continue;

      const aSpeed = Math.hypot(aVel.x, aVel.z);
      const bSpeed = Math.hypot(bVel.x, bVel.z);
      const { challenger, victim } = aggressorIndex(i, j, aSpeed, bSpeed);
      const ch = players[challenger]!;
      const vi = players[victim]!;
      const cPos = ch.body.translation();
      const vPos = vi.body.translation();
      const cVel = ch.body.linvel();
      const vVel = vi.body.linvel();

      const tackle = measureTackle(
        { x: cPos.x, z: cPos.z },
        { x: cVel.x, z: cVel.z },
        { x: vPos.x, z: vPos.z },
        { x: vVel.x, z: vVel.z },
        ballPos,
      );

      // Facing proxy: victim attacks along team.attackingDirection.
      const toChX = cPos.x - vPos.x;
      const toChZ = cPos.z - vPos.z;
      const faceZ = vi.team.attackingDirection;
      const fromBehind = toChZ * faceZ < 0 && Math.abs(toChZ) > Math.abs(toChX);

      const ballNear =
        Math.hypot((cPos.x + vPos.x) / 2 - ballPos.x, (cPos.z + vPos.z) / 2 - ballPos.z) <
        BALL_CHALLENGE_RADIUS;
      // Late: ball already past victim along attack if not ballNear and challenger still hitting.
      const late = !ballNear && tackle.force > 6;

      const studs =
        tackle.contactPart === "foot" &&
        (tackle.victimPart === "leg" || tackle.victimPart === "body") &&
        tackle.speed > 5;

      const scored = scoreFoul({ tackle, fromBehind, late, studs });

      if (!best || scored.score > best.foulScore) {
        best = {
          playerA: challenger,
          playerB: victim,
          position: { x: (cPos.x + vPos.x) / 2, z: (cPos.z + vPos.z) / 2 },
          force: tackle.force,
          severity: scored.severity,
          foulScore: scored.score,
          tackle,
        };
      }
    }
  }

  return best;
};
