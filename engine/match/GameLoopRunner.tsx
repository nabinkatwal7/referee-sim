import { useFrame } from "@react-three/fiber";
import type { GameLoop } from "./GameLoop";

type Props = {
  gameLoop: GameLoop;
};

// The one place react-three-fiber's render loop touches the engine.
const GameLoopRunner = ({ gameLoop }: Props) => {
  useFrame((_state, delta) => {
    gameLoop.tick(delta);
  });

  return null;
};

export default GameLoopRunner;
