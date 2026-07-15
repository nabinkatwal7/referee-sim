import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import Lights from "./Lights";
import Stadium from "./Stadium";
import Players from "./Players";
import Ball from "./Ball";
import Referee from "./Referee";
import HUD from "./HUD";

const Game = () => {
  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      <Canvas shadows camera={{ position: [0, 15, 25], fov: 50 }}>
        <Lights />
        <Physics>
          <Stadium />
          <Players />
          <Ball />
          <Referee />
        </Physics>
      </Canvas>
      <HUD />
    </div>
  );
};

export default Game;
