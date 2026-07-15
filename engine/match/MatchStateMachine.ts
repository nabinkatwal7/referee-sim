export enum MatchState {
  PRE_MATCH = "PRE_MATCH",
  KICKOFF = "KICKOFF",
  IN_PLAY = "IN_PLAY",
  GOAL = "GOAL",
  HALF_TIME = "HALF_TIME",
  SECOND_HALF = "SECOND_HALF",
  FULL_TIME = "FULL_TIME",
  PAUSED = "PAUSED",
}

export type MatchHalf = "first" | "second";
export type StateListener = (state: MatchState, previous: MatchState) => void;

// Arcade-length timings, not real 45-minute halves — this is a simulation,
// not a broadcast. Tune freely.
const KICKOFF_DELAY = 2; // seconds standing at kickoff before play starts
const GOAL_CELEBRATION_DURATION = 3;
const HALF_TIME_DURATION = 5;
const HALF_DURATION = 90; // seconds of actual play per half

// The single authority for "what is happening right now" — nothing else
// decides this independently. GameLoop reads `current`/`isPlaying()` to
// gate simulation, and subscribes to transitions to trigger side effects
// (reset positions on kickoff, flip attacking direction after half-time).
// Pure engine: no React, no store — just an enum, a timer, and listeners.
export class MatchStateMachine {
  private state: MatchState = MatchState.PRE_MATCH;
  private prePauseState: MatchState = MatchState.PRE_MATCH;
  private timer = 0;
  private halfPlayClock = 0;
  private half: MatchHalf = "first";
  private listeners: StateListener[] = [];

  get current(): MatchState {
    return this.state;
  }

  get currentHalf(): MatchHalf {
    return this.half;
  }

  isPlaying(): boolean {
    return this.state === MatchState.IN_PLAY || this.state === MatchState.SECOND_HALF;
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

  // A goal was scored (called by GameLoop when a GoalEvent fires).
  reportGoal() {
    if (this.isPlaying()) this.transition(MatchState.GOAL);
  }

  // Called once per tick with real elapsed time. Not gated by isPlaying()
  // itself — this is what DECIDES whether we're playing.
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
        this.halfPlayClock += delta;
        if (this.halfPlayClock >= HALF_DURATION) {
          this.halfPlayClock = 0;
          this.transition(this.half === "first" ? MatchState.HALF_TIME : MatchState.FULL_TIME);
        }
        break;

      case MatchState.GOAL:
        if (this.timer >= GOAL_CELEBRATION_DURATION) {
          this.transition(MatchState.KICKOFF);
        }
        break;

      case MatchState.HALF_TIME:
        if (this.timer >= HALF_TIME_DURATION) {
          this.half = "second";
          this.transition(MatchState.KICKOFF);
        }
        break;

      case MatchState.FULL_TIME:
      case MatchState.PAUSED:
        // Terminal / externally driven — nothing to do here.
        break;
    }
  }
}
