import type { ReactNode } from 'react';
import type { Numeric } from './model';

const paths = {
  monitor: <><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/></>,
  book: <><path d="M4 5c3-1 6 0 8 2 2-2 5-3 8-2v14c-3-1-6 0-8 2-2-2-5-3-8-2z"/><path d="M12 7v14"/></>,
  sliders: <><path d="M5 3v4m0 4v10m7-18v10m0 4v4m7-18v4m0 4v10"/><path d="M3 7h4v4H3zm7 6h4v4h-4zm7-6h4v4h-4z"/></>,
  network: <><circle cx="5" cy="6" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="19" cy="12" r="2"/><path d="m7 7 10 4M7 17l10-4"/></>,
  target: <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/></>,
  arrow: <path d="M4 12h15m-6-6 6 6-6 6"/>,
  next: <path d="m9 6 6 6-6 6"/>,
  previous: <path d="m15 6-6 6 6 6"/>,
  down: <path d="m6 9 6 6 6-6"/>,
  reset: <><path d="M4 12a8 8 0 1 1 2 5m-2-5V5m0 7h7"/></>,
  play: <path d="m8 5 11 7-11 7z" fill="currentColor" strokeLinejoin="round"/>,
  pause: <path d="M9 5v14m6-14v14" strokeWidth="3"/>,
  layers: <><path d="m12 3 9 5-9 5-9-5zm-9 9 9 5 9-5m-18 4 9 5 9-5"/></>,
  flask: <path d="M9 3h6m-5 0v7l-5 8a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-8V3m-6 11h8"/>,
  check: <path d="m5 12 4 4L19 6"/>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
  plus: <path d="M12 5v14M5 12h14"/>,
  minus: <path d="M5 12h14"/>,
  dice: <><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01" strokeWidth="3"/></>,
  bulb: <><path d="M8 15a6 6 0 1 1 8 0l-1 2H9zm2 6h4m-4-4v2h4v-2"/></>,
  trash: <path d="M4 7h16m-14 0 1 14h10l1-14M9 7V4h6v3m-5 4v6m4-6v6"/>,
  sparkle: <><path d="M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6L4.8 10.7 10.3 9z"/><path d="M19 16.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/></>,
  trophy: <><path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 5H5v2a3 3 0 0 0 3 3m8-5h3v2a3 3 0 0 1-3 3"/><path d="M12 13v4m-4 3h8m-6 0v-2h4v2"/></>,
  gauge: <><path d="M4 18a8 8 0 1 1 16 0"/><path d="m12 18 4-6"/><circle cx="12" cy="18" r="1.6" fill="currentColor"/></>,
  clock: <><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></>,
  bolt: <path d="M13 3 5 14h6l-1 7 8-11h-6z"/>,
  sparkles: <><path d="M7 4l1 2.6L10.6 8 8 9l-1 2.6L6 9 3.4 8 6 6.6z"/><path d="M16.5 11l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9z"/></>,
  library: <><path d="M4 4h4v16H4zm6 0h4v16h-4z"/><path d="m16.5 5 3.5-1 4 15-3.5 1z"/></>,
  file: <><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/></>,
  mic: <><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></>,
  bookmark: <path d="M6 3h12v18l-6-4-6 4z"/>,
  external: <><path d="M14 4h6v6M20 4l-9 9"/><path d="M9 5H5v14h14v-4"/></>,
  search: <><circle cx="11" cy="11" r="6"/><path d="m20 20-4-4"/></>,
  print: <><path d="M6 9V3h12v6M6 18H4V9h16v9h-2"/><path d="M6 14h12v7H6z"/></>,
  expand: <><path d="M9 3H3v6M15 3h6v6M21 15v6h-6M3 15v6h6"/></>,
  compress: <><path d="M9 9H3V3M15 9h6V3M21 15h-6v6M3 15h6v6"/></>,
  help: <><circle cx="12" cy="12" r="8.5"/><path d="M9.6 9a2.5 2.5 0 1 1 4.2 1.9c-.8.6-1.4 1-1.4 2.1"/><path d="M12 16.5h.01" strokeWidth="2.4"/></>,
  home: <><path d="M3 11 12 3l9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></>,
  chart: <><path d="M4 20V10m5 10V4m5 16v-7m5 7V7"/></>,
  chip: <><rect x="7" y="7" width="10" height="10" rx="2"/><path d="M9 3v4m6-4v4M9 17v4m6-4v4M3 9h4m-4 6h4m10-6h4m-4 6h4"/></>,
  copy: <><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></>,
  download: <><path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M4 19h16"/></>,
  code: <><path d="m8 7-5 5 5 5m8-10 5 5-5 5"/></>,
  grid: <><rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/></>,
  refresh: <><path d="M20 12a8 8 0 1 1-2-5"/><path d="M20 5v7h-7"/></>,
  grip: <><circle cx="9" cy="6" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1.2" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1.2" fill="currentColor" stroke="none"/></>,
};

export type IconName = keyof typeof paths;

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export function PanelTitle({ icon, children, aside }: {
  icon: IconName; children: ReactNode; aside?: ReactNode;
}) {
  return <div className="panel-title">
    <h2><span className="panel-icon"><Icon name={icon} size={17}/></span>{children}</h2>
    {aside}
  </div>;
}

export function NumberField({ label, value, onChange, disabled, className }: {
  label: string; value: Numeric; onChange: (value: string) => void; disabled?: boolean; className?: string;
}) {
  return <input className={className} type="text" inputMode="decimal" aria-label={label}
    value={value} onChange={event => onChange(event.target.value)} disabled={disabled} spellCheck={false} />;
}

export function Stepper({ label, value, min, max, onChange, disabled, aside }: {
  label: string; value: number; min: number; max: number; onChange: (value: number) => void; disabled: boolean;
  aside?: ReactNode;
}) {
  return <div className="stepper-row">
    <span className="stepper-label">{aside}{label}</span>
    <div className="stepper">
      <button type="button" aria-label={`Fewer ${label.toLowerCase()}`} disabled={disabled || value <= min}
        onClick={() => onChange(value - 1)}><Icon name="minus" size={13}/></button>
      <span aria-label={`${label} count`}>{value}</span>
      <button type="button" aria-label={`More ${label.toLowerCase()}`} disabled={disabled || value >= max}
        onClick={() => onChange(value + 1)}><Icon name="plus" size={13}/></button>
    </div>
  </div>;
}
