import { loadAudio } from './storage';
import type { Cue, Settings } from './types';

/**
 * Plays cues with minimal latency:
 * - recordings are decoded once into AudioBuffers and played through Web Audio,
 * - beeps are synthesized with an oscillator,
 * - voice cues use the browser's speech synthesis (works offline on most devices).
 *
 * Mobile browsers only allow audio after a user gesture, so `unlock()` must be
 * called from a click/tap handler (the Start button) before a session runs.
 */
class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private settings: Settings | null = null;

  configure(settings: Settings) {
    this.settings = settings;
    if (this.master) this.master.gain.value = settings.volume;
  }

  private context(): AudioContext {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.settings?.volume ?? 1;
      this.master.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  async unlock() {
    const ctx = this.context();
    if (ctx.state !== 'running') await ctx.resume().catch(() => {});
    // A silent buffer fully unlocks iOS Safari.
    const src = ctx.createBufferSource();
    src.buffer = ctx.createBuffer(1, 1, 22050);
    src.connect(ctx.destination);
    src.start(0);
    // Prime speech synthesis inside the gesture as well (iOS requirement).
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      speechSynthesis.speak(u);
    }
  }

  /** Decode recordings ahead of time so the first call isn't late. */
  async preload(cues: Cue[]) {
    await Promise.all(cues.map((c) => this.bufferFor(c).catch(() => null)));
  }

  private async bufferFor(cue: Cue): Promise<AudioBuffer | null> {
    if (cue.sound.type !== 'recording') return null;
    const id = cue.sound.audioId;
    const cached = this.buffers.get(id);
    if (cached) return cached;
    const blob = await loadAudio(id);
    if (!blob) return null;
    const buf = trimLeadingSilence(this.context(), await this.context().decodeAudioData(await blob.arrayBuffer()));
    this.buffers.set(id, buf);
    return buf;
  }

  forget(audioId: string) {
    this.buffers.delete(audioId);
  }

  async play(cue: Cue) {
    const s = cue.sound;
    if (s.type === 'voice') return this.speak(s.text || cue.name);
    if (s.type === 'beep') return this.beep(s.frequency, s.count);
    const buf = await this.bufferFor(cue);
    if (!buf) return this.speak(cue.name); // recording missing — fall back to voice
    const ctx = this.context();
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.master!);
    src.start();
  }

  speak(text: string) {
    if (!('speechSynthesis' in window)) return this.beep(660, 1);
    // Cancel anything still talking so a fast interval never queues up stale calls.
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voice = this.settings?.voiceURI
      ? speechSynthesis.getVoices().find((v) => v.voiceURI === this.settings!.voiceURI)
      : undefined;
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    }
    u.rate = this.settings?.speechRate ?? 1;
    u.volume = this.settings?.volume ?? 1;
    speechSynthesis.speak(u);
  }

  beep(frequency = 880, count = 1, duration = 0.12) {
    const ctx = this.context();
    for (let i = 0; i < count; i++) {
      const t = ctx.currentTime + i * (duration + 0.08);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.9, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      osc.connect(gain).connect(this.master!);
      osc.start(t);
      osc.stop(t + duration + 0.02);
    }
  }

  stopAll() {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }
}

export const audio = new AudioEngine();

/**
 * Recordings usually start with a moment of silence (the time between tapping
 * Record and speaking). For reaction drills that delay matters, so cut it off.
 */
function trimLeadingSilence(ctx: AudioContext, buf: AudioBuffer, threshold = 0.02): AudioBuffer {
  let start = buf.length;
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < Math.min(start, data.length); i++) {
      if (Math.abs(data[i]) > threshold) {
        start = i;
        break;
      }
    }
  }
  // Keep a few ms before the onset so the attack isn't clipped.
  start = Math.max(0, start - Math.floor(buf.sampleRate * 0.01));
  if (start === 0 || start >= buf.length) return buf;
  const out = ctx.createBuffer(buf.numberOfChannels, buf.length - start, buf.sampleRate);
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    out.copyToChannel(buf.getChannelData(ch).subarray(start), ch);
  }
  return out;
}

export function listVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!('speechSynthesis' in window)) return Promise.resolve([]);
  const voices = speechSynthesis.getVoices();
  if (voices.length) return Promise.resolve(voices);
  return new Promise((resolve) => {
    const done = () => resolve(speechSynthesis.getVoices());
    speechSynthesis.addEventListener('voiceschanged', done, { once: true });
    setTimeout(done, 1500);
  });
}
