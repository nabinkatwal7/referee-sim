import { RigidBody } from "@react-three/rapier";

const PLAYER_POSITIONS: [number, number, number][] = [
  [-10, 1, 0],
  [-5, 1, 8],
  [-5, 1, -8],
  [5, 1, 8],
  [5, 1, -8],
  [10, 1, 0],
];

const Players = () => {
  return (
    <>
      {PLAYER_POSITIONS.map((position, i) => (
        <RigidBody key={i} position={position} colliders="hull">
          <mesh castShadow receiveShadow>
            <capsuleGeometry args={[0.4, 1.2, 4, 8]} />
            <meshStandardMaterial color="#1976d2" />
          </mesh>
        </RigidBody>
      ))}
    </>
  );
};

export default Players;
