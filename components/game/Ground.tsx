import { RigidBody } from "@react-three/rapier";
import { PITCH_WIDTH, PITCH_LENGTH, STAND_DEPTH_TOTAL } from "./pitchDimensions";

const MARGIN = 10;

const Ground = () => {
  const width = PITCH_WIDTH + 2 * STAND_DEPTH_TOTAL + MARGIN;
  const length = PITCH_LENGTH + 2 * STAND_DEPTH_TOTAL + MARGIN;

  return (
    <RigidBody type="fixed" colliders="cuboid">
      <mesh receiveShadow position={[0, -0.07, 0]}>
        <boxGeometry args={[width, 0.1, length]} />
        <meshStandardMaterial color="#9e9e9e" />
      </mesh>
    </RigidBody>
  );
};

export default Ground;
