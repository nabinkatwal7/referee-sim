import Ball from "../../entities/Ball";
import Referee from "../../entities/Referee";
import type { GameLoop } from "../../engine/match/GameLoop";
import Goals from "./Goals";
import Ground from "./Ground";
import Lines from "./Lines";
import Pitch from "./Pitch";
import Players from "./Players";
import Roof from "./Roof";
import Seats from "./Seats";

type Props = {
  gameLoop: GameLoop;
};

const Scene = ({ gameLoop }: Props) => {
  return (
    <>
      <Ground />
      <Pitch />
      <Lines />
      <Goals />
      <Seats />
      <Roof />
      <Players gameLoop={gameLoop} />
      <Ball gameLoop={gameLoop} />
      <Referee gameLoop={gameLoop} />
    </>
  );
};

export default Scene;
