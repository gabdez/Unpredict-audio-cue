export type CueSound =
  | { type: 'voice'; text: string }
  | { type: 'recording'; audioId: string; mime: string }
  | { type: 'beep'; frequency: number; count: number };

export interface Cue {
  id: string;
  name: string;
  /** Short symbol shown on screen (arrow, emoji, letter…). */
  symbol: string;
  color: string;
  sound: CueSound;
}

export interface RoutineCue {
  cueId: string;
  /** Relative probability when the routine picks cues randomly. */
  weight: number;
}

export type IntervalConfig =
  | { mode: 'fixed'; seconds: number }
  | { mode: 'random'; min: number; max: number };

export interface Routine {
  id: string;
  name: string;
  cues: RoutineCue[];
  order: 'random' | 'sequence';
  interval: IntervalConfig;
  /** Max times the same cue can be called back-to-back (0 = no limit). Random order only. */
  maxRepeat: number;
  rounds: number;
  /** Length of each work round in seconds; null = runs until stopped. */
  workSeconds: number | null;
  restSeconds: number;
  /** Get-ready countdown before the first round. */
  prepSeconds: number;
  /** Beep on the last 3 seconds of prep / rest. */
  countdownBeeps: boolean;
  /** Show the cue name/symbol on screen (turn off for audio-only reaction work). */
  showCue: boolean;
  updatedAt: number;
}

export interface Settings {
  voiceURI: string | null;
  speechRate: number;
  volume: number;
  keepScreenOn: boolean;
}
