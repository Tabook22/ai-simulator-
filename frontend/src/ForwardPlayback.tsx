import { activations, addend, format, layerName, substitution } from './model';
import type { Forward } from './model';
import { Icon } from './ui';
import type { IconName } from './ui';

export const forwardStages = [
  { title: 'Move inputs', label: 'Move', duration: 1400,
    detail: 'Every value travels along its own connection.' },
  { title: 'Multiply each input by its weight', label: 'Multiply', duration: 2000,
    detail: 'Each value is scaled by the strength of its connection.' },
  { title: 'Add the products', label: 'Sum', duration: 1500,
    detail: 'The scaled values are added into one running total.' },
  { title: 'Add the bias', label: 'Bias', duration: 1600,
    detail: 'The neuron’s own offset joins the total.' },
  { title: 'Apply the activation rule', label: 'Activate', duration: 1700,
    detail: 'The activation rule turns the total into the output.' },
  { title: 'Pass the output forward', label: 'Pass', duration: 1600,
    detail: 'That output becomes the next layer’s input.' },
] as const;

const stageIcons: IconName[] = ['arrow', 'bolt', 'plus', 'gauge', 'sparkle', 'next'];

export enum ForwardStep { Move, Multiply, Sum, Bias, Activate, Pass }

export const playbackSpeeds = [0.5, 1, 1.5, 2] as const;

export interface PlaybackFrame {
  layer: number;
  step: number;
}

export function neuronEquations(result: Forward, layer: number, neuron: number) {
  const count = result.layers.length;
  const { activation, neurons } = result.layers[layer];
  const trace = neurons[neuron];
  return [
    [`Values from ${layerName(layer - 1, count)}: ${trace.inputs.map(value => format(value)).join(', ')}`],
    trace.products.map((product, source) => `${format(trace.inputs[source])} × ${addend(trace.weights[source])} = ${format(product)}`),
    [`${trace.products.map(addend).join(' + ')} = ${format(trace.sum)}`],
    [`${format(trace.sum)} + ${addend(trace.bias)} = ${format(trace.z)}`],
    [`${activations[activation].name}: ${substitution(activation, format(trace.z))} = ${format(trace.output)}`],
    [`${format(trace.output)} → ${layer === count - 1 ? 'Network output' : layerName(layer + 1, count)}`],
  ];
}

export function ForwardPlayback({ frame, result, inspectedNeuron, paused, speed, disabled, onPause, onAdvance, onFinish, onReplay, onSpeed }: {
  frame: PlaybackFrame | null;
  result: Forward;
  inspectedNeuron: number | null;
  paused: boolean;
  speed: number;
  disabled: boolean;
  onPause: () => void;
  onAdvance: () => void;
  onFinish: () => void;
  onReplay: () => void;
  onSpeed: (speed: number) => void;
}) {
  const count = result.layers.length;
  if (!frame) return <section className="forward-playback finished" aria-label="Forward pass animation">
    <div className="playback-heading">
      <span role="status"><Icon name="sparkles" size={16}/>Forward pass complete</span>
      <button className="button small" disabled={disabled} onClick={onReplay}><Icon name="reset" size={14}/>Replay animation</button>
    </div>
    <p className="playback-done-note">
      <span className="playback-layer"><Icon name="target" size={14}/>Layer {count} of {count} · {layerName(count - 1, count)}</span>
      <span>Open any neuron to read its math again, or edit a weight and run it once more.</span>
    </p>
  </section>;

  const { layer, step } = frame;
  const stage = forwardStages[step];
  return <section className="forward-playback" aria-label="Forward pass animation">
    <div className="playback-top">
      <div className="playback-heading">
        <span className="playback-layer"><Icon name={stageIcons[step]} size={15}/>Layer {layer + 1} of {count} · {layerName(layer, count)}</span>
        <div className="button-row">
          <button className="button small" disabled={disabled} onClick={onPause}>
            <Icon name={paused ? 'play' : 'pause'} size={14}/>{paused ? 'Resume' : 'Pause'}
          </button>
          <button className="button small quiet" disabled={disabled} onClick={onFinish}>Show result</button>
        </div>
      </div>
      <div className="playback-speed" role="group" aria-label="Animation speed">
        {playbackSpeeds.map(value => <button key={value} type="button" disabled={disabled}
          className={value === speed ? 'speed-button current' : 'speed-button'}
          aria-label={`Animation speed ${value} times`} aria-pressed={value === speed}
          onClick={() => onSpeed(value)}>{value}×</button>)}
      </div>
    </div>
    <ol className="playback-steps" aria-label="Calculation steps">
      {forwardStages.map((item, index) => <li key={item.label} aria-current={index === step ? 'step' : undefined}
        className={index < step ? 'complete' : ''}>
        <span className="step-dot"><Icon name={index < step ? 'check' : stageIcons[index]} size={12}/></span>
        <span className="step-label">{item.label}</span>
      </li>)}
    </ol>
    <div className="playback-explanation" aria-live="polite" aria-atomic="true">
      <p><strong>{stage.title}</strong><span className="playback-detail">{stage.detail}</span></p>
      <span className="playback-count">Step {step + 1} of {forwardStages.length}</span>
      {inspectedNeuron !== null &&
        <span className="sr-only"> {neuronEquations(result, layer, inspectedNeuron)[step].join('. ')}</span>}
    </div>
    <div className="playback-track" aria-hidden="true">
      <div key={`${layer}-${step}`} onAnimationEnd={onAdvance}/>
    </div>
  </section>;
}
