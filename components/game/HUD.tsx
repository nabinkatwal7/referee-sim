import { MatchState } from "../../engine/match/MatchStateMachine";
import { useGameStore } from "./useGameState";

const PHASE_LABEL: Partial<Record<MatchState, string>> = {
  [MatchState.KICKOFF]: "KICKOFF",
  [MatchState.GOAL]: "GOAL!",
  [MatchState.HALF_TIME]: "HALF TIME",
  [MatchState.FULL_TIME]: "FULL TIME",
};

const HUD = () => {
  const score = useGameStore((state) => state.score);
  const matchClock = useGameStore((state) => state.matchClock);
  const currentEvent = useGameStore((state) => state.currentEvent);
  const paused = useGameStore((state) => state.paused);
  const rating = useGameStore((state) => state.rating);
  const pendingFoul = useGameStore((state) => state.pendingFoul);
  const decisionWindowOpen = useGameStore((state) => state.decisionWindowOpen);
  const replayState = useGameStore((state) => state.replayState);
  const matchPhase = useGameStore((state) => state.matchPhase);

  const phaseLabel = PHASE_LABEL[matchPhase];
  const addedHint =
    matchClock.addedTime > 0 && !matchClock.inAddedTime && matchClock.periodLabel
      ? ` (+${matchClock.addedTime})`
      : matchClock.inAddedTime
        ? `  +${matchClock.addedTime}`
        : "";

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        pointerEvents: "none",
        padding: "1rem",
        color: "white",
        fontFamily: "sans-serif",
      }}
    >
      <div>
        {score.home} - {score.away} &nbsp; {matchClock.display}
        {matchClock.periodLabel ? ` · ${matchClock.periodLabel}` : ""}
        {addedHint}
        &nbsp; Rating: {rating.toFixed(1)}{" "}
        {paused && matchPhase !== MatchState.PAUSED && "(PAUSED)"}
      </div>
      {phaseLabel && (
        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{phaseLabel}</div>
      )}
      {currentEvent && <div style={{ opacity: 0.8, fontSize: 13 }}>{currentEvent}</div>}
      {pendingFoul && !decisionWindowOpen && (
        <div style={{ opacity: 0.9, fontSize: 13, color: "#ffd54f" }}>
          Incident — press SPACE to review
        </div>
      )}
      {replayState === "replay" && (
        <div style={{ fontSize: 20, fontWeight: 700, color: "#ff5252" }}>⟲ REPLAY</div>
      )}
    </div>
  );
};

export default HUD;
