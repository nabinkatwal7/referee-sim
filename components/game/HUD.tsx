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
        {score.home} - {score.away} &nbsp; {formatClock(time)} {paused && "(PAUSED)"}
      </div>
      {currentEvent && <div style={{ opacity: 0.8, fontSize: 13 }}>{currentEvent}</div>}
    </div>
  );
};

export default HUD;
