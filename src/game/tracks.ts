export type TrackId = 'sprint' | 'street' | 'circuit' | 'endurance';

export interface Track {
  id: TrackId;
  name: string;
  size: number;
}

export const TRACKS: readonly Track[] = [
  { id: 'sprint', name: 'Sprint', size: 3 },
  { id: 'street', name: 'Street', size: 4 },
  { id: 'circuit', name: 'Circuit', size: 5 },
  { id: 'endurance', name: 'Endurance', size: 7 },
];

export function getTrack(id: string): Track | undefined {
  return TRACKS.find((track) => track.id === id);
}
