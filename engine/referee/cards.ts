import type { Card } from "../match/gameState";

// Step 53 — Cards. Yellow → second yellow → red.

export type CardBook = {
  yellows: Map<number, number>;
  reds: Set<number>;
  history: Card[];
};

export const createCardBook = (): CardBook => ({
  yellows: new Map(),
  reds: new Set(),
  history: [],
});

export type CardResult = {
  cards: Card[]; // one or two (second yellow + red)
  sentOff: boolean;
};

export const issueCard = (
  book: CardBook,
  playerIndex: number,
  type: "yellow" | "red",
): CardResult => {
  if (book.reds.has(playerIndex)) {
    return { cards: [], sentOff: true };
  }

  if (type === "red") {
    book.reds.add(playerIndex);
    const card: Card = { playerIndex, type: "red" };
    book.history.push(card);
    return { cards: [card], sentOff: true };
  }

  const prev = book.yellows.get(playerIndex) ?? 0;
  const next = prev + 1;
  book.yellows.set(playerIndex, next);
  const yellow: Card = { playerIndex, type: "yellow" };
  book.history.push(yellow);

  if (next >= 2) {
    book.reds.add(playerIndex);
    const red: Card = { playerIndex, type: "red" };
    book.history.push(red);
    return { cards: [yellow, red], sentOff: true };
  }

  return { cards: [yellow], sentOff: false };
};
