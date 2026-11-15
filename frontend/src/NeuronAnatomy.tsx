import { activationSlope, activations, applyActivation, format } from './model';
import type { Activation, Trace } from './model';
import { ForwardStep } from './ForwardPlayback';

/** The activation rule drawn as a curve, with a marker where this neuron sits on it. */
export function ActivationCurve({ activation, z, width = 300, height = 132, bare = false }: {
  activation: Activation; z?: number; width?: number; height?: number;
  /** Only the curve and the marker, for use inside another drawing. */
  bare?: boolean;
}) {
  const marked = z !== undefined && Number.isFinite(z);
  const reach = Math.min(12, Math.max(4, marked ? Math.ceil(Math.abs(z)) + 1 : 4));
  const shown = marked ? Math.max(-reach, Math.min(reach, z)) : 0;
  const samples = Array.from({ length: 61 }, (_, index) => -reach + (2 * reach * index) / 60);
  const outputs = samples.map(value => applyActivation(activation, value));
  const low = Math.min(0, ...outputs);
  const high = Math.max(1, ...outputs);
  const pad = bare ? 4 : 16;
  const left = bare ? 4 : 30;
  const x = (value: number) => left + ((value + reach) / (2 * reach)) * (width - left - pad);
  const y = (value: number) => height - pad - ((value - low) / (high - low)) * (height - 2 * pad);
  const points = samples.map((value, index) => `${x(value).toFixed(1)},${y(outputs[index]).toFixed(1)}`).join(' ');
  const output = applyActivation(activation, shown);
  const curve = <>
    <line className="curve-axis" x1={x(-reach)} x2={x(reach)} y1={y(0)} y2={y(0)}/>
    <line className="curve-axis" x1={x(0)} x2={x(0)} y1={y(low)} y2={y(high)}/>
    <polyline className="curve-line" points={points}/>
    {marked && <>
      {!bare && <>
        <line className="curve-guide" x1={x(shown)} x2={x(shown)} y1={y(0)} y2={y(output)}/>
        <line className="curve-guide" x1={x(0)} x2={x(shown)} y1={y(output)} y2={y(output)}/>
      </>}
      <circle className="curve-marker" cx={x(shown)} cy={y(output)} r={bare ? 3.2 : 4.5}/>
    </>}
  </>;
  if (bare) return <g className="activation-curve bare">{curve}</g>;
  return <svg className="activation-curve" viewBox={`0 0 ${width} ${height}`} role="img"
    aria-label={`${activations[activation].name} curve${marked ? `. This neuron is at z ${format(z)}, output ${format(applyActivation(activation, z))}` : ''}`}>
    {curve}
    <text className="curve-tick" x={x(-reach)} y={y(0) + 11} textAnchor="start">{-reach}</text>
    <text className="curve-tick" x={x(reach)} y={y(0) + 11} textAnchor="end">{reach}</text>
    <text className="curve-tick" x={x(0) - 4} y={y(high) + 4} textAnchor="end">{format(high)}</text>
    {low < 0 && <text className="curve-tick" x={x(0) - 4} y={y(low)} textAnchor="end">{format(low)}</text>}
    <text className="curve-name" x={width - pad} y={y(0) - 6} textAnchor="end">z →</text>
    <text className="curve-name" x={left - 22} y={11}>output</text>
  </svg>;
}

/** What the activation does to this neuron, and why its slope matters for learning. */
export function ActivationInsight({ activation, z }: { activation: Activation; z?: number }) {
  const info = activations[activation];
  const slope = z === undefined ? undefined : activationSlope(activation, z);
  return <div className="activation-insight">
    <ActivationCurve activation={activation} z={z}/>
    <p>{info.idea} Its output is {info.range}.</p>
    {z !== undefined && slope !== undefined && <p className="activation-slope">
      <span className="math">Slope at the dot: <strong>{format(slope)}</strong></span> <small>(rule: {info.slope})</small>.
      {slope === 0
        ? ' The curve is flat at this point, so during training no error passes back through this neuron: it cannot learn until its total becomes positive.'
        : ' The slope is how steep the curve is at the dot. Backpropagation multiplies the error by this number on the way back.'}
    </p>}
  </div>;
}

const MAX_ROWS = 4;

/**
 * One neuron as a picture: inputs × weights → Σ → + bias → activation → output.
 * `step` follows the forward-pass animation; without it every value is shown.
 */
export function NeuronAnatomy({ trace, weights, bias, activation, step }: {
  trace: Trace | undefined;
  /** The weights and bias as currently typed, which may be newer than the last run. */
  weights: (number | string)[];
  bias: number | string;
  activation: Activation;
  step?: number;
}) {
  const reached = (stage: number) => step === undefined || step >= stage;
  const lit = (stage: number) => step === stage ? ' lit' : '';
  const total = weights.length;
  const rows = total > MAX_ROWS ? MAX_ROWS - 1 : total;
  const more = total - rows;
  const slots = rows + (more > 0 ? 1 : 0);
  const gap = slots <= 2 ? 44 : 32;
  const height = Math.max(132, (slots - 1) * gap + 78);
  const middle = (height - 26) / 2 + 4;
  const rowY = (index: number) => middle + (index - (slots - 1) / 2) * gap;
  const number = (value: number | string | undefined) => {
    const parsed = value === undefined || String(value).trim() === '' ? NaN : Number(value);
    return Number.isFinite(parsed) ? format(parsed) : '?';
  };
  const sum = trace && reached(ForwardStep.Sum) ? format(trace.sum) : '?';
  const z = trace && reached(ForwardStep.Bias) ? format(trace.z) : '?';
  const output = trace && reached(ForwardStep.Activate) ? format(trace.output) : '?';
  const fit = (label: string) => label.length > 6 ? { fontSize: 8.5 } : label.length > 4 ? { fontSize: 10 } : undefined;
  return <figure className="neuron-anatomy">
    <svg viewBox={`0 0 332 ${height}`} role="img"
      aria-label={`Neuron anatomy: ${total} ${total === 1 ? 'input' : 'inputs'} are multiplied by their weights, added to ${sum}, the bias ${number(bias)} gives z ${z}, and ${activations[activation].name} gives the output ${output}.`}>
      <defs>
        <marker id="anatomy-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto">
          <path d="M0 0 8 4 0 8z"/>
        </marker>
      </defs>
      {Array.from({ length: rows }, (_, index) => {
        const y = rowY(index);
        const weight = Number(weights[index]);
        const sign = weight < 0 ? ' negative' : weight === 0 ? ' zero' : '';
        const value = number(trace?.inputs[index]);
        const label = `× ${number(weights[index])}`;
        return <g key={index}>
          <path className={`anatomy-wire${sign}${lit(ForwardStep.Multiply)}`} d={`M 50 ${y} C 90 ${y}, 100 ${middle}, 130 ${middle}`}/>
          <g className={`anatomy-input${lit(ForwardStep.Move)}`}>
            <rect x="2" y={y - 12} width="48" height="24" rx="8"/>
            <text x="26" y={y + 4} style={fit(value)}>{value}</text>
          </g>
          <g className={`anatomy-weight${lit(ForwardStep.Multiply)}`}>
            <rect x={90 - label.length * 3.1 - 4} y={(y + middle) / 2 - 8} width={label.length * 6.2 + 8} height="16" rx="6"/>
            <text x="90" y={(y + middle) / 2 + 3.5}>{label}</text>
          </g>
        </g>;
      })}
      {more > 0 && <text className="anatomy-more" x="26" y={rowY(rows) + 4}>+{more} more</text>}
      <g className={`anatomy-bias${lit(ForwardStep.Bias)}`}>
        <path className="anatomy-wire" d={`M 152 ${height - 36} V ${middle + 24}`} markerEnd="url(#anatomy-arrow)"/>
        <rect x="122" y={height - 36} width="60" height="18" rx="7"/>
        <text x="152" y={height - 23.5}>bias {number(bias)}</text>
      </g>
      <g className={`anatomy-sum${lit(ForwardStep.Sum)}`}>
        <circle cx="152" cy={middle} r="22"/>
        <text className="anatomy-sigma" x="152" y={middle - 6}>Σ</text>
        <text x="152" y={middle + 10} style={fit(sum)}>{sum}</text>
      </g>
      <path className={`anatomy-wire flow${lit(ForwardStep.Bias)}`} d={`M 175 ${middle} H 204`} markerEnd="url(#anatomy-arrow)"/>
      <text className={`anatomy-z${lit(ForwardStep.Bias)}`} x="190" y={middle - 8}>z={z}</text>
      <g className={`anatomy-rule${lit(ForwardStep.Activate)}`}>
        <rect x="206" y={middle - 22} width="52" height="44" rx="9"/>
        <svg x="208" y={middle - 20} width="48" height="40" viewBox="0 0 48 40">
          <ActivationCurve activation={activation} width={48} height={40} bare
            z={trace && reached(ForwardStep.Activate) ? trace.z : undefined}/>
        </svg>
      </g>
      <path className={`anatomy-wire flow${lit(ForwardStep.Pass)}`} d={`M 259 ${middle} H 280`} markerEnd="url(#anatomy-arrow)"/>
      <g className={`anatomy-output${lit(ForwardStep.Pass)}${lit(ForwardStep.Activate)}`}>
        <circle cx="304" cy={middle} r="21"/>
        <text x="304" y={middle + 4} style={fit(output)}>{output}</text>
      </g>
      <g className="anatomy-captions">
        <text x="26" y={height - 4}>inputs</text>
        <text x="90" y={height - 4}>× weights</text>
        <text x="152" y={height - 4}>add</text>
        <text x="232" y={height - 4}>{activations[activation].name}</text>
        <text x="304" y={height - 4}>output</text>
      </g>
    </svg>
    <figcaption>Read left to right: each input is multiplied by its weight, the products are added, the bias shifts the total to z, and the activation turns z into the output.</figcaption>
  </figure>;
}
