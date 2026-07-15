import { RigidBody } from "@react-three/rapier";

// Regulation ball: ~70cm circumference -> ~0.11m radius.
const BALL_RADIUS = 0.11;

const Ball = () => {
  return (
    <RigidBody position={[0, 2, 0]} colliders="ball" restitution={0.6}>
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[BALL_RADIUS, 32, 32]} />
        <meshStandardMaterial color="#f5f5f5" />
      </mesh>
    </RigidBody>
  );
};

export default Ball;
