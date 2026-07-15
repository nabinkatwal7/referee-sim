// Step 40 — Match Clock.
// Minute · Second · Added time · Halftime · Second half · Full time.

export type ClockPeriod = "pre" | "first" | "half_time" | "second" | "full_time";

export type MatchClockSnapshot = {
  minute: number;
  second: number;
  /** Stoppage minutes awarded for the current half (0 if none yet). */
  addedTime: number;
  /** True while playing inside stoppage. */
  inAddedTime: boolean;
  /** Seconds elapsed inside the current stoppage window. */
  addedElapsed: number;
  period: ClockPeriod;
  /** e.g. "37:12" or "45+2:08" */
  display: string;
  /** Short period label for HUD. */
  periodLabel: string;
};

/** Arcade wall-clock length of one half (real seconds). */
export const HALF_DURATION_SECONDS = 90;
/** Each half displays as this many football minutes. */
export const DISPLAY_HALF_MINUTES = 45;

const PERIOD_LABEL: Record<ClockPeriod, string> = {
  pre: "",
  first: "1H",
  half_time: "HT",
  second: "2H",
  full_time: "FT",
};

export const createMatchClockSnapshot = (): MatchClockSnapshot => ({
  minute: 0,
  second: 0,
  addedTime: 0,
  inAddedTime: false,
  addedElapsed: 0,
  period: "pre",
  display: "00:00",
  periodLabel: "",
});

const pad2 = (n: number) => n.toString().padStart(2, "0");

export const formatMatchClock = (
  minute: number,
  second: number,
  inAddedTime: boolean,
  baseMinute: number,
  addedElapsed: number,
): string => {
  if (!inAddedTime) return `${pad2(minute)}:${pad2(second)}`;
  const addMin = Math.floor(addedElapsed / 60);
  const addSec = Math.floor(addedElapsed % 60);
  return `${pad2(baseMinute)}+${addMin}:${pad2(addSec)}`;
};

/** Map wall-clock play within a half → display minute/second (0..45). */
export const playToDisplay = (
  halfPlaySeconds: number,
  halfIsSecond: boolean,
): { minute: number; second: number } => {
  const ratio = Math.min(1, halfPlaySeconds / HALF_DURATION_SECONDS);
  const totalSecs = ratio * DISPLAY_HALF_MINUTES * 60;
  const base = halfIsSecond ? DISPLAY_HALF_MINUTES : 0;
  const minute = base + Math.floor(totalSecs / 60);
  const second = Math.floor(totalSecs % 60);
  // Cap regular time at 44:59 until added time / exact 45.
  if (!halfIsSecond && minute >= DISPLAY_HALF_MINUTES) {
    return { minute: DISPLAY_HALF_MINUTES, second: 0 };
  }
  if (halfIsSecond && minute >= DISPLAY_HALF_MINUTES * 2) {
    return { minute: DISPLAY_HALF_MINUTES * 2, second: 0 };
  }
  return { minute, second };
};

/** Wall seconds that correspond to `displayMinutes` of stoppage. */
export const addedDisplayToWall = (displayMinutes: number): number =>
  (displayMinutes / DISPLAY_HALF_MINUTES) * HALF_DURATION_SECONDS;

export const snapshotClock = (args: {
  period: ClockPeriod;
  halfPlaySeconds: number;
  halfIsSecond: boolean;
  addedTime: number;
  inAddedTime: boolean;
  addedElapsed: number;
}): MatchClockSnapshot => {
  const baseMinute = args.halfIsSecond ? DISPLAY_HALF_MINUTES * 2 : DISPLAY_HALF_MINUTES;
  let minute: number;
  let second: number;

  if (args.period === "half_time") {
    minute = DISPLAY_HALF_MINUTES;
    second = 0;
  } else if (args.period === "full_time") {
    minute = DISPLAY_HALF_MINUTES * 2;
    second = 0;
  } else if (args.period === "pre") {
    minute = 0;
    second = 0;
  } else if (args.inAddedTime) {
    minute = baseMinute;
    second = 0;
  } else {
    const d = playToDisplay(args.halfPlaySeconds, args.halfIsSecond);
    minute = d.minute;
    second = d.second;
  }

  const display = formatMatchClock(
    minute,
    second,
    args.inAddedTime,
    baseMinute,
    args.addedElapsed * (DISPLAY_HALF_MINUTES / HALF_DURATION_SECONDS) * 60,
  );

  return {
    minute,
    second,
    addedTime: args.addedTime,
    inAddedTime: args.inAddedTime,
    addedElapsed: args.addedElapsed,
    period: args.period,
    display,
    periodLabel: PERIOD_LABEL[args.period],
  };
};
