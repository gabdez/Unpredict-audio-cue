import type { IntervalConfig, Routine } from './types';

export type Rng = () => number;

export type PhaseKind = 'prep' | 'work' | 'rest';

export interface Phase {
  kind: PhaseKind;
  /** 1-based round number (prep uses round 1). */
  round: number;
  /** Seconds; Infinity for an open-ended work round. */
  duration: number;
}

/** Expand a routine into the ordered list of phases a session runs through. */
export function buildPhases(routine: Routine): Phase[] {
  const phases: Phase[] = [];
  if (routine.prepSeconds > 0) {
    phases.push({ kind: 'prep', round: 1, duration: routine.prepSeconds });
  }
  if (routine.workSeconds === null) {
    phases.push({ kind: 'work', round: 1, duration: Infinity });
    return phases;
  }
  const rounds = Math.max(1, Math.floor(routine.rounds));
  for (let r = 1; r <= rounds; r++) {
    phases.push({ kind: 'work', round: r, duration: routine.workSeconds });
    if (r < rounds && routine.restSeconds > 0) {
      phases.push({ kind: 'rest', round: r, duration: routine.restSeconds });
    }
  }
  return phases;
}

/** Total session length in seconds (Infinity when open-ended). */
export function totalDuration(routine: Routine): number {
  return buildPhases(routine).reduce((sum, p) => sum + p.duration, 0);
}

/** Seconds until the next cue. */
export function nextInterval(interval: IntervalConfig, rng: Rng = Math.random): number {
  if (interval.mode === 'fixed') return Math.max(0.3, interval.seconds);
  const lo = Math.max(0.3, Math.min(interval.min, interval.max));
  const hi = Math.max(lo, Math.max(interval.min, interval.max));
  return lo + rng() * (hi - lo);
}

/**
 * Pick the next cue id.
 * - sequence: cycles through the routine's cues in order.
 * - random: weighted pick, never exceeding `maxRepeat` identical calls in a row
 *   (when another cue is available).
 */
export function pickCue(routine: Routine, history: string[], rng: Rng = Math.random): string | null {
  const entries = routine.cues.filter((c) => c.weight > 0);
  if (entries.length === 0) return null;

  if (routine.order === 'sequence') {
    return entries[history.length % entries.length].cueId;
  }

  let candidates = entries;
  if (routine.maxRepeat > 0 && history.length >= routine.maxRepeat) {
    const tail = history.slice(-routine.maxRepeat);
    if (tail.every((id) => id === tail[0])) {
      const filtered = entries.filter((c) => c.cueId !== tail[0]);
      if (filtered.length > 0) candidates = filtered;
    }
  }

  const total = candidates.reduce((s, c) => s + c.weight, 0);
  let roll = rng() * total;
  for (const c of candidates) {
    roll -= c.weight;
    if (roll < 0) return c.cueId;
  }
  return candidates[candidates.length - 1].cueId;
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return '∞';
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}
