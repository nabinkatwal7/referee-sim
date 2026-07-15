import { RigidBody } from "@react-three/rapier";

const Stadium = () => {
  return (
    <RigidBody type="fixed" colliders="cuboid">
      <mesh receiveShadow position={[0, -0.5, 0]}>
        <boxGeometry args={[68, 1, 105]} />
        <meshStandardMaterial color="#2e7d32" />
      </mesh>
    </RigidBody>
  );
};

export default Stadium;
