// Step 60 — Dynamic commentary.

export type CommentaryLine = {
  text: string;
  at: number;
  ttl: number;
};

const LINES: Record<string, string[]> = {
  goal: [
    "It's in the back of the net!",
    "They've found the breakthrough!",
    "Clinical finish — the crowd erupts!",
    "The goal is in the net!",
  ],
  foul: [
    "That's a robust challenge…",
    "The referee has something to look at here.",
    "Late? Late-ish. Decision pending.",
    "The referee has something to look at here.",
  ],
  card: [
    "Out comes the card!",
    "Discipline applied.",
    "He won't like that booking.",
  ],
  shot: [
    "Attempt on goal!",
    "They've got a sight of goal.",
    "Strike!",
    "The ball is on target!",
  ],
  pass: [
    "Neat interchange.",
    "Looking for the runner.",
    "Patient build-up.",
    "The ball is in the air!",
  ],
  rain: [
    "The pitch is slick now.",
    "Weather becoming a factor.",
    "The rain is falling.",
  ],
  protest: [
    "They're surrounding the referee!",
    "Strong words directed at the official.",
    "The players are not happy with the decision.",
    "The players are protesting the decision.",
  ],
  injury: [
    "He's down — looks hurt.",
    "Medical attention needed.",
    "The players are concerned about the player's injury.",
    "The player is receiving medical attention.",
  ],
  sub: ["Change on the way.", "Fresh legs entering the fray."],
  waste: [
    "They're taking their time here…",
    "Clock management from the restart.",
    "The players are wasting time.",
    "The clock is ticking.",
  ],
  kickoff: [
    "And we're underway.",
    "Kickoff — here we go.",
    "The game is underway!",
  ],
  default: [
    "The game flows on.",
    "Still everything to play for.",
    "The game is in progress!",
    "The game is flowing on.",
    "The game is progressing.",
  ],
};

const pick = (kind: string): string => {
  const pool = LINES[kind] ?? LINES.default;
  return pool[Math.floor(Math.random() * pool.length)]!;
};

export type CommentaryState = {
  current: CommentaryLine | null;
  history: string[];
};

export const createCommentary = (): CommentaryState => ({
  current: null,
  history: [],
});

export const pushCommentary = (
  state: CommentaryState,
  kind: string,
  at: number,
): CommentaryState => {
  const text = pick(kind);
  const current = { text, at, ttl: 4.5 };
  const history = [text, ...state.history].slice(0, 12);
  return { current, history };
};

export const stepCommentary = (
  state: CommentaryState,
  delta: number,
): CommentaryState => {
  if (!state.current) return state;
  const ttl = state.current.ttl - delta;
  if (ttl <= 0) return { ...state, current: null };
  return { ...state, current: { ...state.current, ttl } };
};
