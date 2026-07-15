import type { FormationId, FormationSlot, Role } from "../../entities/formation";
import type { TacticalParams } from "../../entities/Player/tactics";
import { DEFAULT_TACTICS } from "../../entities/Player/tactics";

export type TeamId = "home" | "away";
export type AttackingDirection = 1 | -1; // +1 = attacking toward +z, -1 = toward -z

export type TeamPlayer = {
  index: number; // global roster index (0-21) — links to GameLoop's player registry
  teamId: TeamId;
  number: number; // shirt number, 1-11
  role: Role;
  name: string;
  /** Base formation spot (world). */
  home: [number, number, number];
  /** Pushed toward opponent goal. */
  attack: [number, number, number];
  /** Dropped toward own goal. */
  defend: [number, number, number];
};

// The Team model: id, name, color, formation, tactics, players, score,
// attackingDirection. Pure data + mutators — no React.
export class Team {
  readonly id: TeamId;
  readonly name: string;
  readonly color: string;
  readonly formationId: FormationId;
  readonly formation: FormationSlot[];
  readonly players: TeamPlayer[];
  tactics: TacticalParams;
  score = 0;
  attackingDirection: AttackingDirection;
  possession = false;

  constructor(
    id: TeamId,
    name: string,
    color: string,
    formationId: FormationId,
    formation: FormationSlot[],
    players: TeamPlayer[],
    attackingDirection: AttackingDirection,
    tactics: TacticalParams = DEFAULT_TACTICS,
  ) {
    this.id = id;
    this.name = name;
    this.color = color;
    this.formationId = formationId;
    this.formation = formation;
    this.players = players;
    this.attackingDirection = attackingDirection;
    this.tactics = tactics;
  }

  addGoal() {
    this.score += 1;
  }

  flipAttackingDirection() {
    this.attackingDirection = this.attackingDirection === 1 ? -1 : 1;
    // Attack ↔ defend swap around home when the team turns around.
    for (const p of this.players) {
      const atk = p.attack;
      p.attack = p.defend;
      p.defend = atk;
    }
  }
}
