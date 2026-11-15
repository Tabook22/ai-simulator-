import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import './examples.css';
import { activations, format } from './model';
import type { Activation } from './model';
import { examplesApi } from './examples';
import type { ExampleSummary, ExampleTrace, WorkedExample } from './examples';
import { Icon, PanelTitle } from './ui';

const num = (value: number | string) => {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return String(value);
  return Object.is(number, -0) ? '0' : format(number);
};

function nodeName(layer: number, neuron: number, count: number) {
  if (layer < 0) return `x${neuron + 1}`;
  return layer === count - 1 ? `y${neuron + 1}` : `h${layer + 1}.${neuron + 1}`;
}

const inputName = (layer: number, neuron: number, count: number) => nodeName(layer - 1, neuron, count);
const activationName = (activation: Activation) => activations[activation].name;
const activationEquation = (activation: Activation) => activations[activation].equation;

function activationNote(activation: Activation) {
  if (activation === 'relu') return 'ReLU keeps positive totals and clamps negative totals to zero. Its slope is 1 above zero and 0 below it.';
  if (activation === 'sigmoid') return 'Sigmoid squashes the total between 0 and 1. Its slope is always below 0.25, so it shrinks the error.';
  if (activation === 'tanh') return 'Tanh squashes the total between −1 and 1 and is zero-centred.';
  return 'A linear neuron passes the total through unchanged, so its slope is 1.';
}

type Phase = 'setup' | 'forward' | 'backward' | 'update' | 'done';
type FlowMode = 'auto' | 'both' | 'forward' | 'backward';

const FLOW_MODES: { value: FlowMode; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'both', label: 'Both' },
  { value: 'forward', label: 'Forward' },
  { value: 'backward', label: 'Backward' },
];

interface Step {
  phase: Phase;
  kind: string;
  layer: number | null;
  title: string;
  lines: string[];
  table?: { headers: string[]; rows: string[][] };
  note: string;
  showGradients?: boolean;
}

function gradientTable(trace: ExampleTrace, index: number, count: number) {
  const layer = trace.forward.layers[index];
  const back = trace.backward.layers[index];
  const rows: string[][] = [];
  layer.weights.forEach((row, neuron) => {
    row.forEach((_, source) => {
      rows.push([
        `w${source + 1} (${inputName(index, source, count)} → ${nodeName(index, neuron, count)})`,
        `${num(back.deltas[neuron])} × ${num(layer.inputs[source])}`,
        num(back.weight_gradients[neuron][source]),
      ]);
    });
    rows.push([
      `bias (${nodeName(index, neuron, count)})`,
      `${num(back.deltas[neuron])} × 1`,
      num(back.bias_gradients[neuron]),
    ]);
  });
  return { headers: ['Parameter', 'δ × input', 'gradient'], rows };
}

function updateTable(trace: ExampleTrace, count: number) {
  const rows: string[][] = [];
  trace.network.layers.forEach((layer, index) => {
    const back = trace.backward.layers[index];
    layer.weights.forEach((row, neuron) => row.forEach((weight, source) => {
      rows.push([
        `w${source + 1} (${inputName(index, source, count)} → ${nodeName(index, neuron, count)})`,
        num(weight),
        num(back.weight_gradients[neuron][source]),
        num(trace.updated.network.layers[index].weights[neuron][source]),
      ]);
    }));
    layer.biases.forEach((bias, neuron) => {
      rows.push([
        `bias (${nodeName(index, neuron, count)})`,
        num(bias),
        num(back.bias_gradients[neuron]),
        num(trace.updated.network.layers[index].biases[neuron]),
      ]);
    });
  });
  return { headers: ['Parameter', 'Old', 'Gradient', 'New'], rows };
}

function buildSteps(example: WorkedExample): Step[] {
  const trace = example.trace;
  const count = trace.forward.layers.length;
  const target = trace.targets[0];
  const prediction = trace.forward.prediction[0];
  const steps: Step[] = [
    {
      phase: 'setup', kind: 'setup', layer: null,
      title: 'The setup',
      lines: [
        `inputs = ${trace.network.inputs.map(num).join(', ')}`,
        `target = ${num(target)}`,
        `learning rate = ${num(trace.learning_rate)}`,
      ],
      table: {
        headers: ['Layer', 'Neurons', 'Activation'],
        rows: trace.forward.layers.map((layer, index) => [
          `Layer ${index + 1}`, String(layer.weights.length), activationName(layer.activation),
        ]),
      },
      note: example.focus,
    },
  ];

  trace.forward.layers.forEach((layer, index) => {
    steps.push({
      phase: 'forward', kind: 'sum', layer: index,
      title: `Forward · layer ${index + 1}: weighted sum`,
      lines: ['z = Σ (input × weight) + bias'],
      table: {
        headers: ['Neuron', 'Calculation', 'z'],
        rows: layer.weights.map((row, neuron) => {
          const products = row.map((weight, source) => `${num(layer.inputs[source])} × ${num(weight)}`);
          return [
            nodeName(index, neuron, count),
            `${products.join(' + ')} + ${num(layer.biases[neuron])}`,
            num(layer.z[neuron]),
          ];
        }),
      },
      note: 'Multiply every incoming value by its weight, add the products together, then add the bias.',
    });
    steps.push({
      phase: 'forward', kind: 'activation', layer: index,
      title: `Forward · layer ${index + 1}: ${activationName(layer.activation)}`,
      lines: [activationEquation(layer.activation)],
      table: {
        headers: ['Neuron', 'z', 'f(z) = output'],
        rows: layer.z.map((z, neuron) => [nodeName(index, neuron, count), num(z), num(layer.outputs[neuron])]),
      },
      note: activationNote(layer.activation),
    });
  });

  steps.push({
    phase: 'forward', kind: 'loss', layer: count - 1,
    title: 'Prediction and loss',
    lines: [
      `prediction = ${num(prediction)}`,
      `target = ${num(target)}`,
      `loss = (prediction − target)² = (${num(prediction)} − ${num(target)})² = ${num(trace.loss)}`,
    ],
    note: 'Mean squared error for this one example. Backpropagation starts here, at the loss.',
  });

  const outputIndex = count - 1;
  const outputLayer = trace.forward.layers[outputIndex];
  const outputBack = trace.backward.layers[outputIndex];
  steps.push({
    phase: 'backward', kind: 'output-delta', layer: outputIndex,
    title: 'Backward · the error at the output',
    lines: [
      `∂L/∂prediction = 2 × (prediction − target) = ${num(trace.output_gradient[0])}`,
      `slope = f′(z) = ${num(outputLayer.slopes[0])}`,
      `δ = ∂L/∂prediction × slope = ${num(outputBack.deltas[0])}`,
    ],
    note: 'The chain rule starts at the loss: multiply the error at the output by the activation slope.',
  });
  steps.push({
    phase: 'backward', kind: 'output-grad', layer: outputIndex, showGradients: true,
    title: `Backward · gradients for layer ${outputIndex + 1}`,
    lines: ['∂L/∂w = δ × input', '∂L/∂b = δ'],
    table: gradientTable(trace, outputIndex, count),
    note: 'Each weight knows the error δ and the input it multiplied. Their product is the weight gradient.',
  });

  for (let index = count - 2; index >= 0; index--) {
    const layer = trace.forward.layers[index];
    const nextLayer = trace.forward.layers[index + 1];
    const nextBack = trace.backward.layers[index + 1];
    const back = trace.backward.layers[index];
    steps.push({
      phase: 'backward', kind: 'hidden-error', layer: index,
      title: `Backward · error arriving at layer ${index + 1}`,
      lines: ['∂L/∂a = W(next)ᵀ · δ(next)'],
      table: {
        headers: ['Neuron', 'Calculation', '∂L/∂a'],
        rows: layer.weights.map((_, neuron) => {
          const weights = nextLayer.weights.map(row => row[neuron]);
          const parts = weights.map((weight, neuronNext) => `${num(weight)} × ${num(nextBack.deltas[neuronNext])}`);
          return [nodeName(index, neuron, count), parts.join(' + '), num(nextBack.input_gradient[neuron])];
        }),
      },
      note: 'The output error is sent back through every outgoing weight, so each hidden neuron receives its own share.',
    });
    steps.push({
      phase: 'backward', kind: 'hidden-delta', layer: index,
      title: `Backward · delta for layer ${index + 1}`,
      lines: ['δ = (∂L/∂a) × f′(z)'],
      table: {
        headers: ['Neuron', 'error arriving', 'slope', 'δ'],
        rows: layer.z.map((_, neuron) => [
          nodeName(index, neuron, count),
          num(nextBack.input_gradient[neuron]),
          num(layer.slopes[neuron]),
          num(back.deltas[neuron]),
        ]),
      },
      note: layer.slopes.some(slope => slope === 0)
        ? 'A slope of zero stops the chain rule. That neuron gets no delta and no gradient.'
        : 'Multiply each arriving error by the local slope to get that neuron\'s delta.',
    });
    steps.push({
      phase: 'backward', kind: 'hidden-grad', layer: index, showGradients: true,
      title: `Backward · gradients for layer ${index + 1}`,
      lines: ['∂L/∂w = δ × input', '∂L/∂b = δ'],
      table: gradientTable(trace, index, count),
      note: 'Every weight and bias in this layer now has its gradient, ready for the update.',
    });
  }

  steps.push({
    phase: 'update', kind: 'update', layer: null,
    title: 'Update every parameter',
    lines: [
      `new = old − learning rate × gradient`,
      `learning rate = ${num(trace.learning_rate)}`,
    ],
    table: updateTable(trace, count),
    note: 'One gradient-descent step. Every parameter moves a little against its gradient.',
  });
  steps.push({
    phase: 'done', kind: 'done', layer: null,
    title: 'After one step',
    lines: [
      `prediction ${num(prediction)} → ${num(trace.updated.forward.prediction[0])}`,
      `loss ${num(trace.loss)} → ${num(trace.updated.loss)}`,
    ],
    note: trace.updated.loss < trace.loss
      ? 'The loss went down. Repeat the same two passes and the network keeps improving.'
      : 'The loss did not move. With zero gradients the update cannot change anything — this is the switched-off ReLU problem.',
  });
  return steps;
}

function phaseLabel(phase: Phase) {
  if (phase === 'forward') return 'Forward pass';
  if (phase === 'backward') return 'Backpropagation';
  if (phase === 'update') return 'Weight update';
  if (phase === 'done') return 'Result';
  return 'The setup';
}

function phaseClass(phase: Phase) {
  if (phase === 'forward') return 'ready-badge';
  if (phase === 'backward') return 'accent-badge';
  if (phase === 'done') return 'ready-badge';
  return 'neutral-badge';
}

function ExampleNet({ example, step, flowMode, flowSpeed, paused, onFlipFlow }: {
  example: WorkedExample;
  step: Step;
  flowMode: FlowMode;
  flowSpeed: number;
  paused: boolean;
  onFlipFlow: () => void;
}) {
  const trace = example.trace;
  const updatedMode = step.phase === 'update' || step.phase === 'done';
  const layers = updatedMode ? trace.updated.forward.layers : trace.forward.layers;
  const network = updatedMode ? trace.updated.network : trace.network;
  const count = layers.length;
  const sizes = [network.inputs.length, ...layers.map(layer => layer.weights.length)];
  const columns = sizes.length;
  const height = Math.max(300, Math.max(...sizes) * 82 + 110);
  const width = Math.max(520, 120 + (columns - 1) * 170);
  const x = (column: number) => 74 + column * 170;
  const y = (column: number, neuron: number) => height / 2 + (neuron - (sizes[column] - 1) / 2) * 78;
  const backward = step.phase === 'backward';
  const showForward = flowMode === 'both' || flowMode === 'forward'
    || (flowMode === 'auto' && step.phase === 'forward');
  const showBackward = flowMode === 'both' || flowMode === 'backward'
    || (flowMode === 'auto' && step.phase === 'backward');
  const laneStyle = { '--lane-duration': `${(1.9 / flowSpeed).toFixed(2)}s` } as CSSProperties;

  const allEdges = step.phase === 'update' || step.phase === 'done';
  const edgeLayer = allEdges ? null
    : step.kind === 'hidden-error' ? (step.layer ?? 0) + 1
      : step.kind === 'sum' || step.kind === 'activation' || step.kind === 'output-grad' || step.kind === 'hidden-grad'
        ? step.layer
        : null;
  const dots = allEdges || edgeLayer !== null;
  const laneLayer = step.kind === 'setup' ? 0 : edgeLayer;

  const values = (column: number) => column === 0 ? network.inputs : layers[column - 1].outputs;
  const badgeFor = (column: number) => {
    if (!backward || column === 0 || step.layer === null) return null;
    const layerIndex = column - 1;
    if (step.kind === 'hidden-error' && layerIndex === step.layer) {
      return { label: '∂L/∂a', values: trace.backward.layers[layerIndex + 1].input_gradient };
    }
    if ((step.kind === 'output-delta' || step.kind === 'hidden-delta'
      || step.kind === 'output-grad' || step.kind === 'hidden-grad') && layerIndex === step.layer) {
      return { label: 'delta', values: trace.backward.layers[layerIndex].deltas };
    }
    return null;
  };

  return <div className="example-net-wrap">
    <svg className={`example-net ${backward ? 'backward' : ''} ${paused ? 'paused' : ''}`} viewBox={`0 0 ${width} ${height}`}
      style={laneStyle}
      role="img" aria-label="Worked network. Gold arrows show the forward data flow; green arrows show the backward error flow. Values are inside the neurons; gradients appear when the backward pass reaches them.">
      <defs>
        <radialGradient id="ex-in" cx="36%" cy="28%" r="78%">
          <stop offset="0%" stopColor="#c8f8ff"/><stop offset="50%" stopColor="#39c9f5"/><stop offset="100%" stopColor="#1769b8"/>
        </radialGradient>
        <radialGradient id="ex-hid" cx="36%" cy="28%" r="78%">
          <stop offset="0%" stopColor="#e4d8ff"/><stop offset="50%" stopColor="#9e7bff"/><stop offset="100%" stopColor="#5739c4"/>
        </radialGradient>
        <radialGradient id="ex-out" cx="36%" cy="28%" r="78%">
          <stop offset="0%" stopColor="#fff0cf"/><stop offset="50%" stopColor="#ffbf5e"/><stop offset="100%" stopColor="#c46a1a"/>
        </radialGradient>
      </defs>
      {layers.map((layer, layerIndex) => layer.weights.map((row, neuron) => row.map((weight, source) => {
        const x1 = x(layerIndex) + 26;
        const x2 = x(layerIndex + 1) - 26;
        const y1 = y(layerIndex, source);
        const y2 = y(layerIndex + 1, neuron);
        const bend = (x2 - x1) * 0.45;
        const path = `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`;
        const gradient = trace.backward.layers[layerIndex].weight_gradients[neuron][source];
        const showGradient = Boolean(step.showGradients) && step.layer === layerIndex;
        const label = showGradient ? num(gradient) : num(weight);
        const activeEdge = allEdges || edgeLayer === layerIndex;
        const sign = (showGradient ? gradient : weight) < 0 ? 'negative' : (showGradient ? gradient : weight) === 0 ? 'zero' : 'positive';
        const labelWidth = Math.max(30, label.length * 6.5 + 12);
        const middleX = (x1 + x2) / 2;
        const middleY = (y1 + y2) / 2;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const span = Math.hypot(dx, dy) || 1;
        const nx = -dy / span;
        const ny = dx / span;
        const laneOffset = 15;
        const lanePath = (offset: number) => {
          const ox = nx * offset;
          const oy = ny * offset;
          return `M ${x1 + ox} ${y1 + oy} C ${x1 + bend + ox} ${y1 + oy}, ${x2 - bend + ox} ${y2 + oy}, ${x2 + ox} ${y2 + oy}`;
        };
        const showLanes = allEdges || laneLayer === layerIndex;
        return <g key={`edge-${layerIndex}-${neuron}-${source}`}
          className={`example-edge ${sign} ${activeEdge ? 'active' : ''}`}
          onClick={onFlipFlow} style={{ cursor: 'pointer' }}>
          <title>Click to flip the data flow</title>
          <path d={path} style={{ opacity: activeEdge ? 0.85 : 0.22, strokeWidth: activeEdge ? 2 : 1.2 }}/>
          {showLanes && [
            ...(showForward ? [{ direction: 'forward' as const, offset: -laneOffset }] : []),
            ...(showBackward ? [{ direction: 'backward' as const, offset: laneOffset }] : []),
          ].map(lane => {
            const lanePathValue = lanePath(lane.offset);
            return <g key={lane.direction} className={`example-lane ${lane.direction} active`}>
              {[0, 1, 2, 3].map(index => <path key={index} className="lane-arrow"
                d="M -5 0 H 4 M 0 -4 L 4 0 L 0 4"
                style={{
                  offsetPath: `path("${lanePathValue}")`,
                  animationDelay: `${(-index * 0.46).toFixed(2)}s`,
                } as CSSProperties}/>)}
            </g>;
          })}
          {dots && activeEdge && (!showGradient || Math.abs(gradient) > 1e-6) && <circle className="example-dot" r="3" style={{
            offsetPath: `path("${path}")`,
            '--example-delay': `${(-((layerIndex * 5 + neuron * 3 + source) * 0.13) % 1).toFixed(3)}s`,
          } as CSSProperties}/>}
          <g className={`example-edge-label ${showGradient ? 'gradient' : ''}`} transform={`translate(${middleX}, ${middleY})`}>
            <rect x={-labelWidth / 2} y="-9" width={labelWidth} height="18" rx="6"/>
            <text y="3.5">{label}</text>
          </g>
        </g>;
      })))}
      {sizes.map((size, column) => {
        const focused = allEdges || step.kind === 'loss' && column === columns - 1
          || (step.layer !== null && column === step.layer + 1);
        const badge = badgeFor(column);
        const kind = column === 0 ? 'input' : column === columns - 1 ? 'output' : 'hidden';
        return <g key={`column-${column}`} className="example-column">
          {Array.from({ length: size }, (_, neuron) => {
            const value = values(column)[neuron];
            const label = nodeName(column - 1, neuron, count);
            return <g key={neuron} transform={`translate(${x(column)}, ${y(column, neuron)})`}
              className={`example-node ${kind} ${focused ? 'focused' : ''}`}>
              <circle className="example-node-ring" r="31"/>
              <circle className="example-node-body" r="25"/>
              <text className="example-node-value" y="5">{num(value)}</text>
              <text className="example-node-name" y="46">{label}</text>
              {badge && <g className="example-badge" transform="translate(0, -44)">
                <rect x="-38" y="-10" width="76" height="20" rx="6"/>
                <text y="3.5">{badge.label} {num(badge.values[neuron])}</text>
              </g>}
            </g>;
          })}
        </g>;
      })}
    </svg>
    <p className="example-net-caption">
      {backward
        ? 'Green arrows carry the error back along the connections. Click a connection to flip the flow.'
        : step.phase === 'update' || step.phase === 'done'
          ? 'The updated network after one gradient step.'
          : step.phase === 'setup'
            ? 'Follow the steps to see the arrows: gold on the forward pass, green on the backward pass. Choose Both to compare directions.'
            : 'Gold arrows carry the data forward. Click a connection to flip the flow.'}
    </p>
  </div>;
}

export function BackpropExamples() {
  const [summaries, setSummaries] = useState<ExampleSummary[]>([]);
  const [example, setExample] = useState<WorkedExample | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [flowMode, setFlowMode] = useState<FlowMode>('auto');
  const [flowSpeed, setFlowSpeed] = useState(1);
  const [arrowsPaused, setArrowsPaused] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await examplesApi.list();
        const first = await examplesApi.load(list[0].id);
        if (!alive) return;
        setSummaries(list);
        setExample(first);
      } catch (cause) {
        if (alive) setError(cause instanceof Error ? cause.message : 'Could not load the worked examples.');
      }
    })();
    return () => { alive = false; };
  }, []);

  const steps = example ? buildSteps(example) : [];
  const step = steps[Math.min(stepIndex, Math.max(0, steps.length - 1))];

  useEffect(() => {
    if (!playing || steps.length === 0) return;
    if (stepIndex >= steps.length - 1) { setPlaying(false); return; }
    const timer = setTimeout(() => setStepIndex(index => index + 1), 1900);
    return () => clearTimeout(timer);
  }, [playing, stepIndex, steps.length]);

  function flipFlow() {
    setFlowMode(mode => mode === 'auto' ? 'both' : mode === 'both' ? 'forward' : mode === 'forward' ? 'backward' : 'auto');
  }

  async function select(id: string) {    if (!example || id === example.id) return;
    setBusy(true);
    setError('');
    setPlaying(false);
    try {
      const next = await examplesApi.load(id);
      setExample(next);
      setStepIndex(0);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load that example.');
    } finally {
      setBusy(false);
    }
  }

  const completed = step ? step.phase === 'update' || step.phase === 'done' : false;
  const prediction = example?.trace.forward.prediction[0] ?? 0;
  const updatedPrediction = example?.trace.updated.forward.prediction[0] ?? 0;
  const loss = example?.trace.loss ?? 0;
  const updatedLoss = example?.trace.updated.loss ?? 0;
  const improvement = loss > 0 ? Math.max(0, Math.round((1 - updatedLoss / loss) * 100)) : 0;

  return <div className="examples-lab">
    <section className="examples-intro">
      <div>
        <div className="eyebrow">Worked examples</div>
        <h2>Forward, then backward, one number at a time</h2>
        <p>Pick a tiny network. Step through the forward pass, watch the loss appear, then follow the error
          back through every weight and bias. Every card shows the arithmetic, not just the formula.</p>
      </div>
      <ol className="examples-legend" aria-label="How the steps are organised">
        <li><span className="dot forward"/>Forward</li>
        <li><span className="dot backward"/>Backward</li>
        <li><span className="dot update"/>Update</li>
      </ol>
    </section>

    <div className="example-picker" aria-label="Worked examples">
      {summaries.map(item => <button key={item.id} type="button" disabled={busy}
        className={`example-card ${example?.id === item.id ? 'active' : ''}`}
        aria-pressed={example?.id === item.id} onClick={() => void select(item.id)}>
        <span className="example-card-top">
          <strong>{item.name}</strong>
          <span className="badge neutral-badge">{item.shape}</span>
        </span>
        <small>{item.blurb}</small>
        <span className="example-card-meta">target {num(item.target[0])} · lr {num(item.learning_rate)}</span>
      </button>)}
    </div>

    {error && <div className="message error" role="alert">{error}</div>}
    {!example || !step ? <div className="panel example-loading"><div className="loader"><span/><span/><span/></div>
      <p>Loading the worked examples…</p></div> : <>
      <div className="example-layout">
        <section className="panel example-stage">
          <PanelTitle icon="network" aside={<span className={`badge ${phaseClass(step.phase)}`}>
            {phaseLabel(step.phase)}
          </span>}>The network</PanelTitle>
          <ExampleNet example={example} step={step} flowMode={flowMode} flowSpeed={flowSpeed}
            paused={arrowsPaused} onFlipFlow={flipFlow}/>
          <div className="example-flow-bar" aria-label="Data flow controls">
            <span className="example-flow-title">Flow</span>
            {FLOW_MODES.map(item => <button key={item.value} type="button"
              className={`flow-mode ${item.value}`} aria-pressed={flowMode === item.value}
              onClick={() => setFlowMode(item.value)}>{item.label}</button>)}
            <span className="example-flow-divider" aria-hidden="true"/>
            <span className="example-flow-title">Speed</span>
            {[0.6, 1, 1.6].map(speed => <button key={speed} type="button" className="flow-speed"
              aria-pressed={flowSpeed === speed} onClick={() => setFlowSpeed(speed)}>{speed}×</button>)}
            <button type="button" className={`flow-motion ${arrowsPaused ? 'paused' : ''}`}
              onClick={() => setArrowsPaused(value => !value)}>
              <Icon name={arrowsPaused ? 'play' : 'pause'} size={12}/>
              {arrowsPaused ? 'Play arrows' : 'Pause arrows'}
            </button>
            <span className="example-flow-hint">
              <span className="forward-mark">→ forward</span>
              <span className="backward-mark">← backward</span>
            </span>
          </div>
          <div className="example-ribbon">
            <div><span>Prediction</span><strong>{num(prediction)}{completed && <> → {num(updatedPrediction)}</>}</strong></div>
            <div><span>Loss</span><strong>{num(loss)}{completed && <> → {num(updatedLoss)}</>}</strong></div>
            {completed && <span className={improvement > 0 ? 'badge ready-badge' : 'badge neutral-badge'}>
              {improvement > 0 ? `${improvement}% lower` : 'no change'}
            </span>}
          </div>
        </section>

        <section className="panel example-step-panel">
          <PanelTitle icon="book" aside={<span className="badge neutral-badge">{stepIndex + 1} / {steps.length}</span>}>
            {step.title}
          </PanelTitle>
          <div className="example-step-body">
            <div className="example-formulas">
              {step.lines.map((line, index) => <div className="math" key={index}>{line}</div>)}
            </div>
            {step.table && <div className="table-scroll example-table-scroll">
              <table>
                <thead><tr>{step.table.headers.map(header => <th key={header}>{header}</th>)}</tr></thead>
                <tbody>{step.table.rows.map((row, index) => <tr key={index}>
                  {row.map((cell, cellIndex) => cellIndex === 0
                    ? <th scope="row" key={cellIndex}>{cell}</th>
                    : <td key={cellIndex}>{cell}</td>)}
                </tr>)}</tbody>
              </table>
            </div>}
            <p className="example-note"><Icon name="bulb" size={16}/><span>{step.note}</span></p>
          </div>
          <div className="example-controls">
            <button type="button" className="button" disabled={stepIndex === 0}
              onClick={() => { setPlaying(false); setStepIndex(index => Math.max(0, index - 1)); }}>
              <Icon name="previous" size={15}/>Back
            </button>
            <button type="button" className="button primary" disabled={stepIndex >= steps.length - 1}
              onClick={() => setPlaying(value => !value)}>
              <Icon name={playing ? 'pause' : 'play'} size={14}/>{playing ? 'Pause' : 'Play'}
            </button>
            <button type="button" className="button" disabled={stepIndex >= steps.length - 1}
              onClick={() => { setPlaying(false); setStepIndex(index => Math.min(steps.length - 1, index + 1)); }}>
              Next<Icon name="next" size={15}/>
            </button>
            <button type="button" className="button quiet" disabled={stepIndex === 0 && !playing}
              onClick={() => { setPlaying(false); setStepIndex(0); }}>
              <Icon name="reset" size={15}/>Restart
            </button>
          </div>
          <div className="example-progress" aria-hidden="true"><i style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}/></div>
        </section>
      </div>

      <section className="example-focus">
        <span className="example-focus-icon"><Icon name="bulb" size={18}/></span>
        <div><h3>What to notice</h3><p>{example.focus}</p></div>
        <span className="example-focus-meta">{example.shape} · {activationName(example.trace.network.layers.at(-1)!.activation)} output</span>
      </section>
    </>}
  </div>;
}
