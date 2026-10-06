import { audio } from './audio';
import { buildPhases, nextInterval, pickCue, type Phase } from './scheduler';
import type { Cue, Routine } from './types';

export interface SessionSnapshot {
  status: 'running' | 'paused' | 'done';
  phase: Phase;
  phaseIndex: number;
  phaseCount: number;
  phaseRemaining: number;
  elapsed: number;
  cueCount: number;
  currentCue: Cue | null;
  /** Increments on every call so the UI can re-trigger its flash animation. */
  cueSerial: number;
  workRounds: number;
}

const TICK_MS = 40;
/** Don't fire a cue in the last moment of a round — there's no time to react. */
const END_GUARD_S = 0.6;

/**
 * Drives a training session: walks through prep/work/rest phases and fires
 * cues at the routine's interval. Timing is based on absolute timestamps so
 * it does not drift, and pause/resume shifts the whole timeline.
 */
export class SessionRunner {
  private phases: Phase[];
  private phaseIndex = 0;
  private phaseStart = 0;
  private nextCueAt = Infinity;
  private pausedAt: number | null = null;
  private startedAt = 0;
  private pausedTotal = 0;
  private lastBeepSecond = -1;
  private history: string[] = [];
  private currentCue: Cue | null = null;
  private cueSerial = 0;
  private status: SessionSnapshot['status'] = 'running';
  private timer: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<(s: SessionSnapshot) => void>();
  private cueMap: Map<string, Cue>;

  constructor(private routine: Routine, cues: Cue[]) {
    this.phases = buildPhases(routine);
    this.cueMap = new Map(cues.map((c) => [c.id, c]));
  }

  subscribe(fn: (s: SessionSnapshot) => void) {
    this.listeners.add(fn);
    return () => void this.listeners.delete(fn);
  }

  start() {
    this.startedAt = performance.now();
    this.enterPhase(0, this.startedAt);
    this.timer = setInterval(() => this.tick(), TICK_MS);
    this.emit();
  }

  pause() {
    if (this.status !== 'running') return;
    this.pausedAt = performance.now();
    this.status = 'paused';
    audio.stopAll();
    this.emit();
  }

  resume() {
    if (this.status !== 'paused' || this.pausedAt === null) return;
    const shift = performance.now() - this.pausedAt;
    this.phaseStart += shift;
    this.nextCueAt += shift;
    this.pausedTotal += shift;
    this.pausedAt = null;
    this.status = 'running';
    this.emit();
  }

  /** Jump to the next phase (e.g. cut a rest short). */
  skip() {
    if (this.status === 'done') return;
    const now = performance.now();
    if (this.status === 'paused') this.resume();
    this.advance(now);
    this.emit();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    audio.stopAll();
    this.listeners.clear();
  }

  snapshot(): SessionSnapshot {
    const now = this.pausedAt ?? performance.now();
    const phase = this.phases[Math.min(this.phaseIndex, this.phases.length - 1)];
    return {
      status: this.status,
      phase,
      phaseIndex: this.phaseIndex,
      phaseCount: this.phases.length,
      phaseRemaining: this.status === 'done' ? 0 : phase.duration - (now - this.phaseStart) / 1000,
      elapsed: (now - this.startedAt - this.pausedTotal) / 1000,
      cueCount: this.history.length,
      currentCue: this.currentCue,
      cueSerial: this.cueSerial,
      workRounds: this.phases.filter((p) => p.kind === 'work').length,
    };
  }

  private emit() {
    const s = this.snapshot();
    this.listeners.forEach((fn) => fn(s));
  }

  private enterPhase(index: number, at: number) {
    this.phaseIndex = index;
    this.phaseStart = at;
    this.lastBeepSecond = -1;
    const phase = this.phases[index];
    this.currentCue = null;
    if (phase.kind === 'work') {
      audio.beep(1320, 1, 0.35); // "go"
      this.nextCueAt = at + nextInterval(this.routine.interval) * 1000;
    } else {
      this.nextCueAt = Infinity;
      if (phase.kind === 'rest') audio.speak('Rest');
    }
  }

  private advance(now: number) {
    if (this.phaseIndex + 1 >= this.phases.length) {
      this.finish();
      return;
    }
    this.enterPhase(this.phaseIndex + 1, now);
  }

  private finish() {
    this.status = 'done';
    this.currentCue = null;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    audio.beep(1046, 3, 0.15);
    setTimeout(() => audio.speak('Session complete'), 700);
  }

  private tick() {
    if (this.status !== 'running') return;
    const now = performance.now();
    const phase = this.phases[this.phaseIndex];
    const elapsed = (now - this.phaseStart) / 1000;
    const remaining = phase.duration - elapsed;

    if (remaining <= 0) {
      // Start the next phase exactly where this one should have ended.
      this.advance(this.phaseStart + phase.duration * 1000);
      this.emit();
      return;
    }

    if (phase.kind !== 'work' && this.routine.countdownBeeps) {
      const sec = Math.ceil(remaining);
      if (sec <= 3 && sec !== this.lastBeepSecond) {
        this.lastBeepSecond = sec;
        audio.beep(660, 1, 0.1);
      }
    }

    if (phase.kind === 'work' && now >= this.nextCueAt) {
      if (remaining > END_GUARD_S) this.fireCue();
      const step = nextInterval(this.routine.interval) * 1000;
      // Schedule from the planned time to avoid drift; if we fell far behind
      // (e.g. the tab was throttled), restart the rhythm from now.
      this.nextCueAt = now - this.nextCueAt > step ? now + step : this.nextCueAt + step;
    }

    this.emit();
  }

  private fireCue() {
    const id = pickCue(this.routine, this.history);
    const cue = id ? this.cueMap.get(id) : undefined;
    if (!id || !cue) return;
    this.history.push(id);
    this.currentCue = cue;
    this.cueSerial++;
    void audio.play(cue);
    if ('vibrate' in navigator) navigator.vibrate?.(60);
  }
}
