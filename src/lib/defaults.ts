import type { Cue, Routine, Settings } from './types';

const voice = (id: string, name: string, symbol: string, color: string): Cue => ({
  id,
  name,
  symbol,
  color,
  sound: { type: 'voice', text: name },
});

export const DEFAULT_CUES: Cue[] = [
  voice('left', 'Left', '←', '#3b9cff'),
  voice('right', 'Right', '→', '#ff4d5e'),
  voice('up', 'Up', '↑', '#2ecc71'),
  voice('back', 'Back', '↓', '#f5b700'),
  voice('jump', 'Jump', '⤒', '#a66bff'),
  voice('sprint', 'Sprint', '»', '#ff7a1a'),
  voice('stop', 'Stop', '■', '#e0e0e0'),
  { id: 'beep', name: 'Beep', symbol: '●', color: '#00d1c1', sound: { type: 'beep', frequency: 880, count: 1 } },
];

const routine = (r: Omit<Routine, 'updatedAt'>): Routine => ({ ...r, updatedAt: 0 });

export const DEFAULT_ROUTINES: Routine[] = [
  routine({
    id: 'preset-left-right',
    name: 'Left / Right — every 5s',
    cues: [
      { cueId: 'left', weight: 1 },
      { cueId: 'right', weight: 1 },
    ],
    order: 'random',
    interval: { mode: 'fixed', seconds: 5 },
    maxRepeat: 3,
    rounds: 3,
    workSeconds: 60,
    restSeconds: 30,
    prepSeconds: 5,
    countdownBeeps: true,
    showCue: true,
  }),
  routine({
    id: 'preset-4-way',
    name: '4-way reaction — random 1.5–3s',
    cues: [
      { cueId: 'left', weight: 1 },
      { cueId: 'right', weight: 1 },
      { cueId: 'up', weight: 1 },
      { cueId: 'back', weight: 1 },
    ],
    order: 'random',
    interval: { mode: 'random', min: 1.5, max: 3 },
    maxRepeat: 2,
    rounds: 5,
    workSeconds: 30,
    restSeconds: 20,
    prepSeconds: 5,
    countdownBeeps: true,
    showCue: true,
  }),
  routine({
    id: 'preset-football-break',
    name: 'Break on the call — every 2s',
    cues: [
      { cueId: 'left', weight: 1 },
      { cueId: 'right', weight: 1 },
      { cueId: 'sprint', weight: 1 },
    ],
    order: 'random',
    interval: { mode: 'fixed', seconds: 2 },
    maxRepeat: 2,
    rounds: 6,
    workSeconds: 20,
    restSeconds: 40,
    prepSeconds: 5,
    countdownBeeps: true,
    showCue: true,
  }),
];

export const DEFAULT_SETTINGS: Settings = {
  voiceURI: null,
  speechRate: 1.1,
  volume: 1,
  keepScreenOn: true,
};

export const CUE_COLORS = [
  '#3b9cff', '#ff4d5e', '#2ecc71', '#f5b700', '#a66bff', '#ff7a1a', '#00d1c1', '#ff5fb8', '#e0e0e0',
];

export function newRoutine(): Routine {
  return {
    id: uid(),
    name: 'New routine',
    cues: [
      { cueId: 'left', weight: 1 },
      { cueId: 'right', weight: 1 },
    ],
    order: 'random',
    interval: { mode: 'fixed', seconds: 3 },
    maxRepeat: 3,
    rounds: 3,
    workSeconds: 45,
    restSeconds: 30,
    prepSeconds: 5,
    countdownBeeps: true,
    showCue: true,
    updatedAt: Date.now(),
  };
}

export function uid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}
