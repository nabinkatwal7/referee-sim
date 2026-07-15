import { useGameStore } from "../../engine/match/gameState";

const formatClock = (seconds: number) => {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
};

const HUD = () => {
  const score = useGameStore((state) => state.score);
  const time = useGameStore((state) => state.time);
  const currentEvent = useGameStore((state) => state.currentEvent);
  const paused = useGameStore((state) => state.paused);
  const rating = useGameStore((state) => state.rating);
  const pendingFoul = useGameStore((state) => state.pendingFoul);
  const decisionWindowOpen = useGameStore((state) => state.decisionWindowOpen);

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
        {score.home} - {score.away} &nbsp; {formatClock(time)} &nbsp; Rating: {rating.toFixed(1)}{" "}
        {paused && "(PAUSED)"}
      </div>
      {currentEvent && <div style={{ opacity: 0.8, fontSize: 13 }}>{currentEvent}</div>}
      {pendingFoul && !decisionWindowOpen && (
        <div style={{ opacity: 0.9, fontSize: 13, color: "#ffd54f" }}>
          Incident — press SPACE to review
        </div>
      )}
    </div>
  );
};

export default HUD;
