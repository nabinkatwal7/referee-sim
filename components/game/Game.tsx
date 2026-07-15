import { useRef } from "react";
import { PerspectiveCamera } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Physics, type RapierRigidBody } from "@react-three/rapier";
import HUD from "./HUD";
import Scene from "./Scene";
import Skybox from "./Skybox";
import ThirdPersonCamera from "./ThirdPersonCamera";
import { REFEREE_START_POSITION } from "./pitchDimensions";

const Game = () => {
  const refereeRef = useRef<RapierRigidBody>(null);

  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <Canvas shadows>
        <PerspectiveCamera
          makeDefault
          position={[
            REFEREE_START_POSITION[0],
            REFEREE_START_POSITION[1] + 8,
            REFEREE_START_POSITION[2] + 16,
          ]}
          fov={50}
        />
        <ThirdPersonCamera target={refereeRef} />
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
          <Scene refereeRef={refereeRef} />
        </Physics>
      </Canvas>
      <HUD />
    </div>
  );
};

export default Game;
