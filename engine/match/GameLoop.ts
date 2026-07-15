import type { RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import type { Camera } from "three";
import { createPlayerAIState, stepPlayerAI, type PlayerAIState } from "../../entities/Player/ai";
import {
  createBrainState,
  stepMatchBrain,
  type BrainState,
  type MatchEvent as BrainEvent,
  type Team,
} from "../../entities/Player/brain";
import { checkBoundary } from "../../entities/Ball/boundary";
import { detectCollision } from "../../entities/Ball/collision";
import { stepRefereeMovement, type RefereeInput } from "../../entities/Referee/movement";
import { computeVision, decideCall, type Vision } from "../referee/vision";
import { EventBus } from "./EventBus";
import { useGameStore } from "./gameState";
import { wireStoreToEvents } from "./storeSync";

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

const refereeDir = new THREE.Vector3();

// Pure engine: no React, no hooks, no component state — just plain class
// fields mutated each tick. One instance lives for the whole match; the only
// place React touches it is a single useFrame call (see GameLoopRunner).
//
// Nothing here happens directly: every occurrence (pass, tackle, shot, foul,
// penalty, offside, throw-in, corner, collision) is emitted on `bus` instead
// of being handled inline. The Zustand store (game state — score/time/cards/
// possession/current event/replay/paused, no positions) subscribes to that
// bus via wireStoreToEvents; GameLoop never writes to it directly.
export class GameLoop {
  private clock = 0;
  private clockWholeSecond = -1;
  private players: (PlayerHandle | null)[] = [];
  private ball: RapierRigidBody | null = null;
  private referee: RefereeHandle | null = null;
  private brain: BrainState = createBrainState();
  private lastTouchTeam: Team | null = null;
  private previousBallVelocity = { x: 0, z: 0 };
  readonly bus = new EventBus();

  constructor() {
    wireStoreToEvents(this.bus);
  }

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

    // Collision check uses velocity as physics left it, before any kick we
    // apply below — otherwise our own passes/shots would look like hits.
    if (detectCollision(this.ball, this.previousBallVelocity)) {
      const p = this.ball.translation();
      this.bus.emit({ kind: "collision", position: { x: p.x, z: p.z }, at: this.clock });
    }

    const result = stepMatchBrain(this.ball, this.players, this.brain, delta);
    if (result) this.handleBrainEvent(result);

    const boundary = checkBoundary(this.ball, this.lastTouchTeam);
    if (boundary) this.bus.emit({ ...boundary, at: this.clock });

    const v = this.ball.linvel();
    this.previousBallVelocity = { x: v.x, z: v.z };
  }

  private handleBrainEvent(result: BrainEvent) {
    const at = this.clock;

    switch (result.kind) {
      case "pass":
        this.lastTouchTeam = this.players[result.to]?.team ?? this.lastTouchTeam;
        this.bus.emit({ ...result, at });
        break;

      case "tackle":
        this.lastTouchTeam = this.players[result.by]?.team ?? this.lastTouchTeam;
        this.bus.emit({ ...result, at });
        break;

      case "shot":
        this.lastTouchTeam = result.team;
        this.bus.emit({ ...result, at });
        if (result.scored) {
          this.bus.emit({ kind: "goal", by: result.by, team: result.team, at });
        }
        break;

      case "foul": {
        this.lastTouchTeam = this.players[result.against]?.team ?? this.lastTouchTeam;
        const vision = this.evaluateVision(result.position);
        this.bus.emit({ ...result, given: decideCall(vision), visionQuality: vision.quality, at });
        break;
      }

      case "penalty": {
        this.lastTouchTeam = result.team;
        const vision = this.evaluateVision(result.position);
        this.bus.emit({ ...result, given: decideCall(vision), visionQuality: vision.quality, at });
        break;
      }

      case "offside": {
        const vision = this.evaluateVision(result.position);
        const given = decideCall(vision);
        this.bus.emit({ ...result, given, visionQuality: vision.quality, at });
        // Missed call: play continues as though the pass had simply succeeded.
        if (!given) this.lastTouchTeam = result.team;
        break;
      }
    }
  }

  private evaluateVision(position: { x: number; z: number }): Vision {
    if (!this.referee) return { inView: false, distance: Infinity, angle: Math.PI, quality: 0 };
    const refPos = this.referee.body.translation();
    this.referee.camera.getWorldDirection(refereeDir);
    refereeDir.y = 0;
    refereeDir.normalize();
    return computeVision(refPos, refereeDir, position);
  }

  private updateReferee() {
    if (!this.referee) return;
    stepRefereeMovement(this.referee.body, this.referee.camera, this.referee.getInput());
  }

  private generateEvents() {
    // Event history trimming lives inside EventBus itself.
  }
}
