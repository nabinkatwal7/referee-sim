import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { RapierRigidBody } from "@react-three/rapier";
import { MathUtils } from "three";

const PICKUP_RADIUS = 6; // generous — players wander independently, not toward the ball
const SETTLE_SPEED = 1.5; // ball must be slower than this to be "received"
const MIN_HOLD = 1.2; // seconds a possessor waits before kicking
const MAX_HOLD = 2.5;
const MIN_KICK_SPEED = 6;
const MAX_KICK_SPEED = 14;

type Props = {
  ballRef: React.RefObject<RapierRigidBody | null>;
  playersRef: React.RefObject<(RapierRigidBody | null)[]>;
};

const randomHold = () => MIN_HOLD + Math.random() * (MAX_HOLD - MIN_HOLD);

// Player A -> kick ball -> ball rolls -> Player B receives -> repeat forever.
// Deliberately dumb: "possession" is just whichever player is nearest once
// the ball is slow, and a kick just aims at wherever the receiver is right
// now — no leading a moving target, no tactics.
const Passing = ({ ballRef, playersRef }: Props) => {
  const possessor = useRef<number | null>(null);
  const holdTimer = useRef(0);

  useFrame((_state, delta) => {
    const ball = ballRef.current;
    const players = playersRef.current;
    if (!ball || players.length === 0) return;

    const ballPos = ball.translation();
    const ballVel = ball.linvel();
    const ballSpeed = Math.hypot(ballVel.x, ballVel.z);

    if (possessor.current === null) {
      if (ballSpeed >= SETTLE_SPEED) return;

      let nearest: number | null = null;
      let nearestDist = PICKUP_RADIUS;
      players.forEach((player, i) => {
        if (!player) return;
        const p = player.translation();
        const dist = Math.hypot(p.x - ballPos.x, p.z - ballPos.z);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = i;
        }
      });

      if (nearest !== null) {
        possessor.current = nearest;
        holdTimer.current = randomHold();
      }
      return;
    }

    holdTimer.current -= delta;
    if (holdTimer.current > 0) return;

    const candidates = players
      .map((player, i) => (player && i !== possessor.current ? i : null))
      .filter((i): i is number => i !== null);
    if (candidates.length === 0) return;

    const receiverIndex = candidates[Math.floor(Math.random() * candidates.length)];
    const receiver = players[receiverIndex];
    if (!receiver) return;

    const receiverPos = receiver.translation();
    const dx = receiverPos.x - ballPos.x;
    const dz = receiverPos.z - ballPos.z;
    const distance = Math.hypot(dx, dz) || 1;
    const speed = MathUtils.clamp(distance * 0.5, MIN_KICK_SPEED, MAX_KICK_SPEED);

    ball.setLinvel({ x: (dx / distance) * speed, y: 2, z: (dz / distance) * speed }, true);

    possessor.current = null;
  });

  return null;
};

export default Passing;
