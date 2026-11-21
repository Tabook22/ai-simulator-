import type { CSSProperties } from 'react';
import { formatNumber } from './vectors';

/** A vector drawn as eight bars around a zero line, each with its number. */
export function VecBars({ values, tone, label, testId }: { values: number[]; tone: string; label: string; testId?: string }) {
  return <div className="vx-bars" style={{ '--vx-tone': tone } as CSSProperties} data-testid={testId} role="img"
    aria-label={`${label}: ${values.map(formatNumber).join(', ')}`}>
    {values.map((value, d) => <div key={d} className="vx-bar">
      <span className="vx-num" dir="ltr">{formatNumber(value)}</span>
      <span className="vx-track">
        <i className={value >= 0 ? 'up' : 'down'} style={{ height: `${Math.min(50, Math.abs(value) / 1.6 * 50)}%`, animationDelay: `${d * 40}ms` }}/>
      </span>
      <small dir="ltr">d{d + 1}</small>
    </div>)}
  </div>;
}
