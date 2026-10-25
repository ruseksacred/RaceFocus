import {
  getTrack,
  lapTimesFromCrossings,
  ratingDelta,
  START_RATING,
  type RatedResult,
  type Standing,
} from '@/game';
import type { RaceRecord } from '@/store/career';

import { driversOf, type Room } from './rooms';

/**
 * This driver's record of a room race, with the Elo change.
 * `retiredSelf` marks the driver as retired (they left before the finish).
 */
export function buildRaceRecord(
  code: string,
  room: Room,
  uid: string,
  standings: readonly Standing[],
  retiredSelf = false,
): RaceRecord {
  const track = getTrack(room.rules.track)!;
  const numbersPerLap = track.size * track.size;
  const players = room.players ?? {};
  const field: RatedResult[] = standings.map((s) => ({
    id: s.id,
    rating: players[s.id]?.rating ?? START_RATING,
    position: s.position,
    retired: s.retired || (retiredSelf && s.id === uid),
  }));
  const me = field.find((f) => f.id === uid)!;
  const mine = standings.find((s) => s.id === uid)!;
  const crossings = driversOf(room).find((d) => d.id === uid)?.crossings ?? [];
  const laps = lapTimesFromCrossings(crossings, numbersPerLap);
  const finished = mine.finished && !me.retired;

  return {
    id: `${code}:${room.startAt ?? 0}`,
    roomCode: code,
    track: room.rules.track,
    mode: room.rules.mode,
    laps: room.rules.lengthKind === 'time' ? Math.floor(mine.cleared / numbersPerLap) : room.rules.laps,
    drivers: standings.length,
    position: finished ? mine.position : null,
    totalMs: finished ? mine.totalMs : null,
    bestLapMs: laps.length ? Math.min(...laps) : null,
    mistakes: mine.mistakes,
    ratingBefore: me.rating,
    ratingDelta: ratingDelta(me, field),
    finishedAt: Date.now(),
  };
}
