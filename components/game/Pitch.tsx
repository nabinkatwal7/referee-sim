import { RigidBody } from "@react-three/rapier";
import { worldCollisionGroups } from "../../entities/collisionGroups";
import { PITCH_WIDTH, PITCH_LENGTH } from "./pitchDimensions";

const Pitch = () => {
  return (
    <RigidBody
      type="fixed"
      colliders="cuboid"
      collisionGroups={worldCollisionGroups}
      solverGroups={worldCollisionGroups}
    >
      <mesh receiveShadow position={[0, -0.5, 0]}>
        <boxGeometry args={[PITCH_WIDTH, 1, PITCH_LENGTH]} />
        <meshStandardMaterial color="#2e7d32" />
      </mesh>
    </RigidBody>
  );
};

export default Pitch;
