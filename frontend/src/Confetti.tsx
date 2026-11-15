import type { CSSProperties } from 'react';
import { useReducedMotion } from './anim';

const palette = ['#5ee7ff', '#a78bfa', '#5ef2a0', '#ffc46b', '#ff8f6b', '#ff8fd0'];

/** A short, non-blocking burst of confetti for a small classroom win. */
export function Confetti({ burst }: { burst: number }) {
  const reduced = useReducedMotion();
  if (burst === 0 || reduced) return null;
  return <div className="confetti" key={burst} aria-hidden="true">
    {Array.from({ length: 36 }, (_, index) => {
      const angle = (index / 36) * Math.PI * 2 + (index % 5) * 0.11;
      const distance = 130 + ((index * 53) % 180);
      const style = {
        '--x': `${(Math.cos(angle) * distance).toFixed(1)}px`,
        '--y': `${(Math.sin(angle) * distance - 70).toFixed(1)}px`,
        '--spin': `${(index % 2 ? 1 : -1) * (200 + index * 17)}deg`,
        '--delay': `${(index % 6) * 20}ms`,
        '--tint': palette[index % palette.length],
        '--size': `${5 + (index % 4) * 2}px`,
      } as CSSProperties;
      return <span key={index} style={style}/>;
    })}
  </div>;
}
