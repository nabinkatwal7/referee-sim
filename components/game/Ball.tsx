import { RigidBody } from "@react-three/rapier";

const Ball = () => {
  return (
    <RigidBody position={[0, 2, 0]} colliders="ball" restitution={0.6}>
      <mesh castShadow>
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshStandardMaterial color="#f5f5f5" />
      </mesh>
    </RigidBody>
  );
};

export default Ball;
