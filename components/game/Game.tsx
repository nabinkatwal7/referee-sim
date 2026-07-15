import { useRef } from "react";
import { KeyboardControls, PerspectiveCamera } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { GameLoop } from "../../engine/match/GameLoop";
import GameLoopRunner from "../../engine/match/GameLoopRunner";
import { useGameStore } from "../../engine/match/gameState";
import { REFEREE_KEYBOARD_MAP } from "../../entities/Referee/controls";
import HUD from "./HUD";
import Scene from "./Scene";
import Skybox from "./Skybox";
import ThirdPersonCamera from "./ThirdPersonCamera";
import { REFEREE_START_POSITION } from "./pitchDimensions";

const Game = () => {
  const gameLoopRef = useRef<GameLoop | null>(null);
  if (!gameLoopRef.current) gameLoopRef.current = new GameLoop();
  const gameLoop = gameLoopRef.current;
  const paused = useGameStore((state) => state.paused);

  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <KeyboardControls map={REFEREE_KEYBOARD_MAP}>
        <Canvas shadows>
          <PerspectiveCamera
            makeDefault
            position={[
              REFEREE_START_POSITION[0],
              REFEREE_START_POSITION[1] + 8,
              REFEREE_START_POSITION[2] + 16,
            ]}
            fov={50}
            far={20000}
          />
          <ThirdPersonCamera gameLoop={gameLoop} />
          <ambientLight intensity={0.5} />
          <directionalLight
            position={[80, 140, 80]}
            intensity={1.4}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-camera-left={-260}
            shadow-camera-right={260}
            shadow-camera-top={260}
            shadow-camera-bottom={-260}
            shadow-camera-far={600}
          />
          <Skybox />
          <Physics paused={paused}>
            <Scene gameLoop={gameLoop} />
          </Physics>
          <GameLoopRunner gameLoop={gameLoop} />
        </Canvas>
        <HUD />
      </KeyboardControls>
    </div>
  );
};

export default Game;
