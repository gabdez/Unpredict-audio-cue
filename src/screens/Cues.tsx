import { BottomNav, CueBadge, TopBar } from '../components';
import { audio } from '../lib/audio';
import { uid } from '../lib/defaults';
import { href, navigate } from '../lib/router';
import { useStore } from '../lib/store';
import type { Cue } from '../lib/types';

const SOUND_LABEL: Record<Cue['sound']['type'], string> = {
  voice: 'Spoken',
  recording: 'Recording',
  beep: 'Beep',
};

export function Cues() {
  const { cues, upsertCue } = useStore();

  const create = () => {
    const cue: Cue = { id: uid(), name: 'New cue', symbol: '★', color: '#ff5fb8', sound: { type: 'voice', text: 'New cue' } };
    upsertCue(cue);
    navigate({ name: 'cue', id: cue.id });
  };

  return (
    <div className="screen">
      <TopBar title="Sounds" />
      <main className="content">
        <p className="lead">Your cue library. Use a spoken word, record your own voice, upload a sound or use a beep.</p>
        <ul className="card-list">
          {cues.map((c) => (
            <li key={c.id} className="card cue-row">
              <a className="cue-row-main" href={href({ name: 'cue', id: c.id })}>
                <CueBadge symbol={c.symbol} color={c.color} />
                <span>
                  <strong>{c.name}</strong>
                  <span className="meta">{SOUND_LABEL[c.sound.type]}</span>
                </span>
              </a>
              <button className="icon-btn" onClick={() => audio.unlock().then(() => audio.play(c))} aria-label={`Play ${c.name}`}>
                🔊
              </button>
            </li>
          ))}
        </ul>
        <button className="btn primary block" onClick={create}>
          + New cue
        </button>
      </main>
      <BottomNav active="cues" />
    </div>
  );
}
