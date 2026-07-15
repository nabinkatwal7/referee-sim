import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import HUD from "./HUD";
import Scene from "./Scene";
import Skybox from "./Skybox";

const Game = () => {
  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 45, 90]} fov={50} />
        <OrbitControls makeDefault target={[0, 0, 0]} maxPolarAngle={Math.PI / 2 - 0.05} minDistance={5} maxDistance={300} />
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[50, 80, 50]}
          intensity={1.4}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-160}
          shadow-camera-right={160}
          shadow-camera-top={160}
          shadow-camera-bottom={-160}
          shadow-camera-far={300}
        />
        <Skybox />
        <Physics>
          <Scene />
        </Physics>
      </Canvas>
      <HUD />
    </div>
  );
};

export default Game;
