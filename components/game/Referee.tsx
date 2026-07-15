import { forwardRef } from "react";
import { RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { REFEREE_START_POSITION } from "./pitchDimensions";

const Referee = forwardRef<RapierRigidBody>((_props, ref) => {
  return (
    <RigidBody ref={ref} position={REFEREE_START_POSITION} colliders="hull">
      <mesh castShadow receiveShadow>
        <capsuleGeometry args={[0.35, 1.2, 4, 8]} />
        <meshStandardMaterial color="#212121" />
      </mesh>
    </RigidBody>
  );
});

Referee.displayName = "Referee";

export default Referee;
