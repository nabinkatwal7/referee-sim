import type { RapierRigidBody } from "@react-three/rapier";
import Ball from "../../entities/Ball";
import Passing from "../../entities/Passing";
import Referee from "../../entities/Referee";
import Goals from "./Goals";
import Ground from "./Ground";
import Lines from "./Lines";
import Pitch from "./Pitch";
import Players from "./Players";
import Roof from "./Roof";
import Seats from "./Seats";

type Props = {
  refereeRef: React.RefObject<RapierRigidBody | null>;
  ballRef: React.RefObject<RapierRigidBody | null>;
  playersRef: React.RefObject<(RapierRigidBody | null)[]>;
};

const Scene = ({ refereeRef, ballRef, playersRef }: Props) => {
  return (
    <>
      <Ground />
      <Pitch />
      <Lines />
      <Goals />
      <Seats />
      <Roof />
      <Players playersRef={playersRef} />
      <Ball ref={ballRef} />
      <Referee ref={refereeRef} />
      <Passing ballRef={ballRef} playersRef={playersRef} />
    </>
  );
};

export default Scene;
