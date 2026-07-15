import { useEffect } from "react";
import { useKeyboardControls } from "@react-three/drei";
import { Controls } from "../../entities/Referee/controls";
import type { GameLoop } from "../../engine/match/GameLoop";

type Props = {
  gameLoop: GameLoop;
};

// R pressed -> instant-replay the last 15 seconds. Lives inside the Canvas
// purely to reach useKeyboardControls; the actual replay logic is entirely
// in GameLoop/replay.ts.
const ReplayListener = ({ gameLoop }: Props) => {
  const subscribeControls = useKeyboardControls<Controls>()[0];

  useEffect(() => {
    return subscribeControls(
      (state) => state.replay,
      (pressed) => {
        if (!pressed) return;
        gameLoop.startReplay();
      },
    );
  }, [subscribeControls, gameLoop]);

  return null;
};

export default ReplayListener;
