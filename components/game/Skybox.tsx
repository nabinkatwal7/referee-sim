import { Environment, Sky } from "@react-three/drei";
import { useGameStore } from "./useGameState";

// "Stadium 01" HDRI by Poly Haven (polyhaven.com/a/stadium_01), CC0 — kept for
// reflections/ambient lighting only; Sky renders the actual visible backdrop.
//
// Sky's dome sits at `distance` from the origin — it must stay well inside the
// camera's far clipping plane (see Game.tsx) or it gets clipped entirely,
// leaving the transparent canvas showing the page background instead of sky.
const SKY_DISTANCE = 8000;

const Skybox = () => {
  const weather = useGameStore((s) => s.polish.weather);
  const rain = useGameStore((s) => s.polish.rain);

  const fogFar = weather === "storm" ? 450 : weather === "rain" ? 600 : 900;
  const fogColor =
    weather === "storm" ? "#6a7a88" : weather === "rain" ? "#8a9aa8" : "#bcd9ea";
  const bg =
    weather === "storm" ? "#5a6a78" : weather === "cloudy" ? "#9bb0c0" : "#8fc7ea";
  const turbidity = weather === "clear" ? 4 : weather === "storm" ? 12 : 7;
  const sunY = weather === "storm" ? 40 : 140;

  return (
    <>
      <color attach="background" args={[bg]} />
      <fog attach="fog" args={[fogColor, 200 + rain * 80, fogFar]} />
      <Sky
        sunPosition={[80, sunY, 80]}
        turbidity={turbidity}
        rayleigh={weather === "clear" ? 1.5 : 0.6}
        distance={SKY_DISTANCE}
      />
      <Environment files="/hdri/stadium_01_1k.hdr" />
    </>
  );
};

export default Skybox;
