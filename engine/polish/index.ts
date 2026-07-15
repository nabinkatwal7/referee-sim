// Step 60 — Polish hub. Thin systems: atmosphere, narrative, admin, meta.

import type { MatchEvent } from "../match/events";
import type { TeamId } from "../team/Team";
import {
  beginBroadcastReplay,
  createBroadcast,
  endBroadcastReplay,
  type BroadcastState,
} from "./broadcast";
import {
  createCommentary,
  pushCommentary,
  stepCommentary,
  type CommentaryState,
} from "./commentary";
import {
  createCrowd,
  crowdPressureDelta,
  reactCrowd,
  type CrowdState,
} from "./crowd";
import {
  DIFFICULTY_PARAMS,
  type Difficulty,
  type DifficultyParams,
} from "./difficulty";
import {
  announceSub,
  clearFourthBoard,
  createFourthOfficial,
  showAddedTime,
  type FourthOfficialState,
} from "./fourthOfficial";
import { createInjuries, rollInjury, type InjuryState } from "./injuries";
import { createManagers, reactManagers, type ManagerState } from "./managers";
import { beginProtest, createProtest, stepProtest, type ProtestState } from "./protests";
import { loadMatch, saveMatch, type SaveBlob } from "./saveLoad";
import {
  bumpStat,
  createStatistics,
  type MatchStatistics,
} from "./statistics";
import {
  completeSubstitution,
  createSubstitutions,
  queueSubstitution,
  type SubstitutionState,
} from "./substitutions";
import { createTimeWaste, stepTimeWaste, type TimeWasteState } from "./timeWasting";
import {
  applyRainPhysics,
  createWeather,
  stepWeather,
  type WeatherState,
} from "./weather";

export type PolishState = {
  difficulty: Difficulty;
  params: DifficultyParams;
  weather: WeatherState;
  crowd: CrowdState;
  commentary: CommentaryState;
  protest: ProtestState;
  timeWaste: TimeWasteState;
  injuries: InjuryState;
  substitutions: SubstitutionState;
  managers: ManagerState;
  fourth: FourthOfficialState;
  broadcast: BroadcastState;
  statistics: MatchStatistics;
  /** Last auto-save clock second. */
  lastSaveAt: number;
};

export type PolishHud = {
  difficulty: Difficulty;
  weather: string;
  rain: number;
  crowdVolume: number;
  crowdMood: string;
  crowdPressure: number;
  commentary: string | null;
  protest: string | null;
  timeWaste: string | null;
  fourthBoard: string | null;
  managers: { home: string; away: string };
  broadcast: string | null;
  injuries: number;
  subsUsed: string;
  stats: MatchStatistics;
};

export const createPolish = (difficulty: Difficulty = "normal"): PolishState => ({
  difficulty,
  params: DIFFICULTY_PARAMS[difficulty],
  weather: createWeather(),
  crowd: createCrowd(),
  commentary: createCommentary(),
  protest: createProtest(),
  timeWaste: createTimeWaste(),
  injuries: createInjuries(),
  substitutions: createSubstitutions(),
  managers: createManagers(),
  fourth: createFourthOfficial(),
  broadcast: createBroadcast(),
  statistics: createStatistics(),
  lastSaveAt: 0,
});

export const polishHud = (p: PolishState): PolishHud => ({
  difficulty: p.difficulty,
  weather: p.weather.kind,
  rain: p.weather.rain,
  crowdVolume: p.crowd.volume,
  crowdMood: p.crowd.mood,
  crowdPressure: p.crowd.pressure,
  commentary: p.commentary.current?.text ?? null,
  protest: p.protest.active ? `Protest #${p.protest.playerIndex}` : null,
  timeWaste: p.timeWaste.warning,
  fourthBoard: p.fourth.board.message,
  managers: { home: p.managers.home, away: p.managers.away },
  broadcast: p.broadcast.label,
  injuries: p.injuries.list.length,
  subsUsed: `${p.substitutions.used.home}/${p.substitutions.max} · ${p.substitutions.used.away}/${p.substitutions.max}`,
  stats: p.statistics,
});

export const setDifficulty = (p: PolishState, difficulty: Difficulty): PolishState => ({
  ...p,
  difficulty,
  params: DIFFICULTY_PARAMS[difficulty],
});

/** Per-frame polish. Returns rating nudge from crowd pressure. */
export const stepPolish = (
  p: PolishState,
  at: number,
  delta: number,
  opts: {
    restartActive: boolean;
    scoreDiff: number;
    addedMinutes: number;
  },
): { polish: PolishState; ratingDelta: number } => {
  let weather = stepWeather(p.weather, at);
  let commentary = stepCommentary(p.commentary, delta);
  if (weather.kind !== p.weather.kind && weather.rain > 0.3) {
    commentary = pushCommentary(commentary, "rain", at);
  }

  let crowd = reactCrowd(p.crowd, { kind: "tick", scoreDiff: opts.scoreDiff });
  const managers = reactManagers(p.managers, { kind: "tick" });
  const protest = stepProtest(p.protest, at);
  const timeWaste = stepTimeWaste(p.timeWaste, delta, opts.restartActive);

  let fourth = p.fourth;
  if (opts.addedMinutes > 0 && fourth.board.addedMinutes !== opts.addedMinutes) {
    fourth = showAddedTime(fourth, opts.addedMinutes);
  }
  if (timeWaste.flagged && timeWaste.warning) {
    fourth = { board: { ...fourth.board, message: timeWaste.warning } };
  }

  const ratingDelta = crowdPressureDelta(
    crowd.pressure,
    p.params.pressureWeight,
    delta,
  );

  let lastSaveAt = p.lastSaveAt;
  // Soft auto-save every ~30s of match clock.
  if (at - lastSaveAt > 30) lastSaveAt = at;

  return {
    polish: {
      ...p,
      weather,
      commentary,
      crowd,
      managers,
      protest,
      timeWaste,
      fourth,
      lastSaveAt,
    },
    ratingDelta,
  };
};

export const onPolishEvent = (p: PolishState, event: MatchEvent): PolishState => {
  let next = { ...p };
  const at = event.at;

  switch (event.kind) {
    case "goal": {
      const home = event.team === "home";
      next.crowd = reactCrowd(next.crowd, { kind: "goal", home });
      next.managers = reactManagers(next.managers, {
        kind: "goal",
        scoring: event.team,
      });
      next.commentary = pushCommentary(next.commentary, "goal", at);
      break;
    }
    case "pass":
      next.statistics = bumpStat(next.statistics, "passes");
      if (Math.random() < 0.08) {
        next.commentary = pushCommentary(next.commentary, "pass", at);
      }
      break;
    case "shot":
      next.statistics = bumpStat(next.statistics, "shots");
      next.commentary = pushCommentary(next.commentary, "shot", at);
      next.crowd = reactCrowd(next.crowd, { kind: "nearMiss" });
      break;
    case "tackle":
      next.statistics = bumpStat(next.statistics, "tackles");
      break;
    case "foul":
    case "possibleFoul": {
      next.statistics = bumpStat(next.statistics, "fouls");
      const score =
        event.kind === "possibleFoul"
          ? event.foulScore
          : (event.foulScore ?? 0.5);
      const controversial = score > 0.65;
      next.crowd = reactCrowd(next.crowd, { kind: "foul", controversial });
      next.commentary = pushCommentary(next.commentary, "foul", at);
      next.managers = reactManagers(next.managers, {
        kind: "foulAgainst",
        team: "home", // ponytail: no team on possibleFoul — default home shout
      });
      const victim = event.kind === "possibleFoul" ? event.playerB : event.against;
      if (score > 0.55) {
        const before = next.injuries.list.length;
        next.injuries = rollInjury(next.injuries, victim, score, at);
        if (next.injuries.list.length > before) {
          next.statistics = bumpStat(next.statistics, "injuries");
          next.commentary = pushCommentary(next.commentary, "injury", at);
          const last = next.injuries.list[next.injuries.list.length - 1]!;
          if (last.severity === "stretcher") {
            const queued = queueSubstitution(next.substitutions, {
              team: "home",
              off: victim,
              on: victim, // ponytail: no bench roster — same slot placeholder
              at,
              reason: "injury",
            });
            if (queued) {
              next.substitutions = completeSubstitution(queued);
              next.fourth = announceSub(next.fourth, `SUB injury #${victim}`);
              next.commentary = pushCommentary(next.commentary, "sub", at);
            }
          }
        }
      }
      break;
    }
    case "corner":
      next.statistics = bumpStat(next.statistics, "corners");
      break;
    case "throwIn":
      next.statistics = bumpStat(next.statistics, "throwIns");
      break;
    case "goalKick":
      next.statistics = bumpStat(next.statistics, "goalKicks");
      break;
    case "kickoff":
      next.commentary = pushCommentary(next.commentary, "kickoff", at);
      next.fourth = clearFourthBoard(next.fourth);
      break;
    default:
      break;
  }

  return next;
};

/** Cards are issued via whistle (not MatchEvent) — call from GameLoop. */
export const onPolishCard = (
  p: PolishState,
  card: { playerIndex: number; type: "yellow" | "red" },
  at: number,
  against: TeamId = "home",
): PolishState => {
  let next = { ...p };
  const red = card.type === "red";
  next.statistics = bumpStat(next.statistics, "cards");
  next.crowd = reactCrowd(next.crowd, { kind: "card", red });
  next.commentary = pushCommentary(next.commentary, "card", at);
  next.protest = beginProtest(at, card.playerIndex, red ? 0.95 : 0.55);
  next.statistics = bumpStat(next.statistics, "protests");
  next.commentary = pushCommentary(next.commentary, "protest", at);
  next.managers = reactManagers(next.managers, {
    kind: "card",
    against,
    red,
  });
  return next;
};

export const applyBallRain = (
  polish: PolishState,
  vel: { x: number; y: number; z: number },
  delta: number,
) => applyRainPhysics(vel, polish.weather.rain, delta);

export const noteBroadcastReplay = (p: PolishState, at: number): PolishState => ({
  ...p,
  broadcast: beginBroadcastReplay(p.broadcast, at, "sideline"),
});

export const clearBroadcast = (p: PolishState): PolishState => ({
  ...p,
  broadcast: endBroadcastReplay(p.broadcast),
});

export const buildSaveBlob = (
  p: PolishState,
  opts: {
    score: { home: number; away: number };
    time: number;
    careerTier: string;
    matchesCompleted: number;
  },
): SaveBlob => ({
  version: 1,
  savedAt: Date.now(),
  score: opts.score,
  time: opts.time,
  difficulty: p.difficulty,
  weather: p.weather.kind,
  statistics: p.statistics,
  careerTier: opts.careerTier,
  matchesCompleted: opts.matchesCompleted,
});

export const tryAutoSave = (
  p: PolishState,
  at: number,
  opts: {
    score: { home: number; away: number };
    time: number;
    careerTier: string;
    matchesCompleted: number;
  },
): PolishState => {
  if (at - p.lastSaveAt < 30) return p;
  saveMatch(buildSaveBlob(p, opts));
  return { ...p, lastSaveAt: at };
};

export const tryLoadSave = (): SaveBlob | null => loadMatch();

export type { TeamId };
