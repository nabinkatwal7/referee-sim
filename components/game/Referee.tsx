import { RigidBody } from "@react-three/rapier";

const Referee = () => {
  return (
    <RigidBody position={[0, 1, 3]} colliders="hull">
      <mesh castShadow>
        <capsuleGeometry args={[0.35, 1.2, 4, 8]} />
        <meshStandardMaterial color="#212121" />
      </mesh>
    </RigidBody>
  );
};

export default Referee;
