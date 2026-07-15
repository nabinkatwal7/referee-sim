import { scoreDecision, type DecisionAction, PENDING_TIMEOUT } from "./decision";
import { gameStateStore } from "../match/gameState";
import type { MatchStateMachine } from "../match/MatchStateMachine";

const describeAction = (action: DecisionAction): string =>
  ({
    playOn: "Play On",
    advantage: "Advantage",
    foul: "Foul given",
    yellow: "Yellow card",
    red: "Red card",
  })[action];

// Space pressed: if there's an incident waiting, open the decision window
// AND tell the match state machine to pause (it's the single authority on
// "what's happening"; the store's `paused` flag just mirrors it for the UI
// and <Physics paused>). The reaction time (for the "late" penalty) is
// measured from the incident to THIS moment — deliberation time after the
// window opens doesn't count against the player, same as a real referee who
// has already stopped play.
export const blowWhistle = (currentMatchTime: number, matchState: MatchStateMachine) => {
  const store = gameStateStore.getState();
  if (!store.pendingFoul || store.decisionWindowOpen) return;
  const reactionTime = Math.max(0, currentMatchTime - store.pendingFoul.at);
  matchState.pause();
  store.openDecisionWindow(reactionTime);
};

// The player picks one of Play On / Advantage / Foul / Yellow / Red.
export const makeDecision = (action: DecisionAction, matchState: MatchStateMachine) => {
  const store = gameStateStore.getState();
  const foul = store.pendingFoul;
  if (!foul || store.pendingReactionTime === null) return;

  const outcome = scoreDecision(foul.severity, action, store.pendingReactionTime, foul.visionQuality);
  store.adjustRating(outcome.ratingDelta);

  const notes = [
    outcome.correct ? "correct call" : "wrong call",
    outcome.late ? "late" : null,
    outcome.excellentPositioning ? "great positioning" : null,
  ].filter(Boolean);
  store.setCurrentEvent(`${describeAction(action)} (${notes.join(", ")})`);

  store.closeDecisionWindow();
  matchState.resume();
};

// Called every tick by the engine: if an incident has gone unacted-on for
// too long, it resolves itself as a missed "Play On" — always late, scored
// the same way a real decision would be. Never opened the decision window,
// so there's nothing to resume here.
export const expirePendingFoul = (currentMatchTime: number) => {
  const store = gameStateStore.getState();
  const foul = store.pendingFoul;
  if (!foul || store.decisionWindowOpen) return;
  if (currentMatchTime - foul.at < PENDING_TIMEOUT) return;

  const reactionTime = currentMatchTime - foul.at;
  const outcome = scoreDecision(foul.severity, "playOn", reactionTime, foul.visionQuality);
  store.adjustRating(outcome.ratingDelta);
  store.setCurrentEvent("Play on (incident missed)");
  store.setPendingFoul(null);
};
