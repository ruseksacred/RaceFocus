import { get, onDisconnect, onValue, ref, remove, runTransaction, set, update } from 'firebase/database';

import { generateRoomCode, MIN_PLAYERS, randomSeed, type DriverProgress, type RoomRules } from '@/game';

import { firebase, serverNow, signIn } from './firebase';

export type RoomStatus = 'lobby' | 'racing' | 'finished';

export interface RoomPlayer {
  name: string;
  joinedAt: number;
  mistakes?: number;
  retired?: boolean;
  /** Race time at each cleared number. Firebase may return an array or an object keyed by index. */
  crossings?: number[] | Record<string, number>;
}

export interface Room {
  hostId: string;
  createdAt: number;
  rules: RoomRules;
  status: RoomStatus;
  seed?: string;
  /** Server time of lights out. */
  startAt?: number;
  players?: Record<string, RoomPlayer>;
}

/** Lights take ~2.6 s; this leaves everyone a moment to look at the screen first. */
export const START_DELAY_MS = 5000;

const roomRef = (code: string) => ref(firebase().db, `rooms/${code}`);
const playerRef = (code: string, uid: string) => ref(firebase().db, `rooms/${code}/players/${uid}`);

export class RoomError extends Error {}

const SERVER_TIMEOUT_MS = 12000;

/** The database SDK waits forever while offline; give up with a clear message instead. */
function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(
      () => reject(new RoomError('No connection to the race server. Check your internet and try again.')),
      SERVER_TIMEOUT_MS,
    );
    promise.then(
      (value) => {
        clearTimeout(id);
        resolve(value);
      },
      (error) => {
        clearTimeout(id);
        reject(error);
      },
    );
  });
}

export function createRoom(nick: string, rules: RoomRules): Promise<string> {
  return withTimeout(createRoomNow(nick, rules));
}

async function createRoomNow(nick: string, rules: RoomRules): Promise<string> {
  const uid = await signIn();
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode();
    const room: Room = {
      hostId: uid,
      createdAt: serverNow(),
      rules,
      status: 'lobby',
      players: { [uid]: { name: nick, joinedAt: serverNow(), mistakes: 0 } },
    };
    const result = await runTransaction(roomRef(code), (current) => (current === null ? room : undefined));
    if (result.committed) {
      onDisconnect(roomRef(code)).remove();
      return code;
    }
  }
  throw new RoomError('Could not create a room. Try again.');
}

export function joinRoom(code: string, nick: string): Promise<void> {
  return withTimeout(joinRoomNow(code, nick));
}

async function joinRoomNow(code: string, nick: string): Promise<void> {
  const uid = await signIn();
  const snap = await get(roomRef(code));
  const room = snap.val() as Room | null;
  if (!room) throw new RoomError(`No room with code ${code}.`);
  const players = room.players ?? {};
  if (players[uid]) return;
  if (room.status !== 'lobby') throw new RoomError('This race has already started.');
  if (Object.keys(players).length >= room.rules.maxPlayers) throw new RoomError('This room is full.');
  await set(playerRef(code, uid), { name: nick, joinedAt: serverNow(), mistakes: 0 });
  onDisconnect(playerRef(code, uid)).remove();
}

export function watchRoom(code: string, onChange: (room: Room | null) => void): () => void {
  return onValue(roomRef(code), (snap) => onChange(snap.val() as Room | null));
}

/** Host only. Everyone gets the same seed and counts down to the same server time. */
export async function startRace(code: string, room: Room): Promise<void> {
  const players = Object.keys(room.players ?? {});
  if (players.length < MIN_PLAYERS) throw new RoomError(`At least ${MIN_PLAYERS} drivers are needed.`);
  const resets: Record<string, unknown> = {};
  for (const uid of players) {
    resets[`players/${uid}/crossings`] = null;
    resets[`players/${uid}/mistakes`] = 0;
    resets[`players/${uid}/retired`] = null;
  }
  // From here on a lost host connection must not delete the room mid-race.
  await onDisconnect(roomRef(code)).cancel();
  await update(roomRef(code), {
    ...resets,
    status: 'racing',
    seed: randomSeed(),
    startAt: serverNow() + START_DELAY_MS,
  });
}

/** Once racing, a lost connection marks the driver as retired instead of removing them. */
export async function armRetireOnDisconnect(code: string, uid: string): Promise<void> {
  const disconnect = onDisconnect(playerRef(code, uid));
  await disconnect.cancel();
  await disconnect.update({ retired: true });
}

export function reportCrossing(code: string, uid: string, index: number, raceMs: number): Promise<void> {
  return set(ref(firebase().db, `rooms/${code}/players/${uid}/crossings/${index}`), Math.round(raceMs));
}

export function reportMistakes(code: string, uid: string, mistakes: number): Promise<void> {
  return set(ref(firebase().db, `rooms/${code}/players/${uid}/mistakes`), mistakes);
}

/** Host only. */
export function markFinished(code: string): Promise<void> {
  return update(roomRef(code), { status: 'finished' });
}

/** Host only: back to the lobby for another race; drivers who left are dropped. */
export async function backToLobby(code: string, room: Room): Promise<void> {
  const changes: Record<string, unknown> = { status: 'lobby', startAt: null, seed: null };
  for (const [uid, player] of Object.entries(room.players ?? {})) {
    if (player.retired) changes[`players/${uid}`] = null;
  }
  await update(roomRef(code), changes);
}

export async function leaveRoom(code: string, uid: string, room: Room | null): Promise<void> {
  if (room?.hostId === uid && room.status === 'lobby') {
    await onDisconnect(roomRef(code)).cancel();
    await remove(roomRef(code));
    return;
  }
  if (room?.status === 'racing') await update(playerRef(code, uid), { retired: true });
  else await remove(playerRef(code, uid));
}

export function crossingsOf(player: RoomPlayer): number[] {
  const raw = player.crossings;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((v) => typeof v === 'number');
  return Object.keys(raw)
    .map(Number)
    .sort((a, b) => a - b)
    .map((k) => raw[String(k)]);
}

export function driversOf(room: Room): DriverProgress[] {
  return Object.entries(room.players ?? {}).map(([id, p]) => ({
    id,
    name: p.name,
    crossings: crossingsOf(p),
    mistakes: p.mistakes ?? 0,
    retired: p.retired,
  }));
}
