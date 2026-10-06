# Unpredict — audio cue trainer

A Progressive Web App that calls out cues (**Left**, **Right**, **Up**, **Back**, or anything you record) at fixed or random intervals, so you can train reactions without a coach. Built for basketball defensive slides, football breaks, tennis split-steps, boxing slips, agility ladders — any sport.

Works on phone or desktop, installs to the home screen, and runs fully offline. All data stays on your device.

## Features

- **Custom cues** — each cue has a name, symbol and colour, and a sound that is either
  - spoken by the device voice (any text),
  - **recorded with your microphone** (leading silence is trimmed automatically so calls aren't late),
  - an uploaded audio file, or
  - a beep (pitch and count configurable).
- **Routines** — pick which cues to use and how often each is called (weights), random or in-order, and cap repeats (e.g. never more than 2× Left in a row).
- **Timing** — fixed interval (every 2 s) or a random range (every 1.5–3 s) to kill anticipation.
- **Session structure** — rounds × round length with rest between, get-ready countdown with 3-2-1 beeps, or "run until I stop".
- **Player** — full-screen colour flash with a giant arrow/name (or audio-only mode), pause / skip / stop, vibration, and screen wake lock.
- **Backup** — export/import everything (including recordings) as a JSON file to move between devices.

## Development

```bash
npm install
npm run dev       # local dev server
npm test          # unit tests (scheduler logic)
npm run build     # typecheck + production build in dist/
npm run preview   # serve the production build
```

Stack: React + TypeScript + Vite, `vite-plugin-pwa` (Workbox service worker), IndexedDB via `idb-keyval`, Web Audio + Speech Synthesis.

## Deploying

The build is fully static with a relative base path, so `dist/` can be hosted anywhere (GitHub Pages, Netlify, Vercel, Cloudflare Pages…). HTTPS is required for installation, the microphone and the service worker.

A GitHub Pages workflow is included (`.github/workflows/deploy.yml`) and runs on every push to `main`. Enable it once under **Settings → Pages → Source: GitHub Actions**.

## Tips

- On iPhone, the ring/silent switch can mute web audio — flip it to ring for sessions.
- Keep the app in the foreground during a session; browsers throttle timers in background tabs. "Keep screen on" (Settings) prevents the phone from locking.
- Bluetooth speakers work well for outdoor drills.
