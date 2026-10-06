import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { audio } from './audio';
import { deleteAudio, loadAll, saveCues, saveRoutines, saveSettings, type AppData } from './storage';
import type { Cue, Routine, Settings } from './types';

interface Store extends AppData {
  upsertCue(cue: Cue): void;
  removeCue(id: string): void;
  upsertRoutine(routine: Routine): void;
  removeRoutine(id: string): void;
  updateSettings(patch: Partial<Settings>): void;
  replaceAll(data: AppData): void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);

  useEffect(() => {
    loadAll().then(setData);
  }, []);

  useEffect(() => {
    if (data) audio.configure(data.settings);
  }, [data?.settings]);

  const upsert = <T extends { id: string }>(list: T[], item: T) =>
    list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];

  const upsertCue = useCallback((cue: Cue) => {
    setData((d) => {
      if (!d) return d;
      const prev = d.cues.find((c) => c.id === cue.id);
      if (prev?.sound.type === 'recording' && (cue.sound.type !== 'recording' || cue.sound.audioId !== prev.sound.audioId)) {
        void deleteAudio(prev.sound.audioId);
        audio.forget(prev.sound.audioId);
      }
      const cues = upsert(d.cues, cue);
      void saveCues(cues);
      return { ...d, cues };
    });
  }, []);

  const removeCue = useCallback((id: string) => {
    setData((d) => {
      if (!d) return d;
      const cue = d.cues.find((c) => c.id === id);
      if (cue?.sound.type === 'recording') void deleteAudio(cue.sound.audioId);
      const cues = d.cues.filter((c) => c.id !== id);
      const routines = d.routines.map((r) => ({ ...r, cues: r.cues.filter((rc) => rc.cueId !== id) }));
      void saveCues(cues);
      void saveRoutines(routines);
      return { ...d, cues, routines };
    });
  }, []);

  const upsertRoutine = useCallback((routine: Routine) => {
    setData((d) => {
      if (!d) return d;
      const routines = upsert(d.routines, { ...routine, updatedAt: Date.now() });
      void saveRoutines(routines);
      return { ...d, routines };
    });
  }, []);

  const removeRoutine = useCallback((id: string) => {
    setData((d) => {
      if (!d) return d;
      const routines = d.routines.filter((r) => r.id !== id);
      void saveRoutines(routines);
      return { ...d, routines };
    });
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setData((d) => {
      if (!d) return d;
      const settings = { ...d.settings, ...patch };
      void saveSettings(settings);
      return { ...d, settings };
    });
  }, []);

  const replaceAll = useCallback((next: AppData) => setData(next), []);

  const value = useMemo(
    () =>
      data && { ...data, upsertCue, removeCue, upsertRoutine, removeRoutine, updateSettings, replaceAll },
    [data, upsertCue, removeCue, upsertRoutine, removeRoutine, updateSettings, replaceAll],
  );

  if (!value) return <div className="loading">Loading…</div>;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside StoreProvider');
  return s;
}
