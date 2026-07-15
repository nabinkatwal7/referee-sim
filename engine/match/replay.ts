import type { RigidBody as RapierRigidBody } from "@dimforge/rapier3d-compat";
import type { PlayerFSMState } from "../../entities/Player/ai";

export type PlayerFrame = {
  position: [number, number, number];
  velocity: [number, number, number];
  fsmState: PlayerFSMState; // the closest thing we have to "animation" state
};

export type BallFrame = {
  position: [number, number, number];
  velocity: [number, number, number];
};

export type FrameSnapshot = {
  t: number; // match clock at capture time, seconds
  players: (PlayerFrame | null)[];
  ball: BallFrame | null;
};

const RETENTION_SECONDS = 15;

// Rolling window of the last 15 seconds, one snapshot per frame. Pure
// engine, no React — positions/velocities/animation-state live here, never
// in the Zustand game-state store.
export class ReplayBuffer {
  private frames: FrameSnapshot[] = [];

  record(frame: FrameSnapshot) {
    this.frames.push(frame);
    const cutoff = frame.t - RETENTION_SECONDS;
    while (this.frames.length > 1 && this.frames[0].t < cutoff) {
      this.frames.shift();
    }
  }

  snapshotFrames(): FrameSnapshot[] {
    return [...this.frames];
  }

  get isEmpty(): boolean {
    return this.frames.length === 0;
  }
}

type RestoreTarget = {
  body: RapierRigidBody;
  ai: { fsmState: PlayerFSMState };
};

// Replay by restoring snapshots: push a recorded frame's position, velocity,
// and animation state directly onto the live rigid bodies. The referee is
// deliberately NOT part of the snapshot — the camera (which follows the
// referee) stays put, so a replay plays out in front of wherever you're
// currently standing, like a real broadcast replay angle.
export const restoreSnapshot = (
  frame: FrameSnapshot,
  players: (RestoreTarget | null)[],
  ball: RapierRigidBody | null,
) => {
  frame.players.forEach((snap, i) => {
    const player = players[i];
    if (!player || !snap) return;
    player.body.setTranslation({ x: snap.position[0], y: snap.position[1], z: snap.position[2] }, true);
    player.body.setLinvel({ x: snap.velocity[0], y: snap.velocity[1], z: snap.velocity[2] }, true);
    player.ai.fsmState = snap.fsmState;
  });

  if (ball && frame.ball) {
    ball.setTranslation({ x: frame.ball.position[0], y: frame.ball.position[1], z: frame.ball.position[2] }, true);
    ball.setLinvel({ x: frame.ball.velocity[0], y: frame.ball.velocity[1], z: frame.ball.velocity[2] }, true);
  }
};
