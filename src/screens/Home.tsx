import { BottomNav, CueBadge, TopBar } from '../components';
import { newRoutine } from '../lib/defaults';
import { href, navigate } from '../lib/router';
import { formatTime, totalDuration } from '../lib/scheduler';
import { useStore } from '../lib/store';
import type { Routine } from '../lib/types';

export function describeInterval(r: Routine): string {
  return r.interval.mode === 'fixed'
    ? `every ${r.interval.seconds}s`
    : `every ${r.interval.min}–${r.interval.max}s`;
}

export function describeStructure(r: Routine): string {
  if (r.workSeconds === null) return 'until stopped';
  const rest = r.restSeconds > 0 && r.rounds > 1 ? ` / ${r.restSeconds}s rest` : '';
  return `${r.rounds} × ${formatTime(r.workSeconds)}${rest}`;
}

export function Home() {
  const { routines, cues, upsertRoutine } = useStore();
  const cueById = new Map(cues.map((c) => [c.id, c]));
  const sorted = [...routines].sort((a, b) => b.updatedAt - a.updatedAt);

  const create = () => {
    const r = newRoutine();
    upsertRoutine(r);
    navigate({ name: 'routine', id: r.id });
  };

  return (
    <div className="screen">
      <TopBar title="Unpredict" />
      <main className="content">
        <p className="lead">Pick a routine and press play. Calls come at random so you react instead of anticipate.</p>
        <ul className="card-list">
          {sorted.map((r) => {
            const list = r.cues.map((rc) => cueById.get(rc.cueId)).filter((c) => !!c);
            return (
              <li key={r.id} className="card routine-card">
                <a className="routine-main" href={href({ name: 'routine', id: r.id })}>
                  <strong>{r.name}</strong>
                  <span className="badges">
                    {list.slice(0, 6).map((c) => (
                      <CueBadge key={c.id} symbol={c.symbol} color={c.color} size={26} />
                    ))}
                  </span>
                  <span className="meta">
                    {describeInterval(r)} · {describeStructure(r)} · {formatTime(totalDuration(r))}
                  </span>
                </a>
                <a
                  className="play-btn"
                  href={href({ name: 'play', id: r.id })}
                  aria-label={`Start ${r.name}`}
                >
                  ▶
                </a>
              </li>
            );
          })}
        </ul>
        <button className="btn primary block" onClick={create}>
          + New routine
        </button>
      </main>
      <BottomNav active="home" />
    </div>
  );
}
