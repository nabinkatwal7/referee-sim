import type { RapierRigidBody } from "@react-three/rapier";
import type { Camera } from "three";
import { createPlayerAIState, stepPlayerAI, type PlayerAIState } from "../../entities/Player/ai";
import {
  createBrainState,
  stepMatchBrain,
  type BrainState,
  type MatchEvent as BrainEvent,
  type Team,
} from "../../entities/Player/brain";
import { stepRefereeMovement, type RefereeInput } from "../../entities/Referee/movement";
import { useGameStore } from "./gameState";

export type MatchEvent = BrainEvent & { at: number };

type PlayerHandle = {
  body: RapierRigidBody;
  team: Team;
  ai: PlayerAIState;
};

type RefereeHandle = {
  body: RapierRigidBody;
  camera: Camera;
  getInput: () => RefereeInput;
};

const MAX_EVENTS = 200;

const teamToSide = (team: Team): "home" | "away" => (team === "A" ? "home" : "away");

// Pure engine: no React, no hooks, no component state — just plain class
// fields mutated each tick. One instance lives for the whole match; the only
// place React touches it is a single useFrame call (see GameLoopRunner).
// Game state (score/time/cards/possession/current event/replay/paused) is
// NOT stored here — it's written out to the Zustand store (./gameState) via
// its vanilla getState/setState API, which needs no React either.
export class GameLoop {
  private clock = 0;
  private clockWholeSecond = -1;
  private players: (PlayerHandle | null)[] = [];
  private ball: RapierRigidBody | null = null;
  private referee: RefereeHandle | null = null;
  private brain: BrainState = createBrainState();
  readonly events: MatchEvent[] = [];

  registerPlayer(index: number, body: RapierRigidBody | null, home: [number, number, number], team: Team) {
    if (!body) {
      this.players[index] = null;
      return;
    }
    const existing = this.players[index];
    this.players[index] = { body, team, ai: existing?.ai ?? createPlayerAIState(home) };
  }

  setBall(body: RapierRigidBody | null) {
    this.ball = body;
  }

  setReferee(body: RapierRigidBody | null, camera: Camera, getInput: () => RefereeInput) {
    this.referee = body ? { body, camera, getInput } : null;
  }

  getReferee(): RapierRigidBody | null {
    return this.referee?.body ?? null;
  }

  tick(delta: number) {
    if (useGameStore.getState().paused) return;

    this.updateClock(delta);
    this.updateAI(delta);
    this.updatePhysics();
    this.updateBall(delta);
    this.updateReferee();
    this.generateEvents();
    // Render happens after this callback returns — react-three-fiber's own
    // render pass. Nothing for the engine to do here.
  }

  private updateClock(delta: number) {
    this.clock += delta;
    const whole = Math.floor(this.clock);
    if (whole !== this.clockWholeSecond) {
      this.clockWholeSecond = whole;
      useGameStore.getState().setTime(whole);
    }
  }

  private updateAI(delta: number) {
    this.players.forEach((player) => {
      if (!player) return;
      stepPlayerAI(player.body, player.ai, delta);
    });
  }

  private updatePhysics() {
    // No-op: @react-three/rapier's <Physics> component steps the world
    // automatically once per frame, right after this hook runs (and is
    // itself paused/resumed from the store's `paused` flag — see Game.tsx).
  }

  private updateBall(delta: number) {
    if (!this.ball) return;
    const result = stepMatchBrain(this.ball, this.players, this.brain, delta);
    if (!result) return;

    this.events.push({ ...result, at: this.clock });
    const store = useGameStore.getState();

    if (result.kind === "pass") {
      store.setPossession(result.to);
      store.setCurrentEvent(`Pass: #${result.from} -> #${result.to}`);
    } else if (result.kind === "tackle") {
      store.setPossession(result.by);
      store.setCurrentEvent(`Tackle: #${result.by} won it from #${result.from}`);
    } else if (result.kind === "shot") {
      if (result.scored) {
        store.addGoal(teamToSide(result.team));
        store.setCurrentEvent(`GOAL! #${result.by}`);
      } else {
        store.setCurrentEvent(`Shot: #${result.by} (missed)`);
      }
      store.setPossession(null);
    }
  }

  private updateReferee() {
    if (!this.referee) return;
    stepRefereeMovement(this.referee.body, this.referee.camera, this.referee.getInput());
  }

  private generateEvents() {
    if (this.events.length > MAX_EVENTS) {
      this.events.splice(0, this.events.length - MAX_EVENTS);
    }
  }
}
