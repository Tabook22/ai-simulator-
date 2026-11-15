import { activations, addend, format, layerName, neuronName } from './model';
import type { BackpropResult } from './model';
import { Icon } from './ui';

export type BackwardKind = 'compare' | 'error' | 'layer' | 'gradients' | 'update' | 'result';

export interface BackwardStage {
  label: string;
  title: string;
  detail: string;
  kind: BackwardKind;
  layer: number | null;
}

export function backwardStages(data: BackpropResult): BackwardStage[] {
  const count = data.network.layers.length;
  const layerStages: BackwardStage[] = Array.from({ length: count }, (_, position) => count - 1 - position)
    .map(layer => ({
      label: layerName(layer, count),
      title: `Send the error back through ${layerName(layer, count)}`,
      detail: layer === count - 1
        ? 'The output’s error is split among its incoming weights. Each weight learns how much it contributed to the miss.'
        : 'A hidden neuron has no target of its own. Its error is the sum of the errors of every neuron it fed, each weighted by the connection that carried its signal. It then shares that error among its own weights.',
      kind: 'layer',
      layer,
    }));
  return [
    {
      label: 'Compare', title: 'Compare the prediction with the target',
      detail: 'The network has made a guess. The target is the answer we want. The gap between them is the loss: a score for how wrong the guess is.',
      kind: 'compare', layer: null,
    },
    {
      label: 'Error', title: 'Measure the slope of the error',
      detail: 'The derivative tells us how fast the loss changes when the prediction moves. This slope is the seed of the whole backward pass.',
      kind: 'error', layer: null,
    },
    ...layerStages,
    {
      label: 'Gradients', title: 'Give every knob a gradient',
      detail: 'Each weight and bias now has a gradient: a direction and a size. It says which way to turn that knob to shrink the error.',
      kind: 'gradients', layer: null,
    },
    {
      label: 'Update', title: 'Turn every knob a small step',
      detail: 'Subtract a small multiple of each gradient from its knob. The learning rate decides how big the step is. One step is not the end of training.',
      kind: 'update', layer: null,
    },
    {
      label: 'Result', title: 'Check the new prediction',
      detail: 'The same inputs now produce a new prediction. A lower loss means the step helped. Apply the correction to keep it, then run again or train.',
      kind: 'result', layer: null,
    },
  ];
}

interface CorrectionRow {
  label: string;
  old: string;
  gradient: string;
  next: string;
}

function correctionRows(data: BackpropResult, layer: number): CorrectionRow[] {
  const count = data.network.layers.length;
  const network = data.network.layers[layer];
  const updated = data.updated.network.layers[layer];
  const gradients = data.backward.layers[layer];
  const rows: CorrectionRow[] = [];
  network.weights.forEach((row, neuron) => {
    row.forEach((value, source) => {
      rows.push({
        label: `Weight ${neuronName(layer - 1, source, count)} → ${neuronName(layer, neuron, count)}`,
        old: format(Number(value)),
        gradient: format(gradients.weight_gradients[neuron][source]),
        next: format(Number(updated.weights[neuron][source])),
      });
    });
    rows.push({
      label: `Bias of ${neuronName(layer, neuron, count)}`,
      old: format(Number(network.biases[neuron])),
      gradient: format(gradients.bias_gradients[neuron]),
      next: format(Number(updated.biases[neuron])),
    });
  });
  return rows;
}

function Table({ data, layers }: { data: BackpropResult; layers: number[] }) {
  const count = data.network.layers.length;
  return <div className="backprop-table-wrap">
    <table className="backprop-table">
      <thead><tr><th>Knob</th><th>Old</th><th>Gradient</th><th>New</th></tr></thead>
      {layers.map(layer => <tbody key={layer}>
        {layers.length > 1 && <tr className="backprop-table-layer"><th colSpan={4} scope="rowgroup">{layerName(layer, count)}</th></tr>}
        {correctionRows(data, layer).map((row, index) => <tr key={index}>
          <th scope="row">{row.label}</th>
          <td>{row.old}</td>
          <td className="backprop-gradient">{row.gradient}</td>
          <td className="backprop-new">{row.next}</td>
        </tr>)}
      </tbody>)}
    </table>
  </div>;
}

/** At most this many neurons get their own line of arithmetic; the table still lists every knob. */
const SHOWN_NEURONS = 4;

function stageMath(data: BackpropResult, stage: BackwardStage) {
  if (stage.kind === 'compare') {
    const pairs = data.forward.prediction.map((value, index) => `(${format(value)} − ${format(data.targets[index])})²`).join(' + ');
    return [`loss = mean(${pairs}) = ${format(data.loss)}`];
  }
  if (stage.kind === 'error') {
    return [`dL/dprediction = 2 × (prediction − target) / ${data.targets.length} = ${data.output_gradient.map(value => format(value)).join(', ')}`];
  }
  if (stage.kind === 'layer' && stage.layer !== null) {
    const layer = stage.layer;
    const count = data.network.layers.length;
    const backward = data.backward.layers[layer];
    const forward = data.forward.layers[layer];
    const next = data.backward.layers[layer + 1];
    const nextWeights = data.forward.layers[layer + 1]?.weights;
    const lines: string[] = [];
    backward.deltas.slice(0, SHOWN_NEURONS).forEach((delta, neuron) => {
      const name = neuronName(layer, neuron, count);
      const arriving = backward.output_gradient[neuron];
      if (next && nextWeights) {
        // A hidden neuron collects the error from every neuron it fed.
        const terms = next.deltas.map((nextDelta, target) => `${addend(nextDelta)} × ${addend(nextWeights[target][neuron])}`).join(' + ');
        lines.push(`${name}: ∂L/∂a = Σ δ(next) × w = ${terms} = ${format(arriving)}`);
      }
      lines.push(`${name}: δ = ∂L/∂a × f′(z) = ${format(arriving)} × ${format(forward.slopes[neuron])} = ${format(delta)}`);
    });
    if (backward.deltas.length > SHOWN_NEURONS) lines.push(`… and ${backward.deltas.length - SHOWN_NEURONS} more neurons, worked the same way.`);
    const delta = backward.deltas[0];
    const input = forward.inputs[0];
    const gradient = backward.weight_gradients[0][0];
    const old = Number(data.network.layers[layer].weights[0][0]);
    const updated = Number(data.updated.network.layers[layer].weights[0][0]);
    return [
      `${activations[forward.activation].name} slope: ${activations[forward.activation].slope}`,
      ...lines,
      `First weight: ∂L/∂w = δ × input = ${format(delta)} × ${format(input)} = ${format(gradient)}`,
      `w_new = w_old − rate × ∂L/∂w = ${format(old)} − ${format(data.learning_rate)} × ${addend(gradient)} = ${format(updated)}`,
      `Bias: ∂L/∂b = δ = ${format(delta)}`,
    ];
  }
  if (stage.kind === 'gradients') {
    return [
      'Every weight: ∂L/∂w = δ of the neuron it enters × the input it carries.',
      'Every bias: ∂L/∂b = δ of its neuron (a bias always “carries” 1).',
    ];
  }
  if (stage.kind === 'update') {
    return [
      `w_new = w_old − ${format(data.learning_rate)} × ∂L/∂w`,
      `b_new = b_old − ${format(data.learning_rate)} × ∂L/∂b`,
      'A positive gradient lowers the knob; a negative gradient raises it.',
    ];
  }
  return [
    `before: prediction ${data.forward.prediction.map(value => format(value)).join(', ')} · loss ${format(data.loss)}`,
    `after: prediction ${data.updated.forward.prediction.map(value => format(value)).join(', ')} · loss ${format(data.updated.loss)}`,
  ];
}

export function BackpropPlayback({ data, stages, step, applied, disabled, onPrev, onNext, onApply, onClose }: {
  data: BackpropResult; stages: BackwardStage[]; step: number; applied: boolean; disabled: boolean;
  onPrev: () => void; onNext: () => void; onApply: () => void; onClose: () => void;
}) {
  const stage = stages[Math.min(step, stages.length - 1)];
  const count = data.network.layers.length;
  // One layer while the error passes through it; every layer once all gradients are known.
  const tableLayers = stage.kind === 'layer' && stage.layer !== null ? [stage.layer]
    : stage.kind === 'gradients' || stage.kind === 'update' ? Array.from({ length: count }, (_, index) => count - 1 - index)
      : [];
  const improved = data.updated.loss < data.loss;
  return <section className="backprop-playback" aria-label="Backward pass lesson">
    <div className="backprop-top">
      <div>
        <div className="eyebrow">Backward pass · one gradient step · learning rate {format(data.learning_rate)}</div>
        <h3>Learn from this answer</h3>
      </div>
      <div className="button-row">
        <span className="backprop-step-count">Step {Math.min(step + 1, stages.length)} of {stages.length}</span>
        <button type="button" className="button small quiet" onClick={onClose}><Icon name="close" size={14}/>Close</button>
      </div>
    </div>

    <ol className="playback-steps backprop-steps" aria-label="Backward pass steps">
      {stages.map((item, index) => <li key={`${item.kind}-${index}`} aria-current={index === step ? 'step' : undefined}
        className={index < step ? 'complete' : ''}>
        <span className="step-dot">{index < step ? <Icon name="check" size={12}/> : index + 1}</span>
        <span className="step-label">{item.label}</span>
      </li>)}
    </ol>

    <div className="backprop-body">
      <div className="backprop-copy">
        <h4>{stage.title}</h4>
        <p>{stage.detail}</p>
        <p className="backprop-tip">
          {stage.kind === 'compare' && 'A guess is not a failure; it is information. The gap tells the network what to fix.'}
          {stage.kind === 'error' && 'Think of the slope as the steepness of the error hill. It tells us which way is downhill.'}
          {stage.kind === 'layer' && 'Each connection gets a share of the blame. A big weight or a big input means a bigger share.'}
          {stage.kind === 'gradients' && 'A gradient is a tiny instruction: “turn this knob this way, by this much.”'}
          {stage.kind === 'update' && 'The learning rate is the size of the step. Too big and you jump over the answer; too small and it takes forever.'}
          {stage.kind === 'result' && (improved ? 'The loss went down. That is one successful learning step.' : 'The loss went up this time. A smaller learning rate or a different starting point may help.')}
        </p>
      </div>

      <div className="backprop-panel">
        <div className="backprop-numbers">
          {data.forward.prediction.map((prediction, index) => <div key={index}>
            <span>Output {index + 1}</span>
            <strong>{format(prediction)}</strong>
            <small>target {format(data.targets[index])}</small>
          </div>)}
          <div>
            <span>Loss</span>
            <strong className={improved ? 'backprop-loss-good' : ''}>{format(data.loss)}</strong>
            <small>after {format(data.updated.loss)}</small>
          </div>
        </div>

        <div className="backprop-math math">
          {stage.kind === 'layer' && <div className="backprop-example">Each neuron’s share of the error (δ), then one weight worked in full. Every correction is in the table.</div>}
          {stageMath(data, stage).map((line, index) => <div key={index}>{line}</div>)}
        </div>

        {tableLayers.length > 0 && <Table data={data} layers={tableLayers}/>}
      </div>
    </div>

    {stage.kind === 'result' && <div className="backprop-result">
      <div className="backprop-compare">
        <span>Before<strong>{data.forward.prediction.map(value => format(value)).join(', ')}</strong><small>loss {format(data.loss)}</small></span>
        <Icon name="next" size={16}/>
        <span className="after">After<strong>{data.updated.forward.prediction.map(value => format(value)).join(', ')}</strong><small>loss {format(data.updated.loss)}</small></span>
      </div>
      <div className="button-row">
        <button type="button" className="button primary" disabled={disabled || applied} onClick={onApply}>
          <Icon name="check" size={15}/>{applied ? 'Correction applied' : 'Apply correction'}
        </button>
      </div>
    </div>}

    <div className="backprop-foot">
      <div className="button-row">
        <button type="button" className="button small" disabled={step <= 0 || applied} onClick={onPrev}>
          <Icon name="previous" size={14}/>Previous
        </button>
        <button type="button" className="button small" disabled={step >= stages.length - 1 || applied} onClick={onNext}>
          Next step<Icon name="next" size={14}/>
        </button>
      </div>
      <span className="backprop-hint">Coral packets show the error moving backward. Red labels show weight gradients.</span>
    </div>
  </section>;
}
