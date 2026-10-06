import { describe, expect, it } from 'vitest';
import { buildPhases, formatTime, nextInterval, pickCue, totalDuration } from './scheduler';
import type { Routine } from './types';

const base: Routine = {
  id: 'r',
  name: 'Test',
  cues: [
    { cueId: 'left', weight: 1 },
    { cueId: 'right', weight: 1 },
  ],
  order: 'random',
  interval: { mode: 'fixed', seconds: 2 },
  maxRepeat: 0,
  rounds: 3,
  workSeconds: 30,
  restSeconds: 15,
  prepSeconds: 5,
  countdownBeeps: true,
  showCue: true,
  updatedAt: 0,
};

/** Deterministic RNG cycling through the given values. */
const seq = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe('buildPhases', () => {
  it('interleaves rest between rounds, not after the last', () => {
    expect(buildPhases(base).map((p) => `${p.kind}${p.round}`)).toEqual([
      'prep1', 'work1', 'rest1', 'work2', 'rest2', 'work3',
    ]);
    expect(totalDuration(base)).toBe(5 + 30 * 3 + 15 * 2);
  });

  it('skips zero-length prep and rest', () => {
    const phases = buildPhases({ ...base, prepSeconds: 0, restSeconds: 0 });
    expect(phases.map((p) => p.kind)).toEqual(['work', 'work', 'work']);
  });

  it('open-ended work is a single infinite round', () => {
    const phases = buildPhases({ ...base, workSeconds: null });
    expect(phases).toEqual([
      { kind: 'prep', round: 1, duration: 5 },
      { kind: 'work', round: 1, duration: Infinity },
    ]);
  });
});

describe('nextInterval', () => {
  it('returns fixed seconds', () => {
    expect(nextInterval({ mode: 'fixed', seconds: 5 })).toBe(5);
  });

  it('stays within the random range even if min/max are swapped', () => {
    const cfg = { mode: 'random', min: 4, max: 1 } as const;
    expect(nextInterval(cfg, () => 0)).toBe(1);
    expect(nextInterval(cfg, () => 0.999999)).toBeCloseTo(4, 3);
  });
});

describe('pickCue', () => {
  it('cycles in sequence mode', () => {
    const r = { ...base, order: 'sequence' as const };
    expect(pickCue(r, [])).toBe('left');
    expect(pickCue(r, ['left'])).toBe('right');
    expect(pickCue(r, ['left', 'right'])).toBe('left');
  });

  it('respects weights', () => {
    const r = { ...base, cues: [{ cueId: 'a', weight: 3 }, { cueId: 'b', weight: 1 }] };
    expect(pickCue(r, [], () => 0.7)).toBe('a');
    expect(pickCue(r, [], () => 0.8)).toBe('b');
  });

  it('ignores zero-weight cues and returns null when none are left', () => {
    expect(pickCue({ ...base, cues: [{ cueId: 'a', weight: 0 }] }, [])).toBeNull();
  });

  it('never exceeds maxRepeat in a row', () => {
    const r = { ...base, maxRepeat: 2 };
    // rng always says "left", but two lefts in a row forces a right
    expect(pickCue(r, ['left', 'left'], () => 0)).toBe('right');
    expect(pickCue(r, ['right', 'left'], () => 0)).toBe('left');
  });

  it('allows repeats when only one cue exists', () => {
    const r = { ...base, maxRepeat: 1, cues: [{ cueId: 'a', weight: 1 }] };
    expect(pickCue(r, ['a'], seq(0.5))).toBe('a');
  });
});

describe('formatTime', () => {
  it('formats minutes and seconds', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(4.2)).toBe('0:05');
    expect(formatTime(125)).toBe('2:05');
    expect(formatTime(Infinity)).toBe('∞');
  });
});
