import { MatchState } from "../../engine/match/MatchStateMachine";
import { CAREER_LABEL } from "../../engine/referee/career";
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
  const matchRating = useGameStore((state) => state.matchRating);
  const cards = useGameStore((state) => state.cards);
  const assistants = useGameStore((state) => state.assistants);
  const career = useGameStore((state) => state.career);
  const pendingFoul = useGameStore((state) => state.pendingFoul);
  const advantage = useGameStore((state) => state.advantage);
  const decisionWindowOpen = useGameStore((state) => state.decisionWindowOpen);
  const replayState = useGameStore((state) => state.replayState);
  const matchPhase = useGameStore((state) => state.matchPhase);
  const varState = useGameStore((state) => state.varState);

  const phaseLabel = PHASE_LABEL[matchPhase];
  const addedHint =
    matchClock.addedTime > 0 && !matchClock.inAddedTime && matchClock.periodLabel
      ? ` (+${matchClock.addedTime})`
      : matchClock.inAddedTime
        ? `  +${matchClock.addedTime}`
        : "";

  const arHint = assistants.left?.kind || assistants.right?.kind
    ? `AR: ${assistants.left?.kind ?? ""}${assistants.left && assistants.right ? " / " : ""}${assistants.right?.kind ?? ""}`
    : null;

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
        &nbsp; Rating: {matchRating.overall.toFixed(1)}{" "}
        {paused && matchPhase !== MatchState.PAUSED && "(PAUSED)"}
      </div>
      <div style={{ opacity: 0.75, fontSize: 12, marginTop: 2 }}>
        Acc {matchRating.accuracy.toFixed(1)} · Cons {matchRating.consistency.toFixed(1)} · Ctrl{" "}
        {matchRating.control.toFixed(1)} · Pos {matchRating.positioning.toFixed(1)} · Tim{" "}
        {matchRating.timing.toFixed(1)}
        {cards.length > 0 ? ` · Cards: ${cards.map((c) => `${c.type[0].toUpperCase()}#${c.playerIndex}`).join(" ")}` : ""}
      </div>
      <div style={{ opacity: 0.7, fontSize: 12 }}>
        {CAREER_LABEL[career.tier]}
        {arHint ? ` · ${arHint}` : ""}
        {varState.queue.length > 0 ? ` · VAR queue: ${varState.queue.length}` : ""}
      </div>
      {phaseLabel && (
        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{phaseLabel}</div>
      )}
      {currentEvent && <div style={{ opacity: 0.8, fontSize: 13 }}>{currentEvent}</div>}
      {advantage && (
        <div style={{ opacity: 0.9, fontSize: 13, color: "#81c784" }}>Advantage playing…</div>
      )}
      {pendingFoul && !decisionWindowOpen && (
        <div style={{ opacity: 0.9, fontSize: 13, color: "#ffd54f" }}>
          Incident — press SPACE to review
        </div>
      )}
      {replayState === "replay" && (
        <div style={{ fontSize: 20, fontWeight: 700, color: "#ff5252" }}>⟲ REPLAY</div>
      )}
      {replayState === "var" && (
        <div style={{ fontSize: 20, fontWeight: 700, color: "#4fc3f7" }}>VAR CHECK</div>
      )}
    </div>
  );
};

export default HUD;
