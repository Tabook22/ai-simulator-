import { useState } from 'react';
import type { ReactNode } from 'react';
import { activations, format, layerName, neuronName, substitution } from './model';
import type { Forward, Network } from './model';
import type { Selection } from './Diagram';
import { ForwardStep } from './ForwardPlayback';
import { CalculationExplainer } from './CalculationExplainer';
import { ActivationInsight, NeuronAnatomy } from './NeuronAnatomy';
import { Icon, NumberField, PanelTitle } from './ui';

function Step({ number, title, current, children }: { number: number; title: string; current: boolean; children: ReactNode }) {
  return <section className={current ? 'trace-step trace-current' : 'trace-step'}>
    <span className="trace-number">{number}</span>
    <div className="trace-content"><h3>{title}</h3>{children}</div>
  </section>;
}

export function Inspector({ network, result, stale, selected, disabled, playbackStep, onWeight, onBias }: {
  network: Network; result: Forward | null; stale: boolean; selected: Selection; disabled: boolean; playbackStep?: number;
  onWeight: (layer: number, neuron: number, source: number, value: string) => void;
  onBias: (layer: number, neuron: number, value: string) => void;
}) {
  const [exact, setExact] = useState(false);
  const [explainOpen, setExplainOpen] = useState(false);
  const { layer, neuron } = selected;
  const count = network.layers.length;
  const entry = network.layers[layer];
  const computed = result?.layers[layer];
  const trace = computed?.neurons[neuron];
  const display = (number: number | undefined) => number === undefined ? '—' : format(number, exact);
  const revealed = (step: number, value: number | undefined) =>
    display(playbackStep === undefined || playbackStep >= step ? value : undefined);
  const last = layer === count - 1;
  return <aside className="panel inspector">
    <PanelTitle icon="target" aside={entry ? <span className={`badge activation-badge activation-${entry.activation}`}>
      {activations[entry.activation].name}</span> : undefined}>Neuron inspector</PanelTitle>
    <div className="inspect-heading">
      <div>
        <div className="eyebrow">{layerName(layer, count)}</div>
        <h3>{neuronName(layer, neuron, count)}</h3>
      </div>
      {layer >= 0 && <span className="inspect-layer-chip">Layer {layer + 1}<small>of {count}</small></span>}
    </div>
    {layer < 0 ? <div className="input-explainer">
      <p>This input passes its raw value into the first computed layer.</p>
      <strong>{network.inputs[neuron] || (network.inputs[neuron] === 0 ? 0 : '—')}</strong>
      <p>Select a hidden or output neuron to see how it uses this value.</p>
    </div> : <>
      <NeuronAnatomy trace={stale ? undefined : trace} weights={entry.weights[neuron]} bias={entry.biases[neuron]}
        activation={entry.activation} step={playbackStep}/>
      <div className="equation-box">
        <div className="equation-lead">The whole calculation</div>
        <div className="math equation-main">z = Σ(input × weight) + bias</div>
        <div className="math equation-main">output = activation(z)</div>
        <details><summary>What do the symbols mean?</summary>
          <p>Σ means add all the products. An input is a value from the previous layer. Each weight sets the strength and direction of its connection. Bias is a number added once. The total is z. The activation rule turns z into the output.</p>
        </details>
      </div>
      <div className="trace-toolbar">
        <span>{stale ? (trace ? 'Last run shown' : 'Run to see the math') : 'Step-by-step calculation'}</span>
        <div className="trace-tools">
          <button type="button" className="button small quiet" disabled={!result || !computed}
            onClick={() => setExplainOpen(true)}>
            <Icon name="help" size={14}/>Explain
          </button>
          <label className="precision"><input type="checkbox" checked={exact} onChange={event => setExact(event.target.checked)}/> Exact values</label>
        </div>
      </div>
      <div className="trace-list">
        <Step number={1} title="Multiply" current={playbackStep === ForwardStep.Move || playbackStep === ForwardStep.Multiply}>
          <div className="table-scroll">
            <table className="multiply-table">
              <thead><tr><th>Source</th><th>Value</th><th>Weight</th><th>Product</th></tr></thead>
              <tbody>{entry.weights[neuron].map((weight, source) => <tr key={source}>
                <th scope="row" title={neuronName(layer - 1, source, count)}>{layer === 0 ? `Input ${source + 1}` : `Neuron ${source + 1}`}</th>
                <td>{display(trace?.inputs[source])}</td>
                <td><NumberField label={`Weight ${source + 1}`} value={weight}
                  disabled={disabled} onChange={value => onWeight(layer, neuron, source, value)}/>
                  {stale && trace && Number(weight) !== trace.weights[source] && <small className="last-weight">
                    Was {display(trace.weights[source])}
                  </small>}</td>
                <td className="product">{revealed(ForwardStep.Multiply, trace?.products[source])}</td>
              </tr>)}</tbody>
            </table>
          </div>
        </Step>
        <Step number={2} title="Add" current={playbackStep === ForwardStep.Sum || playbackStep === ForwardStep.Bias}>
          <div className="add-grid">
            <span>Product sum</span><strong>{revealed(ForwardStep.Sum, trace?.sum)}</strong>
            <span>Bias</span><div><NumberField label="Bias" value={entry.biases[neuron]}
              disabled={disabled} onChange={value => onBias(layer, neuron, value)}/>
              {stale && trace && Number(entry.biases[neuron]) !== trace.bias && <small className="last-weight">
                Was {display(trace.bias)}
              </small>}</div>
            <span className="pre-activation">Before activation (z)</span><strong className="pre-activation">{revealed(ForwardStep.Bias, trace?.z)}</strong>
          </div>
        </Step>
        <Step number={3} title="Activate" current={playbackStep === ForwardStep.Activate}>
          <div className="activation-result math">
            {trace && computed && (playbackStep === undefined || playbackStep >= ForwardStep.Activate)
              ? <>{substitution(computed.activation, display(trace.z))} = <strong>{display(trace.output)}</strong></>
              : activations[entry.activation].equation}
          </div>
          {stale && trace && computed?.activation !== entry.activation && <small className="last-weight">Last run used {activations[computed!.activation].name}.</small>}
          <details className="activation-details" open>
            <summary>See {activations[entry.activation].name} as a curve</summary>
            <ActivationInsight activation={entry.activation}
              z={trace && !stale && (playbackStep === undefined || playbackStep >= ForwardStep.Activate) ? trace.z : undefined}/>
          </details>
        </Step>
        <Step number={4} title="Pass the output forward" current={playbackStep === ForwardStep.Pass}>
          <p className="pass-note"><Icon name="arrow" size={14}/>{playbackStep !== undefined && playbackStep < ForwardStep.Pass
            ? 'Waiting for activation.' : last ? 'Shown in the output panel.' : `Sent to every neuron in ${layerName(layer + 1, count)}.`}</p>
        </Step>
      </div>
    </>}
    {explainOpen && result && computed && <CalculationExplainer result={result} layer={layer} neuron={neuron}
      focusStep={null} onClose={() => setExplainOpen(false)}/>}
  </aside>;
}
