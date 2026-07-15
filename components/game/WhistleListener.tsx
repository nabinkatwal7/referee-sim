import { useEffect } from "react";
import { useKeyboardControls } from "@react-three/drei";
import { Controls } from "../../entities/Referee/controls";
import type { GameLoop } from "../../engine/match/GameLoop";
import { gameStateStore } from "../../engine/match/gameState";
import { blowWhistle } from "../../engine/referee/whistle";

type Props = {
  gameLoop: GameLoop;
};

// Space pressed -> if an incident is awaiting review, open the decision
// window. Lives inside the Canvas purely to reach useKeyboardControls;
// everything it actually does goes through the engine's whistle module.
// Reads gameStateStore.getState() directly (not the useGameStore hook) since
// this is an imperative callback, not a render — same access pattern the
// engine itself uses.
const WhistleListener = ({ gameLoop }: Props) => {
  const subscribeControls = useKeyboardControls<Controls>()[0];

  useEffect(() => {
    return subscribeControls(
      (state) => state.whistle,
      (pressed) => {
        if (!pressed) return;
        blowWhistle(gameStateStore.getState().time, gameLoop.getMatchState());
      },
    );
  }, [subscribeControls, gameLoop]);

  return null;
};

export default WhistleListener;
