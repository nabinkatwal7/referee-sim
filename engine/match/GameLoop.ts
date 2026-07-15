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
import { detectBallOut } from "../../entities/Ball/ballOut";
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
import {
  beginRestart,
  stepRestart,
  type RestartState,
} from "../../entities/Ball/restarts";
import {
  createTouchLog,
  lastTouchTeam as touchLogTeam,
  recordBallTouch,
  type TouchLog,
} from "../../entities/Ball/touch";
import type { Role } from "../../entities/formation";
import { detectPlayerCollisions } from "../../entities/Player/collisionDetector";
import { resolveOverlaps } from "../../entities/Player/avoidance";
import {
  createGoalkeeperAIState,
  type GoalkeeperAIState,
  type KeeperFSMState,
} from "../../entities/Player/goalkeeper";
import { enterReactionState } from "../../entities/Player/ai";
import { stepStamina } from "../../entities/Player/stamina";
import { stepRefereeMovement, type RefereeInput } from "../../entities/Referee/movement";
import { computeVision, decideCall, type Vision } from "../referee/vision";
import { expirePendingFoul, makeDecision } from "../referee/whistle";
import type { DecisionAction } from "../referee/decision";
import { createCardBook } from "../referee/cards";
import {
  applyAssistantSignal,
  createAssistants,
  recommendOffside,
  recommendRestart,
  type AssistantState,
} from "../referee/assistants";
import { createVarState, enqueueVar, type VarState } from "../referee/var";
import { progressCareer } from "../referee/career";
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
  role: Role;
  ai: PlayerAIState;
  keeper: GoalkeeperAIState | null;
};

type RefereeHandle = {
  body: RapierRigidBody;
  camera: Camera;
  getInput: () => RefereeInput;
};

const refereeDir = new THREE.Vector3();

const toTuple = (v: { x: number; y: number; z: number }): [number, number, number] => [v.x, v.y, v.z];

// Replay buffer only stores field FSM labels — map keeper states to the closest stand-in.
const keeperToReplayState = (state: KeeperFSMState): PlayerFSMState => {
  switch (state) {
    case "idle":
      return "idle";
    case "track":
    case "intercept":
      return "move";
    case "dive":
      return "tackle";
    case "catch":
      return "receive";
    case "kick":
      return "pass";
  }
};

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
  private ballPossession: BallPossession = createBallPossession();
  private touchLog: TouchLog = createTouchLog();
  private nearestToBall: NearestPlayer | null = null;
  private lastTouchTeam: TeamId | null = null;
  /** Active throw-in / corner / goal-kick sequence (null = open play). */
  private restart: RestartState | null = null;
  private previousBallVelocity = { x: 0, z: 0 };
  private replayBuffer = new ReplayBuffer();
  private replayFrames: FrameSnapshot[] = [];
  private replayIndex = 0;
  private replayElapsed = 0;
  private homeTeam: Team;
  private awayTeam: Team;
  private cardBook = createCardBook();
  private assistants: AssistantState = createAssistants();
  private varReviews: VarState = createVarState();
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
        this.bus.emit({ kind: "kickoff", at: this.clock });
      }
      if (state === MatchState.FULL_TIME) {
        const career = progressCareer(
          gameStateStore.getState().career,
          gameStateStore.getState().matchRating.overall,
        );
        gameStateStore.getState().setCareer(career);
        gameStateStore.getState().setCurrentEvent(
          `Full time — career: ${career.tier} (${career.matchesCompleted} matches)`,
        );
      }
    });
  }

  resolveRefereeDecision(action: DecisionAction) {
    makeDecision(action, this.matchState, {
      cardBook: this.cardBook,
      onDisciplinary: (playerIndex, sentOff) => {
        if (!sentOff) return;
        const p = this.players[playerIndex];
        if (p) {
          p.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
          p.ai.fsmState = "idle";
        }
      },
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

  registerPlayer(
    index: number,
    body: RapierRigidBody | null,
    home: [number, number, number],
    team: Team,
    role: Role,
  ) {
    if (!body) {
      this.players[index] = null;
      return;
    }
    const existing = this.players[index];
    this.players[index] = {
      body,
      team,
      role,
      ai: existing?.ai ?? createPlayerAIState(home),
      keeper:
        role === "GK"
          ? (existing?.keeper ?? createGoalkeeperAIState(home))
          : null,
    };
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

  // Read-only snapshot for the visual layer to pick an animation clip.
  getPlayerAnimationState(
    index: number,
  ):
    | { kind: "field"; fsmState: PlayerFSMState; speed: number }
    | { kind: "keeper"; fsmState: KeeperFSMState; speed: number }
    | null {
    const player = this.players[index];
    if (!player) return null;
    const v = player.body.linvel();
    const speed = Math.hypot(v.x, v.z);
    if (player.role === "GK" && player.keeper) {
      return { kind: "keeper", fsmState: player.keeper.fsmState, speed };
    }
    return { kind: "field", fsmState: player.ai.fsmState, speed };
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
      // Final pass: steering repulsion so nobody stacks.
      resolveOverlaps(this.players.map((p) => p?.body ?? null));
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
            fsmState:
              player.role === "GK" && player.keeper
                ? keeperToReplayState(player.keeper.fsmState)
                : player.ai.fsmState,
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
    this.touchLog = createTouchLog();
    this.nearestToBall = null;
    this.lastTouchTeam = null;
    this.restart = null;
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
    // Step 40 — minute / second / added time / period labels.
    gameStateStore.getState().setMatchClock(this.matchState.getClock());
  }

  private updateAI(delta: number) {
    const positions = this.players.map((p) => {
      if (!p) return null;
      const t = p.body.translation();
      return { x: t.x, z: t.z };
    });

    this.players.forEach((player, i) => {
      if (!player) return;
      if (player.role === "GK") {
        const v = player.body.linvel();
        stepStamina(player.ai.stamina, Math.hypot(v.x, v.z), delta);
        return;
      }
      const neighbors = positions
        .map((pos, j) => (j !== i ? pos : null))
        .filter((p): p is { x: number; z: number } => !!p);
      stepPlayerAI(player.body, player.ai, delta, neighbors);
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

    // —— Dead-ball restart in progress (throw-in / corner / goal kick) ——
    if (this.restart) {
      this.stepActiveRestart(delta);
      const v = this.ball.linvel();
      this.previousBallVelocity = { x: v.x, z: v.z };
      return;
    }

    // Collision check uses velocity as physics left it, before any kick we
    // apply below — otherwise our own passes/shots would look like hits.
    if (detectCollision(this.ball, this.previousBallVelocity)) {
      const p = this.ball.translation();
      this.bus.emit({ kind: "collision", position: { x: p.x, z: p.z }, at: this.clock });
    }

    this.nearestToBall = this.findNearestPlayerToBall();

    const result = stepMatchBrain(this.ball, this.players, this.brain, delta, this.nearestToBall);
    if (result) this.handleBrainEvent(result);
    this.syncBallPossession();

    // Step 42 — entire ball outside field?
    this.checkBallOutOfPlay();

    const v = this.ball.linvel();
    this.previousBallVelocity = { x: v.x, z: v.z };
  }

  private stepActiveRestart(delta: number) {
    if (!this.ball || !this.restart) return;

    const slots = this.players.map((p) =>
      p
        ? {
            body: p.body,
            teamId: p.team.id,
            role: p.role,
          }
        : null,
    );

    const result = stepRestart(this.restart, this.ball, slots, delta);
    if (result.status !== "complete") return;

    // Taker just delivered — record the touch, clear restart, resume play.
    if (result.takerIndex >= 0) {
      const taker = this.players[result.takerIndex];
      if (taker) {
        const bp = this.ball.translation();
        this.commitTouch(result.takerIndex, { x: bp.x, z: bp.z });
      }
    }
    this.restart = null;
    this.brain = createBrainState();
  }

  private checkBallOutOfPlay() {
    if (!this.ball || this.restart) return;

    const out = detectBallOut(
      this.ball,
      this.lastTouchTeam ?? touchLogTeam(this.touchLog),
      this.homeTeam.attackingDirection,
    );
    if (!out) return;

    const at = this.clock;

    if (out.kind === "goal") {
      const by = this.touchLog.last?.playerIndex ?? this.ballPossession.lastTouch?.playerIndex ?? 0;
      this.getTeam(out.team).addGoal();
      this.bus.emit({ kind: "goal", by, team: out.team, at });
      enqueueVar(this.varReviews, {
        kind: "goal",
        team: out.team,
        playerA: by,
        position: out.position,
        at,
        cameras: ["main", "goalLine", "sideline", "tactical"],
      });
      gameStateStore.getState().setVarState({ ...this.varReviews });
      const scorer = this.players[by];
      if (scorer) enterReactionState(scorer.ai, "celebrate", 3);
      this.brain = createBrainState();
      this.ballPossession = createBallPossession();
      this.matchState.reportGoal();
      return;
    }

    // Step 56 — AR flags the restart.
    applyAssistantSignal(
      this.assistants,
      recommendRestart(out.kind, out.team, out.position, at),
    );
    gameStateStore.getState().setAssistants({ ...this.assistants });

    this.bus.emit({ ...out, at });
    this.brain = createBrainState();
    setLoose(this.ballPossession);
    this.restart = beginRestart(out, this.ball);
  }

  /** Step 41 — persist touch on possession + kick. */
  private commitTouch(playerIndex: number, position: { x: number; z: number }) {
    const player = this.players[playerIndex];
    if (!player) return;
    const role = player.team.players.find((p) => p.index === playerIndex)?.role ?? player.role;
    const touch = recordTouch(
      this.ballPossession,
      playerIndex,
      player.team.id,
      role,
      this.clock,
      position,
    );
    recordBallTouch(this.touchLog, touch);
    this.lastTouchTeam = player.team.id;
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

    const ballPos = this.ball?.translation();
    this.commitTouch(idx, ballPos ? { x: ballPos.x, z: ballPos.z } : { x: 0, z: 0 });
  }

  private handleBrainEvent(result: BrainEvent) {
    const at = this.clock;
    const ballPos = this.ball?.translation();
    const pos = ballPos ? { x: ballPos.x, z: ballPos.z } : { x: 0, z: 0 };

    switch (result.kind) {
      case "pass":
        this.commitTouch(result.from, pos);
        this.bus.emit({ ...result, at });
        break;

      case "tackle":
        this.commitTouch(result.by, pos);
        this.bus.emit({ ...result, at });
        break;

      case "shot":
        this.commitTouch(result.by, pos);
        this.bus.emit({ ...result, scored: false, at });
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
        applyAssistantSignal(
          this.assistants,
          recommendOffside(result.team, result.position, at, vision.quality),
        );
        gameStateStore.getState().setAssistants({ ...this.assistants });
        this.bus.emit({ ...result, given, visionQuality: vision.quality, at });
        if (!given) this.lastTouchTeam = result.team;
        break;
      }
    }
  }

  private updateCollisions() {
    if (!this.ball || this.restart) return;
    if (gameStateStore.getState().pendingFoul || gameStateStore.getState().advantage) return;

    const ballPos = this.ball.translation();
    const candidate = detectPlayerCollisions(this.players, ballPos);
    if (!candidate) return;

    const vision = this.evaluateVision(candidate.position);
    // Step 51 — only flag if the ref can reasonably see it (or quality mid+).
    if (!vision.inView && vision.quality < 0.2) return;

    this.bus.emit({
      kind: "possibleFoul",
      playerA: candidate.playerA,
      playerB: candidate.playerB,
      position: candidate.position,
      force: candidate.force,
      foulScore: candidate.foulScore,
      severity: candidate.severity,
      visionQuality: vision.quality,
      tackle: {
        speed: candidate.tackle.speed,
        angle: candidate.tackle.angle,
        force: candidate.tackle.force,
        ballTouched: candidate.tackle.ballTouched,
        legTouched: candidate.tackle.legTouched,
      },
      at: this.clock,
    });
  }

  private updateWhistle() {
    expirePendingFoul(this.clock);
  }

  private evaluateVision(position: { x: number; z: number }): Vision {
    if (!this.referee) {
      return { inView: false, distance: Infinity, angle: Math.PI, obstructed: false, quality: 0 };
    }
    const refPos = this.referee.body.translation();
    this.referee.camera.getWorldDirection(refereeDir);
    refereeDir.y = 0;
    refereeDir.normalize();
    const blockers = this.players
      .map((p) => {
        if (!p) return null;
        const t = p.body.translation();
        // Don't count players right on the incident as blockers.
        if (Math.hypot(t.x - position.x, t.z - position.z) < 1.5) return null;
        return { x: t.x, z: t.z };
      })
      .filter((b): b is { x: number; z: number } => !!b);
    return computeVision(refPos, refereeDir, position, blockers);
  }

  private updateReferee() {
    if (!this.referee) return;
    stepRefereeMovement(this.referee.body, this.referee.camera, this.referee.getInput());
  }

  private generateEvents() {
    // Event history trimming lives inside EventBus itself.
  }
}
