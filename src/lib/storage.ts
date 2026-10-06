import { del, get, set } from 'idb-keyval';
import { DEFAULT_CUES, DEFAULT_ROUTINES, DEFAULT_SETTINGS } from './defaults';
import type { Cue, Routine, Settings } from './types';

// Everything lives in IndexedDB on the device: works offline, no account needed.
const K = {
  cues: 'cues',
  routines: 'routines',
  settings: 'settings',
  audio: (id: string) => `audio:${id}`,
};

export interface AppData {
  cues: Cue[];
  routines: Routine[];
  settings: Settings;
}

export async function loadAll(): Promise<AppData> {
  const [cues, routines, settings] = await Promise.all([
    get<Cue[]>(K.cues),
    get<Routine[]>(K.routines),
    get<Settings>(K.settings),
  ]);
  return {
    cues: cues ?? DEFAULT_CUES,
    routines: routines ?? DEFAULT_ROUTINES,
    settings: { ...DEFAULT_SETTINGS, ...settings },
  };
}

export const saveCues = (cues: Cue[]) => set(K.cues, cues);
export const saveRoutines = (routines: Routine[]) => set(K.routines, routines);
export const saveSettings = (settings: Settings) => set(K.settings, settings);

export const saveAudio = (id: string, blob: Blob) => set(K.audio(id), blob);
export const loadAudio = (id: string) => get<Blob>(K.audio(id));
export const deleteAudio = (id: string) => del(K.audio(id));

// ---- Backup / transfer between devices ----

interface ExportFile {
  app: 'unpredict-audio-cue';
  version: 1;
  cues: Cue[];
  routines: Routine[];
  audio: Record<string, { mime: string; data: string }>;
}

export async function exportData(data: AppData): Promise<Blob> {
  const audio: ExportFile['audio'] = {};
  for (const cue of data.cues) {
    if (cue.sound.type !== 'recording') continue;
    const blob = await loadAudio(cue.sound.audioId);
    if (blob) audio[cue.sound.audioId] = { mime: blob.type, data: await blobToBase64(blob) };
  }
  const file: ExportFile = {
    app: 'unpredict-audio-cue',
    version: 1,
    cues: data.cues,
    routines: data.routines,
    audio,
  };
  return new Blob([JSON.stringify(file)], { type: 'application/json' });
}

/** Merge an export file into existing data (imported items win on id clashes). */
export async function importData(file: File, current: AppData): Promise<AppData> {
  const parsed = JSON.parse(await file.text()) as Partial<ExportFile>;
  if (parsed.app !== 'unpredict-audio-cue' || !Array.isArray(parsed.cues) || !Array.isArray(parsed.routines)) {
    throw new Error('This file is not an Unpredict backup.');
  }
  for (const [id, a] of Object.entries(parsed.audio ?? {})) {
    await saveAudio(id, base64ToBlob(a.data, a.mime));
  }
  const merge = <T extends { id: string }>(a: T[], b: T[]) => [
    ...a.filter((x) => !b.some((y) => y.id === x.id)),
    ...b,
  ];
  const cues = merge(current.cues, parsed.cues);
  const routines = merge(current.routines, parsed.routines);
  await Promise.all([saveCues(cues), saveRoutines(routines)]);
  return { ...current, cues, routines };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(data: string, mime: string): Blob {
  const bin = atob(data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
