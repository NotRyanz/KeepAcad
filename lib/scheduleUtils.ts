import { ClassSession } from './types';

export type LanedSession = {
  session: ClassSession;
  lane: number;
};

// Greedy interval-partitioning: assigns each session to the first lane whose
// previous occupant has already ended, so overlapping classes never collide
// visually. Returns the laned sessions plus the total number of lanes used.
export function assignLanes(sessions: ClassSession[]): { laned: LanedSession[]; laneCount: number } {
  const sorted = [...sessions].sort((a, b) => a.startMinute - b.startMinute);
  const laneEnds: number[] = [];
  const laned: LanedSession[] = [];

  for (const session of sorted) {
    let placed = false;
    for (let lane = 0; lane < laneEnds.length; lane++) {
      if (laneEnds[lane] <= session.startMinute) {
        laneEnds[lane] = session.endMinute;
        laned.push({ session, lane });
        placed = true;
        break;
      }
    }
    if (!placed) {
      laneEnds.push(session.endMinute);
      laned.push({ session, lane: laneEnds.length - 1 });
    }
  }

  return { laned, laneCount: Math.max(1, laneEnds.length) };
}
