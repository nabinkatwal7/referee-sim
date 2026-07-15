import { useEffect } from "react";
import { useKeyboardControls } from "@react-three/drei";
import { Controls } from "../../entities/Referee/controls";
import { useGameStore } from "../../engine/match/gameState";
import { blowWhistle } from "../../engine/referee/whistle";

// Space pressed -> if an incident is awaiting review, open the decision
// window. Lives inside the Canvas purely to reach useKeyboardControls;
// everything it actually does goes through the engine's whistle module.
const WhistleListener = () => {
  const subscribeControls = useKeyboardControls<Controls>()[0];

  useEffect(() => {
    return subscribeControls(
      (state) => state.whistle,
      (pressed) => {
        if (!pressed) return;
        blowWhistle(useGameStore.getState().time);
      },
    );
  }, [subscribeControls]);

  return null;
};

export default WhistleListener;
