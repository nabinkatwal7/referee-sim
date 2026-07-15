import type { DecisionAction } from "../../engine/referee/decision";
import { makeDecision } from "../../engine/referee/whistle";
import { useGameStore } from "./useGameState";

const OPTIONS: { action: DecisionAction; label: string }[] = [
  { action: "playOn", label: "Play On" },
  { action: "advantage", label: "Advantage" },
  { action: "foul", label: "Foul" },
  { action: "yellow", label: "Yellow" },
  { action: "red", label: "Red" },
];

// The Whistle System's decision window: Space (see WhistleListener) pauses
// the game and opens this; the player rules on the incident without being
// shown its hidden severity — that's the whole point of the mechanic.
const Whistle = () => {
  const open = useGameStore((state) => state.decisionWindowOpen);
  const foul = useGameStore((state) => state.pendingFoul);

  if (!open || !foul) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        background: "rgba(0,0,0,0.45)",
        fontFamily: "sans-serif",
        color: "white",
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 600 }}>
        Incident: #{foul.playerA} vs #{foul.playerB}
      </div>
      <div style={{ opacity: 0.8, fontSize: 13 }}>What's the call?</div>
      <div style={{ display: "flex", gap: "0.75rem" }}>
        {OPTIONS.map(({ action, label }) => (
          <button
            key={action}
            onClick={() => makeDecision(action)}
            style={{
              padding: "0.6rem 1.2rem",
              fontSize: 15,
              fontFamily: "sans-serif",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              background: "#fff",
              color: "#111",
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Whistle;
