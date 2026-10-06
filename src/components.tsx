import type { ReactNode } from 'react';
import { href, type Route } from './lib/router';

export function TopBar({ title, back, right }: { title: string; back?: Route; right?: ReactNode }) {
  return (
    <header className="topbar">
      {back ? (
        <a className="icon-btn" href={href(back)} aria-label="Back">
          ‹
        </a>
      ) : (
        <span className="icon-btn placeholder" />
      )}
      <h1>{title}</h1>
      <div className="topbar-right">{right}</div>
    </header>
  );
}

export function BottomNav({ active }: { active: 'home' | 'cues' | 'settings' }) {
  const item = (name: typeof active, label: string, icon: string) => (
    <a className={`nav-item ${active === name ? 'active' : ''}`} href={href({ name })}>
      <span className="nav-icon">{icon}</span>
      {label}
    </a>
  );
  return (
    <nav className="bottomnav">
      {item('home', 'Routines', '▶')}
      {item('cues', 'Sounds', '♪')}
      {item('settings', 'Settings', '⚙')}
    </nav>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max = 3600,
  step = 1,
  unit,
  hint,
}: {
  label: string;
  value: number;
  onChange(v: number): void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  hint?: string;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v * 100) / 100));
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="stepper">
        <button type="button" onClick={() => onChange(clamp(value - step))} aria-label={`Decrease ${label}`}>
          −
        </button>
        <input
          type="number"
          inputMode="decimal"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!Number.isNaN(v)) onChange(clamp(v));
          }}
        />
        {unit && <span className="unit">{unit}</span>}
        <button type="button" onClick={() => onChange(clamp(value + step))} aria-label={`Increase ${label}`}>
          +
        </button>
      </div>
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange(v: boolean): void;
  hint?: string;
}) {
  return (
    <label className="toggle-row">
      <span>
        <span className="field-label">{label}</span>
        {hint && <span className="field-hint">{hint}</span>}
      </span>
      <input type="checkbox" className="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange(v: T): void;
}) {
  return (
    <div className="segmented" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={value === o.value ? 'on' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function CueBadge({ symbol, color, size = 44 }: { symbol: string; color: string; size?: number }) {
  return (
    <span className="cue-badge" style={{ background: color, width: size, height: size, fontSize: size * 0.5 }}>
      {symbol}
    </span>
  );
}
