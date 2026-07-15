import { Environment, Sky } from "@react-three/drei";

// "Stadium 01" HDRI by Poly Haven (polyhaven.com/a/stadium_01), CC0 — kept for
// reflections/ambient lighting only; Sky renders the actual visible backdrop.
//
// Sky's dome sits at `distance` from the origin — it must stay well inside the
// camera's far clipping plane (see Game.tsx) or it gets clipped entirely,
// leaving the transparent canvas showing the page background instead of sky.
const SKY_DISTANCE = 8000;

const Skybox = () => {
  return (
    <>
      <color attach="background" args={["#8fc7ea"]} />
      <fog attach="fog" args={["#bcd9ea", 250, 900]} />
      <Sky sunPosition={[80, 140, 80]} turbidity={4} rayleigh={1.5} distance={SKY_DISTANCE} />
      <Environment files="/hdri/stadium_01_1k.hdr" />
    </>
  );
};

export default Skybox;
