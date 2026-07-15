import type { FormationSlot, Role } from "../../entities/formation";

export type TeamId = "home" | "away";
export type AttackingDirection = 1 | -1; // +1 = attacking toward +z, -1 = toward -z

export type TeamPlayer = {
  index: number; // global roster index (0-21) — links to GameLoop's player registry
  teamId: TeamId;
  number: number; // shirt number, 1-11
  role: Role;
  name: string;
  home: [number, number, number];
};

// The Team model: id, name, color, formation, players, score,
// attackingDirection, possession. Pure data + a couple of mutators — no
// React, lives entirely in the engine. attackingDirection is mutable
// (not derived from id) because it flips at half-time — see
// engine/match/MatchStateMachine.ts.
export class Team {
  readonly id: TeamId;
  readonly name: string;
  readonly color: string;
  readonly formation: FormationSlot[];
  readonly players: TeamPlayer[];
  score = 0;
  attackingDirection: AttackingDirection;
  possession = false;

  constructor(
    id: TeamId,
    name: string,
    color: string,
    formation: FormationSlot[],
    players: TeamPlayer[],
    attackingDirection: AttackingDirection,
  ) {
    this.id = id;
    this.name = name;
    this.color = color;
    this.formation = formation;
    this.players = players;
    this.attackingDirection = attackingDirection;
  }

  addGoal() {
    this.score += 1;
  }

  flipAttackingDirection() {
    this.attackingDirection = this.attackingDirection === 1 ? -1 : 1;
  }
}
