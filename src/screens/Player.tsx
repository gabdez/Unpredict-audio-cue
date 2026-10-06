import { useEffect, useMemo, useRef, useState } from 'react';
import { audio } from '../lib/audio';
import { href, navigate } from '../lib/router';
import { formatTime, totalDuration } from '../lib/scheduler';
import { SessionRunner, type SessionSnapshot } from '../lib/session';
import { useStore } from '../lib/store';
import { describeInterval, describeStructure } from './Home';

const PHASE_LABEL = { prep: 'Get ready', work: 'Go', rest: 'Rest' } as const;

export function Player({ id }: { id: string }) {
  const { routines, cues, settings } = useStore();
  const stored = routines.find((r) => r.id === id);
  // Only keep cues that still exist in the library.
  const routine = useMemo(
    () => stored && { ...stored, cues: stored.cues.filter((rc) => rc.weight > 0 && cues.some((c) => c.id === rc.cueId)) },
    [stored, cues],
  );
  const runner = useRef<SessionRunner | null>(null);
  const [snap, setSnap] = useState<SessionSnapshot | null>(null);

  useEffect(() => () => runner.current?.stop(), []);
  useWakeLock(settings.keepScreenOn && snap !== null && snap.status !== 'done');

  if (!routine) {
    return (
      <div className="screen">
        <main className="content">
          <p>This routine no longer exists.</p>
          <a className="btn" href={href({ name: 'home' })}>Back</a>
        </main>
      </div>
    );
  }

  const start = async () => {
    // Must run inside the tap handler so mobile browsers allow sound.
    await audio.unlock();
    await audio.preload(cues.filter((c) => routine.cues.some((rc) => rc.cueId === c.id)));
    runner.current?.stop();
    const r = new SessionRunner(routine, cues);
    runner.current = r;
    r.subscribe(setSnap);
    r.start();
  };

  const exit = () => {
    runner.current?.stop();
    runner.current = null;
    navigate({ name: 'home' }, true);
  };

  if (!snap) {
    const ready = routine.cues.length > 0;
    return (
      <div className="screen player ready">
        <button className="icon-btn player-close" onClick={exit} aria-label="Close">
          ✕
        </button>
        <div className="ready-body">
          <h1>{routine.name}</h1>
          <p className="meta">
            {describeInterval(routine)} · {describeStructure(routine)} · {formatTime(totalDuration(routine))}
          </p>
          {ready ? (
            <>
              <button className="start-btn" onClick={start}>
                START
              </button>
              <p className="field-hint">Turn your volume up. Bluetooth speakers and earbuds work too.</p>
            </>
          ) : (
            <p>
              This routine has no cues. <a href={href({ name: 'routine', id: routine.id })}>Add some</a>.
            </p>
          )}
        </div>
      </div>
    );
  }

  const { phase, status } = snap;
  const workIndex = phase.kind === 'work' || phase.kind === 'rest' ? phase.round : 0;
  const showCue = routine.showCue && phase.kind === 'work' && snap.currentCue;
  const bg = showCue ? snap.currentCue!.color : undefined;

  return (
    <div className={`screen player phase-${phase.kind} ${status}`} style={bg ? { background: bg } : undefined}>
      <header className="player-head">
        <span className="phase-label">
          {status === 'done' ? 'Done' : PHASE_LABEL[phase.kind]}
          {workIndex > 0 && snap.workRounds > 1 && status !== 'done' && (
            <span className="round">
              {' '}
              · Round {workIndex}/{snap.workRounds}
            </span>
          )}
        </span>
        <span className="phase-time">{status === 'done' ? formatTime(Math.floor(snap.elapsed)) : formatTime(snap.phaseRemaining)}</span>
      </header>

      <div className="player-stage" onClick={() => (status === 'running' ? runner.current?.pause() : status === 'paused' ? runner.current?.resume() : undefined)}>
        {status === 'done' ? (
          <div className="done">
            <div className="done-big">✓</div>
            <p>
              {plural(snap.cueCount, 'cue')} in {formatTime(Math.floor(snap.elapsed))}
            </p>
          </div>
        ) : showCue ? (
          <div key={snap.cueSerial} className="cue-display flash">
            <span className="cue-symbol">{snap.currentCue!.symbol}</span>
            <span className="cue-name">{snap.currentCue!.name}</span>
          </div>
        ) : phase.kind === 'work' ? (
          <div key={snap.cueSerial} className={`cue-display ${snap.cueSerial ? 'pulse' : ''}`}>
            <span className="cue-name dim">{routine.showCue ? 'Listen…' : 'Listen'}</span>
          </div>
        ) : (
          <div className="countdown">{Math.max(0, Math.ceil(snap.phaseRemaining))}</div>
        )}
        {status === 'paused' && <div className="paused-overlay">Paused — tap to resume</div>}
      </div>

      <footer className="player-controls">
        {status === 'done' ? (
          <>
            <button className="btn big" onClick={exit}>
              Close
            </button>
            <button className="btn primary big" onClick={start}>
              Again
            </button>
          </>
        ) : (
          <>
            <button className="btn big" onClick={exit}>
              Stop
            </button>
            {status === 'running' ? (
              <button className="btn primary big" onClick={() => runner.current?.pause()}>
                Pause
              </button>
            ) : (
              <button className="btn primary big" onClick={() => runner.current?.resume()}>
                Resume
              </button>
            )}
            <button className="btn big" onClick={() => runner.current?.skip()}>
              Skip ›
            </button>
          </>
        )}
      </footer>
      <div className="player-foot meta">
        {plural(snap.cueCount, 'cue')} · {formatTime(Math.floor(snap.elapsed))} elapsed
      </div>
    </div>
  );
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Keep the screen awake during a session (otherwise the phone locks mid-drill). */
function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        lock = await navigator.wakeLock.request('screen');
        if (cancelled) void lock.release();
      } catch {
        /* denied or unsupported — ignore */
      }
    };
    const onVisible = () => document.visibilityState === 'visible' && void acquire();
    void acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      void lock?.release();
    };
  }, [active]);
}
