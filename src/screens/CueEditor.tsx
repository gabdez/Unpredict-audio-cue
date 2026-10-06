import { useEffect, useRef, useState } from 'react';
import { Field, NumberField, Segmented, TopBar } from '../components';
import { audio } from '../lib/audio';
import { CUE_COLORS, uid } from '../lib/defaults';
import { navigate } from '../lib/router';
import { saveAudio } from '../lib/storage';
import { useStore } from '../lib/store';
import type { Cue } from '../lib/types';

const SYMBOLS = ['←', '→', '↑', '↓', '↖', '↗', '↙', '↘', '⤒', '»', '■', '●', '★', '✋', '⚡', '1', '2', '3', 'A', 'B'];
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

type SourceTab = 'voice' | 'record' | 'upload' | 'beep';

export function CueEditor({ id }: { id: string }) {
  const { cues, upsertCue, removeCue } = useStore();
  const cue = cues.find((c) => c.id === id);
  const [tab, setTab] = useState<SourceTab>(() =>
    cue?.sound.type === 'recording' ? 'record' : cue?.sound.type === 'beep' ? 'beep' : 'voice',
  );

  if (!cue) {
    return (
      <div className="screen">
        <TopBar title="Not found" back={{ name: 'cues' }} />
        <main className="content">
          <p>This cue no longer exists.</p>
        </main>
      </div>
    );
  }

  const update = (patch: Partial<Cue>) => upsertCue({ ...cue, ...patch });
  const preview = () => audio.unlock().then(() => audio.play(cue));

  const saveBlob = async (blob: Blob) => {
    const audioId = uid();
    await saveAudio(audioId, blob);
    update({ sound: { type: 'recording', audioId, mime: blob.type } });
  };

  const switchTab = (t: SourceTab) => {
    setTab(t);
    // Voice and beep need no extra input, so switch the sound right away.
    if (t === 'voice' && cue.sound.type !== 'voice') update({ sound: { type: 'voice', text: cue.name } });
    if (t === 'beep' && cue.sound.type !== 'beep') update({ sound: { type: 'beep', frequency: 880, count: 1 } });
  };

  const remove = () => {
    if (!confirm(`Delete “${cue.name}”? It will be removed from every routine.`)) return;
    removeCue(cue.id);
    navigate({ name: 'cues' }, true);
  };

  return (
    <div className="screen">
      <TopBar title="Edit cue" back={{ name: 'cues' }} />
      <main className="content form">
        <div className="cue-hero" style={{ background: cue.color }}>
          <span className="cue-hero-symbol">{cue.symbol}</span>
          <span className="cue-hero-name">{cue.name}</span>
        </div>

        <Field label="Name">
          <input
            type="text"
            value={cue.name}
            onChange={(e) => {
              const name = e.target.value;
              // Keep the spoken text in sync while the user hasn't customised it.
              const syncVoice = cue.sound.type === 'voice' && cue.sound.text === cue.name;
              update({ name, ...(syncVoice ? { sound: { type: 'voice', text: name } } : {}) });
            }}
          />
        </Field>

        <div className="field">
          <span className="field-label">Symbol</span>
          <div className="symbol-grid">
            {SYMBOLS.map((s) => (
              <button key={s} type="button" className={cue.symbol === s ? 'on' : ''} onClick={() => update({ symbol: s })}>
                {s}
              </button>
            ))}
            <input
              className="symbol-custom"
              type="text"
              maxLength={3}
              placeholder="Custom"
              value={SYMBOLS.includes(cue.symbol) ? '' : cue.symbol}
              onChange={(e) => e.target.value && update({ symbol: e.target.value })}
            />
          </div>
        </div>

        <div className="field">
          <span className="field-label">Color</span>
          <div className="color-row">
            {CUE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`swatch ${cue.color === c ? 'on' : ''}`}
                style={{ background: c }}
                onClick={() => update({ color: c })}
                aria-label={`Color ${c}`}
              />
            ))}
            <input type="color" value={cue.color} onChange={(e) => update({ color: e.target.value })} aria-label="Custom color" />
          </div>
        </div>

        <section className="section">
          <h2>Sound</h2>
          <Segmented
            value={tab}
            onChange={switchTab}
            options={[
              { value: 'voice', label: 'Speak' },
              { value: 'record', label: 'Record' },
              { value: 'upload', label: 'Upload' },
              { value: 'beep', label: 'Beep' },
            ]}
          />

          {tab === 'voice' && cue.sound.type === 'voice' && (
            <Field label="Text to say" hint="Uses your device's voice. Change voice and speed in Settings.">
              <input
                type="text"
                value={cue.sound.text}
                onChange={(e) => update({ sound: { type: 'voice', text: e.target.value } })}
              />
            </Field>
          )}

          {tab === 'record' && <Recorder hasRecording={cue.sound.type === 'recording'} onDone={saveBlob} />}

          {tab === 'upload' && (
            <Field label="Audio file" hint="Short clips work best (under 2 seconds). Max 5 MB.">
              <input
                type="file"
                accept="audio/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > MAX_UPLOAD_BYTES) return alert('That file is too large (max 5 MB).');
                  await saveBlob(file);
                }}
              />
              {cue.sound.type === 'recording' && <span className="field-hint ok">✓ Custom sound saved</span>}
            </Field>
          )}

          {tab === 'beep' && cue.sound.type === 'beep' && (
            <>
              <NumberField
                label="Pitch"
                unit="Hz"
                step={110}
                min={220}
                max={2640}
                value={cue.sound.frequency}
                onChange={(frequency) => cue.sound.type === 'beep' && update({ sound: { ...cue.sound, frequency } })}
              />
              <NumberField
                label="Beeps"
                min={1}
                max={5}
                value={cue.sound.count}
                onChange={(count) => cue.sound.type === 'beep' && update({ sound: { ...cue.sound, count } })}
              />
            </>
          )}

          <button className="btn block" onClick={preview}>
            🔊 Test sound
          </button>
        </section>

        <div className="actions">
          <button className="btn danger block" onClick={remove}>
            Delete cue
          </button>
        </div>
      </main>
    </div>
  );
}

function Recorder({ hasRecording, onDone }: { hasRecording: boolean; onDone(blob: Blob): Promise<void> }) {
  const [state, setState] = useState<'idle' | 'recording' | 'error'>('idle');
  const [error, setError] = useState('');
  const recorder = useRef<MediaRecorder | null>(null);
  const autoStop = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (autoStop.current) clearTimeout(autoStop.current);
      recorder.current?.stream.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setState('error');
      setError('Recording is not supported in this browser. Try uploading a file instead.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setState('idle');
        if (chunks.length) await onDone(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }));
      };
      recorder.current = rec;
      rec.start();
      setState('recording');
      autoStop.current = setTimeout(() => rec.state === 'recording' && rec.stop(), 5000);
    } catch {
      setState('error');
      setError('Microphone access was denied.');
    }
  };

  const stop = () => {
    if (autoStop.current) clearTimeout(autoStop.current);
    if (recorder.current?.state === 'recording') recorder.current.stop();
  };

  return (
    <div className="recorder">
      {state === 'recording' ? (
        <button className="btn rec-btn recording" onClick={stop}>
          ■ Stop recording
        </button>
      ) : (
        <button className="btn rec-btn" onClick={start}>
          ● {hasRecording ? 'Re-record' : 'Record'}
        </button>
      )}
      <span className="field-hint">
        {state === 'recording'
          ? 'Say your cue now… (stops automatically after 5 s)'
          : hasRecording
            ? '✓ Your recording is saved. Tap Test sound to hear it.'
            : 'Tap Record, say the word, then tap Stop.'}
      </span>
      {state === 'error' && <span className="field-hint error">{error}</span>}
    </div>
  );
}
