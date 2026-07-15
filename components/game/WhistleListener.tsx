import { useEffect } from "react";
import { useKeyboardControls } from "@react-three/drei";
import { Controls } from "../../entities/Referee/controls";
import { gameStateStore } from "../../engine/match/gameState";
import { blowWhistle } from "../../engine/referee/whistle";

// Space pressed -> if an incident is awaiting review, open the decision
// window. Lives inside the Canvas purely to reach useKeyboardControls;
// everything it actually does goes through the engine's whistle module.
// Reads gameStateStore.getState() directly (not the useGameStore hook) since
// this is an imperative callback, not a render — same access pattern the
// engine itself uses.
const WhistleListener = () => {
  const subscribeControls = useKeyboardControls<Controls>()[0];

  useEffect(() => {
    return subscribeControls(
      (state) => state.whistle,
      (pressed) => {
        if (!pressed) return;
        blowWhistle(gameStateStore.getState().time);
      },
    );
  }, [subscribeControls]);

  return null;
};

export default WhistleListener;
