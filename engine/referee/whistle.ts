import { scoreDecision, type DecisionAction, PENDING_TIMEOUT } from "./decision";
import { useGameStore } from "../match/gameState";

const describeAction = (action: DecisionAction): string =>
  ({
    playOn: "Play On",
    advantage: "Advantage",
    foul: "Foul given",
    yellow: "Yellow card",
    red: "Red card",
  })[action];

// Space pressed: if there's an incident waiting, open the decision window.
// The reaction time (for the "late" penalty) is measured from the incident
// to THIS moment — deliberation time after the window opens doesn't count
// against the player, same as a real referee who has already stopped play.
export const blowWhistle = (currentMatchTime: number) => {
  const store = useGameStore.getState();
  if (!store.pendingFoul || store.decisionWindowOpen) return;
  const reactionTime = Math.max(0, currentMatchTime - store.pendingFoul.at);
  store.openDecisionWindow(reactionTime);
};

// The player picks one of Play On / Advantage / Foul / Yellow / Red.
export const makeDecision = (action: DecisionAction) => {
  const store = useGameStore.getState();
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
};

// Called every tick by the engine: if an incident has gone unacted-on for
// too long, it resolves itself as a missed "Play On" — always late, scored
// the same way a real decision would be.
export const expirePendingFoul = (currentMatchTime: number) => {
  const store = useGameStore.getState();
  const foul = store.pendingFoul;
  if (!foul || store.decisionWindowOpen) return;
  if (currentMatchTime - foul.at < PENDING_TIMEOUT) return;

  const reactionTime = currentMatchTime - foul.at;
  const outcome = scoreDecision(foul.severity, "playOn", reactionTime, foul.visionQuality);
  store.adjustRating(outcome.ratingDelta);
  store.setCurrentEvent("Play on (incident missed)");
  store.setPendingFoul(null);
};
