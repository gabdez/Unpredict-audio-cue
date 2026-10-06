import { useEffect, useRef, useState } from 'react';
import { BottomNav, Field, Toggle, TopBar } from '../components';
import { audio, listVoices } from '../lib/audio';
import { DEFAULT_CUES, DEFAULT_ROUTINES } from '../lib/defaults';
import { exportData, importData, saveCues, saveRoutines } from '../lib/storage';
import { useStore } from '../lib/store';

export function Settings() {
  const store = useStore();
  const { settings, updateSettings } = store;
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [message, setMessage] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listVoices().then((v) => setVoices([...v].sort((a, b) => a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name))));
  }, []);

  const testVoice = async () => {
    await audio.unlock();
    audio.speak('Left. Right. Go!');
  };

  const doExport = async () => {
    const blob = await exportData(store);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `unpredict-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const doImport = async (file: File) => {
    try {
      store.replaceAll(await importData(file, store));
      setMessage('Import complete.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Import failed.');
    }
  };

  const restorePresets = async () => {
    if (!confirm('Add the built-in cues and routines back? Your own items are kept.')) return;
    const cues = [...store.cues.filter((c) => !DEFAULT_CUES.some((d) => d.id === c.id)), ...DEFAULT_CUES];
    const routines = [...store.routines.filter((r) => !DEFAULT_ROUTINES.some((d) => d.id === r.id)), ...DEFAULT_ROUTINES];
    await Promise.all([saveCues(cues), saveRoutines(routines)]);
    store.replaceAll({ cues, routines, settings: store.settings });
    setMessage('Presets restored.');
  };

  return (
    <div className="screen">
      <TopBar title="Settings" />
      <main className="content form">
        <section className="section">
          <h2>Voice</h2>
          <Field label="Voice" hint="Voices come from your device. Install more in your phone's text-to-speech settings.">
            <select
              value={settings.voiceURI ?? ''}
              onChange={(e) => updateSettings({ voiceURI: e.target.value || null })}
            >
              <option value="">Device default</option>
              {voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </Field>
          <Field label={`Speaking speed: ${settings.speechRate.toFixed(1)}×`}>
            <input
              type="range"
              min={0.6}
              max={2}
              step={0.1}
              value={settings.speechRate}
              onChange={(e) => updateSettings({ speechRate: parseFloat(e.target.value) })}
            />
          </Field>
          <Field label={`Volume: ${Math.round(settings.volume * 100)}%`}>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={settings.volume}
              onChange={(e) => updateSettings({ volume: parseFloat(e.target.value) })}
            />
          </Field>
          <button className="btn block" onClick={testVoice}>
            🔊 Test voice
          </button>
        </section>

        <section className="section">
          <h2>Session</h2>
          <Toggle
            label="Keep screen on"
            hint="Prevents the phone from locking during a session"
            checked={settings.keepScreenOn}
            onChange={(keepScreenOn) => updateSettings({ keepScreenOn })}
          />
        </section>

        <section className="section">
          <h2>Backup & share</h2>
          <p className="field-hint">
            Everything is stored on this device only. Export a file to back up or move your cues, recordings and
            routines to another device.
          </p>
          <div className="row-2">
            <button className="btn" onClick={doExport}>
              Export
            </button>
            <button className="btn" onClick={() => fileInput.current?.click()}>
              Import
            </button>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void doImport(f);
              e.target.value = '';
            }}
          />
          <button className="btn block" onClick={restorePresets}>
            Restore built-in presets
          </button>
          {message && <p className="field-hint ok">{message}</p>}
        </section>

        <section className="section about">
          <h2>Install</h2>
          <p className="field-hint">
            <strong>iPhone:</strong> Share → Add to Home Screen. <strong>Android / Chrome:</strong> menu → Install app.
            Once installed it works offline.
          </p>
        </section>
      </main>
      <BottomNav active="settings" />
    </div>
  );
}
