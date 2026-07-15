import {
  addedDisplayToWall,
  createMatchClockSnapshot,
  HALF_DURATION_SECONDS,
  snapshotClock,
  type MatchClockSnapshot,
} from "./MatchClock";

// Real TS `enum`s aren't allowed under this project's erasableSyntaxOnly
// tsconfig setting (they emit runtime code) — this const-object + derived
// type is the erasable equivalent; every call site (MatchState.KICKOFF etc.)
// works identically either way.
export const MatchState = {
  PRE_MATCH: "PRE_MATCH",
  KICKOFF: "KICKOFF",
  IN_PLAY: "IN_PLAY",
  GOAL: "GOAL",
  HALF_TIME: "HALF_TIME",
  SECOND_HALF: "SECOND_HALF",
  FULL_TIME: "FULL_TIME",
  PAUSED: "PAUSED",
} as const;

export type MatchState = (typeof MatchState)[keyof typeof MatchState];

export type MatchHalf = "first" | "second";
export type StateListener = (state: MatchState, previous: MatchState) => void;

const KICKOFF_DELAY = 2;
const GOAL_CELEBRATION_DURATION = 3;
const HALF_TIME_DURATION = 5;
const HALF_DURATION = HALF_DURATION_SECONDS;

export class MatchStateMachine {
  private state: MatchState = MatchState.PRE_MATCH;
  private prePauseState: MatchState = MatchState.PRE_MATCH;
  private timer = 0;
  private halfPlayClock = 0;
  private half: MatchHalf = "first";
  private listeners: StateListener[] = [];

  // Stoppage: awarded when regular half time hits, then play continues.
  private addedTimeMinutes = 0;
  private inAddedTime = false;
  private addedElapsed = 0;

  get current(): MatchState {
    return this.state;
  }

  get currentHalf(): MatchHalf {
    return this.half;
  }

  isPlaying(): boolean {
    return this.state === MatchState.IN_PLAY || this.state === MatchState.SECOND_HALF;
  }

  getClock(): MatchClockSnapshot {
    const period =
      this.state === MatchState.HALF_TIME
        ? "half_time"
        : this.state === MatchState.FULL_TIME
          ? "full_time"
          : this.state === MatchState.PRE_MATCH
            ? "pre"
            : this.half === "second"
              ? "second"
              : "first";

    return snapshotClock({
      period,
      halfPlaySeconds: this.halfPlayClock,
      halfIsSecond: this.half === "second",
      addedTime: this.addedTimeMinutes,
      inAddedTime: this.inAddedTime,
      addedElapsed: this.addedElapsed,
    });
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private transition(next: MatchState) {
    const previous = this.state;
    this.state = next;
    this.timer = 0;
    this.listeners.forEach((listener) => listener(next, previous));
  }

  pause() {
    if (this.state === MatchState.PAUSED) return;
    this.prePauseState = this.state;
    this.transition(MatchState.PAUSED);
  }

  resume() {
    if (this.state !== MatchState.PAUSED) return;
    this.transition(this.prePauseState);
  }

  reportGoal() {
    if (this.isPlaying()) this.transition(MatchState.GOAL);
  }

  /** Roll / bump stoppage minutes (e.g. after fouls). Min 1 when half expires. */
  awardAddedTime(minutes: number) {
    this.addedTimeMinutes = Math.max(this.addedTimeMinutes, Math.ceil(minutes));
  }

  update(delta: number) {
    this.timer += delta;

    switch (this.state) {
      case MatchState.PRE_MATCH:
        this.transition(MatchState.KICKOFF);
        break;

      case MatchState.KICKOFF:
        if (this.timer >= KICKOFF_DELAY) {
          this.transition(this.half === "first" ? MatchState.IN_PLAY : MatchState.SECOND_HALF);
        }
        break;

      case MatchState.IN_PLAY:
      case MatchState.SECOND_HALF:
        this.tickPlay(delta);
        break;

      case MatchState.GOAL:
        if (this.timer >= GOAL_CELEBRATION_DURATION) {
          this.transition(MatchState.KICKOFF);
        }
        break;

      case MatchState.HALF_TIME:
        if (this.timer >= HALF_TIME_DURATION) {
          this.half = "second";
          this.resetHalfClocks();
          this.transition(MatchState.KICKOFF);
        }
        break;

      case MatchState.FULL_TIME:
      case MatchState.PAUSED:
        break;
    }
  }

  private resetHalfClocks() {
    this.halfPlayClock = 0;
    this.addedTimeMinutes = 0;
    this.inAddedTime = false;
    this.addedElapsed = 0;
  }

  private endHalf() {
    this.resetHalfClocks();
    this.transition(this.half === "first" ? MatchState.HALF_TIME : MatchState.FULL_TIME);
  }

  private tickPlay(delta: number) {
    if (!this.inAddedTime) {
      this.halfPlayClock += delta;
      if (this.halfPlayClock < HALF_DURATION) return;

      // Enter stoppage. Default 1–3 display minutes if nothing awarded yet.
      if (this.addedTimeMinutes <= 0) {
        this.addedTimeMinutes = 1 + Math.floor(Math.random() * 3);
      }
      this.inAddedTime = true;
      this.halfPlayClock = HALF_DURATION;
      this.addedElapsed = 0;
      return;
    }

    this.addedElapsed += delta;
    if (this.addedElapsed >= addedDisplayToWall(this.addedTimeMinutes)) {
      this.endHalf();
    }
  }
}

// Re-export for callers that only need the empty snapshot type.
export { createMatchClockSnapshot };
export type { MatchClockSnapshot };
