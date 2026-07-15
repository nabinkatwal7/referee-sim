import { Environment, Sky } from "@react-three/drei";

// "Stadium 01" HDRI by Poly Haven (polyhaven.com/a/stadium_01), CC0 — kept for
// reflections/ambient lighting only; Sky renders the actual visible backdrop.
const Skybox = () => {
  return (
    <>
      <Sky sunPosition={[50, 80, 50]} turbidity={4} rayleigh={1.5} />
      <Environment files="/hdri/stadium_01_1k.hdr" />
    </>
  );
};

export default Skybox;
