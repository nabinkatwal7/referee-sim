import type { RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import type { Camera } from "three";
import {
  createPlayerAIState,
  stepPlayerAI,
  type PlayerAIState,
  type PlayerFSMState,
} from "../../entities/Player/ai";
import {
  createBrainState,
  stepMatchBrain,
  type BrainState,
  type MatchEvent as BrainEvent,
} from "../../entities/Player/brain";
import { checkBoundary } from "../../entities/Ball/boundary";
import { detectCollision } from "../../entities/Ball/collision";
import {
  findNearestPlayer,
  type NearestPlayer,
} from "../../entities/Ball/nearestPlayer";
import {
  createBallPossession,
  recordTouch,
  setLoose,
  type BallPossession,
} from "../../entities/Ball/possession";
import { detectPlayerCollisions } from "../../entities/Player/collisionDetector";
import { stepRefereeMovement, type RefereeInput } from "../../entities/Referee/movement";
import { computeVision, decideCall, type Vision } from "../referee/vision";
import { expirePendingFoul } from "../referee/whistle";
import { createTeams } from "../team/createTeams";
import { Team, type TeamId } from "../team/Team";
import { EventBus } from "./EventBus";
import { gameStateStore } from "./gameState";
import { MatchState, MatchStateMachine } from "./MatchStateMachine";
import { ReplayBuffer, restoreSnapshot, type FrameSnapshot } from "./replay";
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

const toTuple = (v: { x: number; y: number; z: number }): [number, number, number] => [v.x, v.y, v.z];

// Pure engine: no React, no hooks, no component state — just plain class
// fields mutated each tick. One instance lives for the whole match; the only
// place React touches it is a single useFrame call (see GameLoopRunner).
//
// Nothing here happens directly: every occurrence (pass, tackle, shot, foul,
// penalty, offside, throw-in, corner, collision) is emitted on `bus` instead
// of being handled inline. The Zustand store (game state — score/time/cards/
// possession/current event/replay/paused, no positions) subscribes to that
// bus via wireStoreToEvents; GameLoop never writes to it directly.
//
// `matchState` (engine/match/MatchStateMachine.ts) is the single authority
// on what phase the match is in — AI/ball/collision logic only run while
// it's actually playing (IN_PLAY/SECOND_HALF); kickoff resets positions,
// half-time flips each team's attacking direction, and the store's `paused`
// flag is just a mirror of `!matchState.isPlaying()`, not an independent
// source of truth.
export class GameLoop {
  private clock = 0;
  private clockWholeSecond = -1;
  private players: (PlayerHandle | null)[] = [];
  private ball: RapierRigidBody | null = null;
  private referee: RefereeHandle | null = null;
  private brain: BrainState = createBrainState();
  // Engine truth for who owns / last touched the ball (Loose|Blue|Red|GK).
  // Distinct from Zustand's simpler `possession: playerIndex` mirror.
  private ballPossession: BallPossession = createBallPossession();
  private nearestToBall: NearestPlayer | null = null;
  private lastTouchTeam: TeamId | null = null;
  private previousBallVelocity = { x: 0, z: 0 };
  private replayBuffer = new ReplayBuffer();
  private replayFrames: FrameSnapshot[] = [];
  private replayIndex = 0;
  private replayElapsed = 0;
  private homeTeam: Team;
  private awayTeam: Team;
  readonly matchState = new MatchStateMachine();
  readonly bus = new EventBus();

  constructor() {
    wireStoreToEvents(this.bus);

    const teams = createTeams();
    this.homeTeam = teams.home;
    this.awayTeam = teams.away;

    this.matchState.subscribe((state, previous) => {
      gameStateStore.getState().setMatchPhase(state);
      gameStateStore.getState().setPaused(!this.matchState.isPlaying());
      if (state === MatchState.KICKOFF) {
        if (previous === MatchState.HALF_TIME) this.flipAttackingDirections();
        this.resetForKickoff();
      }
    });
  }

  getTeams(): { home: Team; away: Team } {
    return { home: this.homeTeam, away: this.awayTeam };
  }

  getTeam(id: TeamId): Team {
    return id === "home" ? this.homeTeam : this.awayTeam;
  }

  getMatchState(): MatchStateMachine {
    return this.matchState;
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

  // Read-only snapshot for the visual layer to pick an animation clip —
  // movement/FSM logic itself lives entirely in updateAI, this is just a peek.
  getPlayerAnimationState(index: number): { fsmState: PlayerFSMState; speed: number } | null {
    const player = this.players[index];
    if (!player) return null;
    const v = player.body.linvel();
    return { fsmState: player.ai.fsmState, speed: Math.hypot(v.x, v.z) };
  }

  getRefereeSpeed(): number {
    if (!this.referee) return 0;
    const v = this.referee.body.linvel();
    return Math.hypot(v.x, v.z);
  }

  getBallPossession(): BallPossession {
    return this.ballPossession;
  }

  getNearestToBall(): NearestPlayer | null {
    return this.nearestToBall;
  }

  tick(delta: number) {
    if (gameStateStore.getState().replayState === "replay") {
      this.updateReplayPlayback(delta);
      return;
    }

    this.matchState.update(delta);
    this.updateClock(delta);

    if (this.matchState.isPlaying()) {
      this.updateAI(delta);
      this.updatePhysics();
      this.updateBall(delta);
      this.updateCollisions();
    }

    this.updateReferee();
    this.updateWhistle();
    this.generateEvents();
    this.recordReplayFrame();
    // Render happens after this callback returns — react-three-fiber's own
    // render pass. Nothing for the engine to do here.
  }

  // Press-to-trigger instant replay: freezes live play and replays the last
  // 15 seconds of recorded snapshots, then resumes automatically. Refuses to
  // start mid-whistle-decision or with nothing recorded yet.
  startReplay(): boolean {
    const store = gameStateStore.getState();
    if (store.replayState === "replay" || store.decisionWindowOpen || this.replayBuffer.isEmpty) {
      return false;
    }

    this.replayFrames = this.replayBuffer.snapshotFrames();
    this.replayIndex = 0;
    this.replayElapsed = 0;
    store.setReplayState("replay");
    store.setPaused(true);
    return true;
  }

  private endReplay() {
    gameStateStore.getState().setReplayState("live");
    gameStateStore.getState().setPaused(!this.matchState.isPlaying());
    this.replayFrames = [];
    this.replayIndex = 0;
    this.replayElapsed = 0;
  }

  private updateReplayPlayback(delta: number) {
    if (this.replayFrames.length === 0) {
      this.endReplay();
      return;
    }

    this.replayElapsed += delta;
    const startT = this.replayFrames[0].t;
    const target = startT + this.replayElapsed;

    while (
      this.replayIndex < this.replayFrames.length - 1 &&
      this.replayFrames[this.replayIndex + 1].t <= target
    ) {
      this.replayIndex++;
    }

    restoreSnapshot(this.replayFrames[this.replayIndex], this.players, this.ball);

    const finished =
      this.replayIndex >= this.replayFrames.length - 1 &&
      target >= this.replayFrames[this.replayFrames.length - 1].t;
    if (finished) this.endReplay();
  }

  private recordReplayFrame() {
    const players = this.players.map((player) =>
      player
        ? {
            position: toTuple(player.body.translation()),
            velocity: toTuple(player.body.linvel()),
            fsmState: player.ai.fsmState,
          }
        : null,
    );

    const ball = this.ball
      ? { position: toTuple(this.ball.translation()), velocity: toTuple(this.ball.linvel()) }
      : null;

    this.replayBuffer.record({ t: this.clock, players, ball });
  }

  // Called whenever the match state machine enters KICKOFF (initial kickoff,
  // after a goal, or after half-time) — snaps everyone back to their
  // formation spot and the ball to the center, clearing possession state.
  private resetForKickoff() {
    if (this.ball) {
      this.ball.setTranslation({ x: 0, y: 2, z: 0 }, true);
      this.ball.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }
    this.players.forEach((player) => {
      if (!player) return;
      const [x, y, z] = player.ai.home;
      player.body.setTranslation({ x, y, z }, true);
      player.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    });
    this.brain = createBrainState();
    this.ballPossession = createBallPossession();
    this.nearestToBall = null;
    this.lastTouchTeam = null;
  }

  private flipAttackingDirections() {
    this.homeTeam.flipAttackingDirection();
    this.awayTeam.flipAttackingDirection();
  }

  private updateClock(delta: number) {
    this.clock += delta;
    const whole = Math.floor(this.clock);
    if (whole !== this.clockWholeSecond) {
      this.clockWholeSecond = whole;
      gameStateStore.getState().setTime(whole);
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
    // itself paused/resumed from the store's `paused` flag — see Game.tsx —
    // which mirrors matchState.isPlaying(), not an independent switch).
  }

  private updateBall(delta: number) {
    if (!this.ball) return;

    // Collision check uses velocity as physics left it, before any kick we
    // apply below — otherwise our own passes/shots would look like hits.
    if (detectCollision(this.ball, this.previousBallVelocity)) {
      const p = this.ball.translation();
      this.bus.emit({ kind: "collision", position: { x: p.x, z: p.z }, at: this.clock });
    }

    // Step 24 — nearest player every frame (receiver candidate).
    this.nearestToBall = this.findNearestPlayerToBall();

    const result = stepMatchBrain(this.ball, this.players, this.brain, delta, this.nearestToBall);
    if (result) this.handleBrainEvent(result);
    this.syncBallPossession();

    const boundary = checkBoundary(this.ball, this.lastTouchTeam);
    if (boundary) this.bus.emit({ ...boundary, at: this.clock });

    const v = this.ball.linvel();
    this.previousBallVelocity = { x: v.x, z: v.z };
  }

  private findNearestPlayerToBall(): NearestPlayer | null {
    if (!this.ball) return null;
    const ballPos = this.ball.translation();
    return findNearestPlayer(ballPos, this.players.length, (i) => {
      const player = this.players[i];
      if (!player) return null;
      const p = player.body.translation();
      return { x: p.x, z: p.z };
    });
  }

  // Keep ball.owner / lastTouch / previousTouch in lockstep with brain.possessor.
  private syncBallPossession() {
    const idx = this.brain.possessor;
    const owned = this.ballPossession.owner.playerIndex;

    if (idx === owned) return;

    if (idx === null) {
      setLoose(this.ballPossession);
      return;
    }

    const player = this.players[idx];
    if (!player) return;
    const role = player.team.players.find((p) => p.index === idx)?.role ?? "CM";
    recordTouch(this.ballPossession, idx, player.team.id, role, this.clock);
    this.lastTouchTeam = player.team.id;
  }

  private handleBrainEvent(result: BrainEvent) {
    const at = this.clock;

    switch (result.kind) {
      case "pass":
        this.lastTouchTeam = this.players[result.to]?.team.id ?? this.lastTouchTeam;
        this.bus.emit({ ...result, at });
        break;

      case "tackle":
        this.lastTouchTeam = this.players[result.by]?.team.id ?? this.lastTouchTeam;
        this.bus.emit({ ...result, at });
        break;

      case "shot":
        this.lastTouchTeam = result.team;
        this.bus.emit({ ...result, at });
        if (result.scored) {
          this.getTeam(result.team).addGoal();
          this.bus.emit({ kind: "goal", by: result.by, team: result.team, at });
          this.matchState.reportGoal();
        }
        break;

      case "foul": {
        this.lastTouchTeam = this.players[result.against]?.team.id ?? this.lastTouchTeam;
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

  private updateCollisions() {
    if (!this.ball) return;
    // Only one incident under review at a time — don't bother detecting
    // more while one's still awaiting the player's whistle.
    if (gameStateStore.getState().pendingFoul) return;

    const ballPos = this.ball.translation();
    const candidate = detectPlayerCollisions(this.players, ballPos);
    if (!candidate) return;

    const vision = this.evaluateVision(candidate.position);
    this.bus.emit({
      kind: "possibleFoul",
      playerA: candidate.playerA,
      playerB: candidate.playerB,
      position: candidate.position,
      force: candidate.force,
      severity: candidate.severity,
      visionQuality: vision.quality,
      at: this.clock,
    });
  }

  private updateWhistle() {
    expirePendingFoul(this.clock);
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
