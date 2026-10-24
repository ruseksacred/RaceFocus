import { describe, expect, it } from 'vitest';

import { computeStandings, lapTimesFromCrossings, type DriverProgress } from './standings';

// 3 numbers per lap, 2 laps: 6 crossings to finish.
const driver = (id: string, crossings: number[], extra: Partial<DriverProgress> = {}): DriverProgress => ({
  id,
  name: id,
  crossings,
  mistakes: 0,
  ...extra,
});

describe('computeStandings', () => {
  it('orders by progress, then by who got there first', () => {
    const standings = computeStandings(
      [driver('b', [100, 200]), driver('a', [90, 210, 330]), driver('c', [80, 190])],
      3,
      2,
    );
    expect(standings.map((s) => s.id)).toEqual(['a', 'c', 'b']);
    expect(standings.map((s) => s.position)).toEqual([1, 2, 3]);
  });

  it('measures gaps at the same point of the race', () => {
    const [p1, p2, p3] = computeStandings(
      [driver('a', [100, 200, 300]), driver('b', [150, 260]), driver('c', [170, 300])],
      3,
      2,
    );
    expect(p1.gapToLeader).toBeNull();
    expect(p2.id).toBe('b');
    expect(p2.gapToLeader).toBe(60); // 260 - 200 at number 2
    expect(p3.gapToLeader).toBe(100); // 300 - 200
    expect(p3.gapToAhead).toBe(40); // 300 - 260
  });

  it('grows the gap while a driver is stuck', () => {
    const [, p2] = computeStandings([driver('a', [100, 200, 300]), driver('b', [150, 260])], 3, 2, 500);
    // At number 3 the leader was at 300; at race time 500 b is at least 200 behind.
    expect(p2.gapToLeader).toBe(200);
  });

  it('reports laps and finishers', () => {
    const [p1, p2] = computeStandings(
      [driver('a', [1, 2, 3, 4, 5, 6]), driver('b', [2, 3, 4, 5])],
      3,
      2,
    );
    expect(p1).toMatchObject({ finished: true, totalMs: 6, lap: 2, cleared: 6 });
    expect(p2).toMatchObject({ finished: false, totalMs: null, lap: 2, cleared: 4 });
  });

  it('puts retired drivers last', () => {
    const standings = computeStandings([driver('a', [1, 2, 3], { retired: true }), driver('b', [5])], 3, 2);
    expect(standings.map((s) => s.id)).toEqual(['b', 'a']);
    expect(standings[1].gapToLeader).toBeNull();
  });

  it('handles drivers who have not started', () => {
    const standings = computeStandings([driver('b', []), driver('a', [])], 3, 2);
    expect(standings.map((s) => s.id)).toEqual(['a', 'b']);
    expect(standings[1].gapToLeader).toBeNull();
  });
});

describe('lapTimesFromCrossings', () => {
  it('splits a race into lap times', () => {
    expect(lapTimesFromCrossings([100, 200, 300, 450, 520, 700], 3)).toEqual([300, 400]);
    expect(lapTimesFromCrossings([100, 200, 300, 450], 3)).toEqual([300]);
  });
});
