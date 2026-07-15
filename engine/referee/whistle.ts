import { gameStateStore } from "../match/gameState";
import type { MatchStateMachine } from "../match/MatchStateMachine";
import { issueCard, type CardBook } from "./cards";
import {
  ADVANTAGE_WINDOW,
  PENDING_TIMEOUT,
  scoreDecision,
  type DecisionAction,
} from "./decision";
import { enqueueVar } from "./var";

const describeAction = (action: DecisionAction): string =>
  ({
    playOn: "Play On",
    advantage: "Advantage",
    foul: "Foul given",
    yellow: "Yellow card",
    red: "Red card",
  })[action];

export const blowWhistle = (
  currentMatchTime: number,
  matchState: MatchStateMachine,
) => {
  const store = gameStateStore.getState();
  // Advantage pending: whistle recalls the foul.
  if (store.advantage && !store.decisionWindowOpen) {
    const adv = store.advantage;
    store.setAdvantage(null);
    store.setPendingFoul(adv.foul);
    const reactionTime = Math.max(0, currentMatchTime - adv.foul.at);
    matchState.pause();
    store.openDecisionWindow(reactionTime);
    store.setCurrentEvent("Advantage cancelled — decide on the foul");
    return;
  }
  if (!store.pendingFoul || store.decisionWindowOpen) return;
  const reactionTime = Math.max(0, currentMatchTime - store.pendingFoul.at);
  matchState.pause();
  store.openDecisionWindow(reactionTime);
};

export type DecisionHooks = {
  cardBook: CardBook;
  onDisciplinary?: (playerIndex: number, sentOff: boolean) => void;
};

export const makeDecision = (
  action: DecisionAction,
  matchState: MatchStateMachine,
  hooks?: DecisionHooks,
) => {
  const store = gameStateStore.getState();
  const foul = store.pendingFoul;
  if (!foul || store.pendingReactionTime === null) return;

  const outcome = scoreDecision(
    foul.severity,
    action,
    store.pendingReactionTime,
    foul.visionQuality,
    store.matchRating,
  );
  store.setMatchRating(outcome.dimensions);

  const notes = [
    outcome.correct ? "correct call" : "wrong call",
    outcome.late ? "late" : null,
    outcome.excellentPositioning ? "great positioning" : null,
  ].filter(Boolean);

  // Step 53 — cards
  if ((action === "yellow" || action === "red") && hooks) {
    const result = issueCard(hooks.cardBook, foul.playerA, action);
    for (const c of result.cards) store.addCard(c);
    if (result.sentOff) hooks.onDisciplinary?.(foul.playerA, true);
    if (action === "red" || result.sentOff) {
      const vs = store.varState;
      enqueueVar(vs, {
        kind:
          result.sentOff && action === "yellow"
            ? "red"
            : action === "red"
              ? "red"
              : "red",
        playerA: foul.playerA,
        playerB: foul.playerB,
        position: foul.position,
        at: foul.at,
        cameras: ["main", "sideline", "tactical"],
      });
      store.setVarState({ ...vs });
    }
  }

  // Step 54 — Advantage: continue play, return to foul if needed.
  if (action === "advantage") {
    store.setAdvantage({
      foul,
      expiresAt: foul.at + store.pendingReactionTime + ADVANTAGE_WINDOW,
    });
    store.setCurrentEvent(`Advantage (${notes.join(", ")})`);
    store.closeDecisionWindow();
    matchState.resume();
    return;
  }

  if (action === "foul" || action === "yellow" || action === "red") {
    store.setCurrentEvent(
      `${describeAction(action)} (#${foul.playerA}) (${notes.join(", ")})`,
    );
  } else {
    store.setCurrentEvent(`${describeAction(action)} (${notes.join(", ")})`);
  }

  store.setAdvantage(null);
  store.closeDecisionWindow();
  matchState.resume();
};

export const expirePendingFoul = (currentMatchTime: number) => {
  const store = gameStateStore.getState();

  // Advantage times out without a useful attack → re-queue foul for decision.
  if (store.advantage && currentMatchTime >= store.advantage.expiresAt) {
    const foul = store.advantage.foul;
    store.setAdvantage(null);
    store.setPendingFoul(foul);
    store.setCurrentEvent("Advantage over — foul available");
    return;
  }

  const foul = store.pendingFoul;
  if (!foul || store.decisionWindowOpen) return;
  if (currentMatchTime - foul.at < PENDING_TIMEOUT) return;

  const reactionTime = currentMatchTime - foul.at;
  const outcome = scoreDecision(
    foul.severity,
    "playOn",
    reactionTime,
    foul.visionQuality,
    store.matchRating,
  );
  store.setMatchRating(outcome.dimensions);
  store.setCurrentEvent("Play on (incident missed)");
  store.setPendingFoul(null);
};
