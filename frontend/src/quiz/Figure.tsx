/** Draws the picture for an image question from its spec. Pure SVG, so it is sharp, themeable and bilingual. */
import type { ReactNode } from 'react';
import { useTx } from '../FineTuneScenes';
import { tx } from './types';
import type { FigureSpec } from './types';

const fmt = (value: number) => (Math.round(value * 100) / 100).toString().replace('-', '−');

export function Figure({ spec }: { spec: FigureSpec }) {
  const say = useTx();
  const box = (w: number, h: number, body: ReactNode, label: string) =>
    <svg className="qz-fig" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label}>{body}</svg>;

  switch (spec.fig) {
    case 'neuron': {
      const n = spec.inputs.length, gap = 200 / (n + 1);
      return box(420, 220, <>
        {spec.inputs.map((value, i) => {
          const y = 10 + gap * (i + 1);
          return <g key={i}>
            <path d={`M70 ${y} C 150 ${y}, 170 110, 236 110`} className={spec.weights[i] < 0 ? 'wire neg' : 'wire'}/>
            <rect x="12" y={y - 14} width="46" height="28" rx="8" className="node"/><text x="35" y={y + 5} className="val">{fmt(value)}</text>
            <rect x="122" y={y + (110 - y) * 0.45 - 12} width="56" height="22" rx="11" className="tag"/>
            <text x="150" y={y + (110 - y) * 0.45 + 3} className="tagt">× {fmt(spec.weights[i])}</text>
          </g>;
        })}
        <line x1="280" y1="40" x2="280" y2="66" className="thin"/><rect x="238" y="14" width="84" height="26" rx="13" className="tag"/>
        <text x="280" y="32" className="tagt">b = {fmt(spec.bias)}</text>
        <circle cx="280" cy="110" r="44" className="soma"/><text x="280" y="122" className="sigma">Σ</text>
        <path d="M324 110 H 380" className="thin" markerEnd="url(#qz-arrow)"/><text x="400" y="116" className="val">?</text>
        <defs><marker id="qz-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" className="arrowhead"/></marker></defs>
      </>, 'neuron');
    }
    case 'loss': {
      const train = (t: number) => ({ overfit: 0.85 * Math.exp(-3.2 * t) + 0.1, underfit: 0.78 - 0.08 * t, good: 0.8 * Math.exp(-3 * t) + 0.16,
        'lr-high': 0.5 + 0.28 * Math.sin(t * 28) * (0.6 + t * 0.4), 'lr-low': 0.85 - 0.12 * t })[spec.shape];
      const val = (t: number) => ({ overfit: 0.85 * Math.exp(-3 * t) + 0.2 + Math.max(0, t - 0.45) * 0.9, underfit: 0.82 - 0.07 * t, good: 0.8 * Math.exp(-2.8 * t) + 0.22,
        'lr-high': 0.56 + 0.3 * Math.sin(t * 26 + 1) * (0.6 + t * 0.4), 'lr-low': 0.87 - 0.11 * t })[spec.shape];
      const X = (t: number) => 50 + t * 340, Y = (v: number) => 190 - v * 170;
      const line = (f: (t: number) => number) => Array.from({ length: 61 }, (_, i) => i / 60).map(t => `${X(t).toFixed(1)},${Y(Math.max(0, Math.min(1.05, f(t)))).toFixed(1)}`).join(' ');
      return box(420, 220, <>
        <line x1="50" y1="12" x2="50" y2="190" className="axis"/><line x1="50" y1="190" x2="400" y2="190" className="axis"/>
        <text x="225" y="212" className="lab">{say(tx(['epochs →', 'الحقب ←']))}</text><text x="18" y="100" className="lab" transform="rotate(-90 18 100)">{say(tx(['loss', 'الخسارة']))}</text>
        <polyline points={line(train)} className="curve a"/><polyline points={line(val)} className="curve b"/>
        <rect x="270" y="18" width="12" height="4" className="sw a"/><text x="288" y="24" className="leg">{say(tx(['training', 'التدريب']))}</text>
        <rect x="270" y="36" width="12" height="4" className="sw b"/><text x="288" y="42" className="leg">{say(tx(['validation', 'التحقق']))}</text>
      </>, 'loss curves');
    }
    case 'lora': {
      const s = 120;
      return box(420, 200, <>
        <rect x="20" y="30" width={s} height={s} className="frozen"/><text x="80" y="96" className="big">W</text>
        <text x="80" y="170" className="lab">{spec.d.toLocaleString('en')} × {spec.k.toLocaleString('en')} · {say(tx(['frozen', 'مجمدة']))}</text>
        <text x="160" y="96" className="big">+</text>
        <rect x="190" y="30" width="16" height={s} className="train"/><text x="198" y="170" className="lab">B</text>
        <text x="198" y="186" className="lab small">{spec.d.toLocaleString('en')} × {spec.r}</text>
        <text x="222" y="96" className="big">·</text>
        <rect x="240" y="80" width={s} height="16" className="train"/><text x="300" y="72" className="lab">A</text>
        <text x="300" y="116" className="lab small">{spec.r} × {spec.k.toLocaleString('en')}</text>
        <text x="300" y="150" className="lab">r = {spec.r}</text>
      </>, 'LoRA matrices');
    }
    case 'quant': {
      const levels = 2 ** spec.bits, xs = Array.from({ length: 22 }, (_, i) => -1 + (i + 0.5) * 2 / 22);
      const snap = (v: number) => { const step = 2 / (levels - 1); return -1 + Math.round((v + 1) / step) * step; };
      const X = (v: number) => 30 + (v + 1) * 180;
      return box(420, 180, <>
        <text x="210" y="22" className="lab">{say(tx(['original weights', 'الأوزان الأصلية']))}</text>
        {xs.map((v, i) => <circle key={i} cx={X(v)} cy="44" r="4" className="dot"/>)}
        {xs.map((v, i) => <line key={`l${i}`} x1={X(v)} y1="50" x2={X(snap(v))} y2="122" className="snap"/>)}
        <line x1="20" y1="130" x2="400" y2="130" className="axis"/>
        {Array.from({ length: levels }, (_, i) => -1 + i * 2 / (levels - 1)).map((v, i) => <rect key={i} x={X(v) - 6} y="124" width="12" height="12" rx="3" className="level"/>)}
        <text x="210" y="162" className="lab">{say(tx(['allowed levels', 'المستويات المسموحة']))}</text>
      </>, 'quantization levels');
    }
    case 'memory': {
      const max = Math.max(...spec.bars.map(bar => bar.gb), spec.limit) * 1.1, Y = (gb: number) => 180 - gb / max * 160;
      return box(420, 220, <>
        <line x1="40" y1="20" x2="40" y2="180" className="axis"/><line x1="40" y1="180" x2="410" y2="180" className="axis"/>
        {spec.bars.map((bar, i) => <g key={bar.label}>
          <rect x={60 + i * 88} y={Y(bar.gb)} width="56" height={180 - Y(bar.gb)} rx="4" className={bar.gb <= spec.limit ? 'bar ok' : 'bar no'}/>
          <text x={88 + i * 88} y={Y(bar.gb) - 6} className="lab">{bar.gb} GB</text>
          <text x={88 + i * 88} y="198" className="lab small">{bar.label}</text>
        </g>)}
        <line x1="40" y1={Y(spec.limit)} x2="410" y2={Y(spec.limit)} className="limit"/>
        <text x="404" y={Y(spec.limit) - 6} className="lab end">GPU {spec.limit} GB</text>
      </>, 'memory bars');
    }
    case 'activation': {
      const f = { relu: (x: number) => Math.max(0, x), sigmoid: (x: number) => 1 / (1 + Math.exp(-x)) * 2, step: (x: number) => x > 0 ? 2 : 0, linear: (x: number) => x / 2 + 1 }[spec.fn];
      const X = (x: number) => 210 + x * 50, Y = (y: number) => 165 - y * 48;
      const pts = Array.from({ length: 121 }, (_, i) => -3 + i * 0.05).map(x => `${X(x).toFixed(1)},${Y(f(x)).toFixed(1)}`).join(' ');
      return box(420, 190, <>
        <line x1="50" y1={Y(0)} x2="370" y2={Y(0)} className="axis"/><line x1={X(0)} y1="20" x2={X(0)} y2="176" className="axis"/>
        <text x="372" y={Y(0) + 16} className="lab">z</text><polyline points={pts} className="curve a"/>
      </>, 'activation function');
    }
    case 'confusion': {
      const n = spec.labels.length, c = 52, x0 = 150, y0 = 40, max = Math.max(...spec.cells.flat());
      return box(420, 60 + n * c + 30, <>
        <text x={x0 + n * c / 2} y="22" className="lab">{say(tx(['predicted', 'المتوقَّع']))}</text>
        {spec.labels.map((label, j) => <text key={`h${j}`} x={x0 + j * c + c / 2} y={y0 - 4} className="lab small">{label}</text>)}
        {spec.labels.map((label, i) => <text key={`r${i}`} x={x0 - 8} y={y0 + i * c + c / 2 + 4} className="lab end small">{label}</text>)}
        {spec.cells.map((row, i) => row.map((value, j) => <g key={`${i}-${j}`}>
          <rect x={x0 + j * c} y={y0 + i * c} width={c - 3} height={c - 3} rx="6" className={i === j ? 'cell diag' : 'cell'} style={{ opacity: 0.25 + 0.75 * value / max }}/>
          <text x={x0 + j * c + c / 2 - 1} y={y0 + i * c + c / 2 + 5} className="val">{value}</text></g>))}
        <text x="40" y={y0 + n * c / 2} className="lab" transform={`rotate(-90 40 ${y0 + n * c / 2})`}>{say(tx(['true', 'الحقيقي']))}</text>
      </>, 'confusion matrix');
    }
    case 'pipeline': {
      const n = spec.steps.length, w = 400 / n;
      return box(420, 110, <>
        {spec.steps.map((step, i) => <g key={i}>
          <rect x={10 + i * w} y="30" width={w - 16} height="48" rx="10" className={i === spec.missing ? 'stage miss' : 'stage'}/>
          {i === spec.missing ? <text x={10 + i * w + (w - 16) / 2} y="62" className="big">?</text> : (() => {
            // Long labels wrap onto two lines so they stay inside the box.
            const label = say(tx(step)), words = label.split(' '), cx = 10 + i * w + (w - 16) / 2;
            if (label.length <= 9 || words.length < 2) return <text x={cx} y="59" className="lab small">{label}</text>;
            const half = Math.ceil(words.length / 2);
            return <text x={cx} y="52" className="lab small"><tspan x={cx}>{words.slice(0, half).join(' ')}</tspan><tspan x={cx} dy="13">{words.slice(half).join(' ')}</tspan></text>;
          })()}
          {i < n - 1 && <text x={10 + (i + 1) * w - 8} y="59" className="lab">›</text>}
        </g>)}
      </>, 'pipeline');
    }
    case 'vectors': {
      const X = (v: number) => 30 + v * 3.6, Y = (v: number) => 190 - v * 1.7;
      return box(420, 210, <>
        <rect x="20" y="15" width="380" height="185" rx="12" className="space"/>
        {spec.points.map(point => <g key={point.label}><circle cx={X(point.x)} cy={Y(point.y)} r="8" className="dot"/>
          <text x={X(point.x) + 14} y={Y(point.y) + 5} className="lab">{point.label}</text></g>)}
        <text x={X(spec.query.x)} y={Y(spec.query.y) + 7} className="star">★</text>
      </>, 'vector map');
    }
    case 'chunks': {
      const w = 140, step = w * (spec.size - spec.overlap) / spec.size;
      return box(420, 150, <>
        {Array.from({ length: spec.total }, (_, i) => <g key={i}>
          <rect x={20 + i * step} y={30 + i * 26} width={w} height="22" rx="6" className="chunk"/>
          <text x={20 + i * step + w / 2} y={45 + i * 26} className="lab small">{say(tx([`chunk ${i + 1} · ${spec.size} tokens`, `مقطع ${i + 1} · ${spec.size} رمز`]))}</text>
          {i > 0 && <rect x={20 + i * step} y={30 + (i - 1) * 26} width={w - step} height={22 + 26} rx="4" className="overlap"/>}
        </g>)}
        <text x="210" y="138" className="lab">{say(tx(['shaded = shared text', 'المظلل = نص مشترك']))}</text>
      </>, 'chunks with overlap');
    }
    case 'box':
      return box(420, 220, <>
        <rect x="20" y="10" width="380" height="200" rx="12" className="photo"/>
        <path d="M200 190 C 190 140, 170 110, 150 80 M200 190 C 205 130, 230 100, 260 70 M200 150 C 220 130, 250 125, 280 120" className="branch"/>
        {[[150, 80], [260, 70], [280, 120], [180, 100], [235, 95]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="22" ry="12" className="leaf"/>)}
        <rect x="110" y="45" width="200" height="150" className={spec.confidence >= spec.threshold ? 'det ok' : 'det no'}/>
        <rect x="110" y="25" width="200" height="20" className={spec.confidence >= spec.threshold ? 'detlab ok' : 'detlab no'}/>
        <text x="210" y="40" className="detl">{spec.label} · {spec.confidence.toFixed(2)}</text>
        <text x="390" y="204" className="lab end small">threshold = {spec.threshold.toFixed(2)}</text>
      </>, 'detection');
    case 'matrix': {
      const c = 16, x0 = 60, y0 = 20, a = spec.adapter ?? 0;
      return box(420, 190, <>
        {Array.from({ length: spec.rows }, (_, i) => Array.from({ length: spec.cols }, (_, j) =>
          <rect key={`${i}-${j}`} x={x0 + j * c} y={y0 + i * c} width={c - 2} height={c - 2} rx="2" className="frozen"/>))}
        <text x={x0 + spec.cols * c / 2} y={y0 + spec.rows * c + 18} className="lab">W 🔒</text>
        {a > 0 && <>
          {Array.from({ length: spec.rows }, (_, i) => Array.from({ length: a }, (_, j) => <rect key={`b${i}-${j}`} x={230 + j * c} y={y0 + i * c} width={c - 2} height={c - 2} rx="2" className="train"/>))}
          <text x={230 + a * c / 2} y={y0 + spec.rows * c + 18} className="lab">B</text>
          {Array.from({ length: a }, (_, i) => Array.from({ length: spec.cols }, (_, j) => <rect key={`a${i}-${j}`} x={280 + j * 14} y={y0 + 40 + i * 14} width="12" height="12" rx="2" className="train"/>))}
          <text x={280 + spec.cols * 7} y={y0 + 40 + a * 14 + 16} className="lab">A</text>
        </>}
      </>, 'weight matrix');
    }
  }
}
