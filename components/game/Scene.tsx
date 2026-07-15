import type { RapierRigidBody } from "@react-three/rapier";
import Ball from "./Ball";
import Goals from "./Goals";
import Ground from "./Ground";
import Lines from "./Lines";
import Pitch from "./Pitch";
import Players from "./Players";
import Referee from "./Referee";
import Roof from "./Roof";
import Seats from "./Seats";

type Props = {
  refereeRef: React.RefObject<RapierRigidBody | null>;
};

const Scene = ({ refereeRef }: Props) => {
  return (
    <>
      <Ground />
      <Pitch />
      <Lines />
      <Goals />
      <Seats />
      <Roof />
      <Players />
      <Ball />
      <Referee ref={refereeRef} />
    </>
  );
};

export default Scene;
