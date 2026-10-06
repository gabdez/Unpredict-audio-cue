import { CueBadge, Field, NumberField, Segmented, Toggle, TopBar } from '../components';
import { audio } from '../lib/audio';
import { uid } from '../lib/defaults';
import { href, navigate } from '../lib/router';
import { formatTime, totalDuration } from '../lib/scheduler';
import { useStore } from '../lib/store';
import type { Routine } from '../lib/types';

export function RoutineEditor({ id }: { id: string }) {
  const { routines, cues, upsertRoutine, removeRoutine } = useStore();
  const routine = routines.find((r) => r.id === id);

  if (!routine) {
    return (
      <div className="screen">
        <TopBar title="Not found" back={{ name: 'home' }} />
        <main className="content">
          <p>This routine no longer exists.</p>
        </main>
      </div>
    );
  }

  // Changes save immediately — no save button to forget mid-practice.
  const update = (patch: Partial<Routine>) => upsertRoutine({ ...routine, ...patch });
  const weightOf = (cueId: string) => routine.cues.find((c) => c.cueId === cueId)?.weight ?? 0;
  const setWeight = (cueId: string, weight: number) => {
    const others = routine.cues.filter((c) => c.cueId !== cueId);
    const next = weight > 0 ? [...others, { cueId, weight }] : others;
    // Keep library order so "In order" mode is predictable.
    const pos = (id: string) => cues.findIndex((c) => c.id === id);
    update({ cues: next.sort((a, b) => pos(a.cueId) - pos(b.cueId)) });
  };

  const selected = routine.cues.filter((rc) => rc.weight > 0 && cues.some((c) => c.id === rc.cueId));
  const totalWeight = selected.reduce((s, c) => s + c.weight, 0);
  const iv = routine.interval;

  const duplicate = () => {
    const copy = { ...routine, id: uid(), name: `${routine.name} (copy)` };
    upsertRoutine(copy);
    navigate({ name: 'routine', id: copy.id }, true);
  };

  const remove = () => {
    if (!confirm(`Delete “${routine.name}”?`)) return;
    removeRoutine(routine.id);
    navigate({ name: 'home' }, true);
  };

  return (
    <div className="screen">
      <TopBar title="Edit routine" back={{ name: 'home' }} />
      <main className="content form">
        <Field label="Name">
          <input type="text" value={routine.name} onChange={(e) => update({ name: e.target.value })} />
        </Field>

        <section className="section">
          <h2>Cues</h2>
          <p className="field-hint">
            Tap to include a cue. In random mode, + / − changes how often it's called.{' '}
            <a href={href({ name: 'cues' })}>Manage sounds</a>
          </p>
          <ul className="cue-pick">
            {cues.map((c) => {
              const w = weightOf(c.id);
              const on = w > 0;
              return (
                <li key={c.id} className={on ? 'on' : ''}>
                  <button type="button" className="cue-pick-main" onClick={() => setWeight(c.id, on ? 0 : 1)}>
                    <CueBadge symbol={c.symbol} color={c.color} size={34} />
                    <span className="cue-pick-name">{c.name}</span>
                    {on && routine.order === 'random' && (
                      <span className="pct">{Math.round((w / totalWeight) * 100)}%</span>
                    )}
                  </button>
                  {on && routine.order === 'random' && (
                    <span className="mini-stepper">
                      <button type="button" onClick={() => setWeight(c.id, Math.max(1, w - 1))} aria-label="Less often">
                        −
                      </button>
                      <span>×{w}</span>
                      <button type="button" onClick={() => setWeight(c.id, Math.min(10, w + 1))} aria-label="More often">
                        +
                      </button>
                    </span>
                  )}
                  <button type="button" className="icon-btn small" onClick={() => audio.unlock().then(() => audio.play(c))} aria-label={`Preview ${c.name}`}>
                    🔊
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="section">
          <h2>Order</h2>
          <Segmented
            value={routine.order}
            onChange={(order) => update({ order })}
            options={[
              { value: 'random', label: 'Random' },
              { value: 'sequence', label: 'In order' },
            ]}
          />
          {routine.order === 'random' && (
            <NumberField
              label="Max same cue in a row"
              hint="0 = no limit. Stops long streaks like Left-Left-Left-Left."
              value={routine.maxRepeat}
              min={0}
              max={20}
              onChange={(maxRepeat) => update({ maxRepeat })}
            />
          )}
        </section>

        <section className="section">
          <h2>Timing between cues</h2>
          <Segmented
            value={iv.mode}
            onChange={(mode) =>
              update({
                interval:
                  mode === 'fixed'
                    ? { mode, seconds: iv.mode === 'fixed' ? iv.seconds : iv.max }
                    : { mode, min: iv.mode === 'random' ? iv.min : Math.max(0.5, iv.seconds - 1), max: iv.mode === 'random' ? iv.max : iv.seconds + 1 },
              })
            }
            options={[
              { value: 'fixed', label: 'Fixed' },
              { value: 'random', label: 'Random range' },
            ]}
          />
          {iv.mode === 'fixed' ? (
            <NumberField
              label="Every"
              unit="s"
              step={0.5}
              min={0.5}
              value={iv.seconds}
              onChange={(seconds) => update({ interval: { mode: 'fixed', seconds } })}
            />
          ) : (
            <div className="row-2">
              <NumberField
                label="Min"
                unit="s"
                step={0.5}
                min={0.5}
                value={iv.min}
                onChange={(min) => update({ interval: { ...iv, min } })}
              />
              <NumberField
                label="Max"
                unit="s"
                step={0.5}
                min={0.5}
                value={iv.max}
                onChange={(max) => update({ interval: { ...iv, max } })}
              />
            </div>
          )}
        </section>

        <section className="section">
          <h2>Session</h2>
          <Toggle
            label="Run until I stop it"
            checked={routine.workSeconds === null}
            onChange={(on) => update({ workSeconds: on ? null : 60 })}
          />
          {routine.workSeconds !== null && (
            <>
              <div className="row-2">
                <NumberField label="Rounds" value={routine.rounds} min={1} max={99} onChange={(rounds) => update({ rounds })} />
                <NumberField
                  label="Round length"
                  unit="s"
                  step={5}
                  min={5}
                  value={routine.workSeconds}
                  onChange={(workSeconds) => update({ workSeconds })}
                />
              </div>
              <NumberField
                label="Rest between rounds"
                unit="s"
                step={5}
                min={0}
                value={routine.restSeconds}
                onChange={(restSeconds) => update({ restSeconds })}
              />
            </>
          )}
          <NumberField
            label="Get-ready countdown"
            unit="s"
            min={0}
            max={60}
            value={routine.prepSeconds}
            onChange={(prepSeconds) => update({ prepSeconds })}
          />
          <Toggle
            label="Countdown beeps"
            hint="3-2-1 beeps before each round"
            checked={routine.countdownBeeps}
            onChange={(countdownBeeps) => update({ countdownBeeps })}
          />
          <Toggle
            label="Show cue on screen"
            hint="Turn off to train on sound only"
            checked={routine.showCue}
            onChange={(showCue) => update({ showCue })}
          />
          <p className="total">Total: {formatTime(totalDuration(routine))}</p>
        </section>

        <div className="actions">
          <a
            className={`btn primary block big ${selected.length === 0 ? 'disabled' : ''}`}
            href={selected.length ? href({ name: 'play', id: routine.id }) : undefined}
          >
            ▶ Start
          </a>
          <div className="row-2">
            <button className="btn" onClick={duplicate}>
              Duplicate
            </button>
            <button className="btn danger" onClick={remove}>
              Delete
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
