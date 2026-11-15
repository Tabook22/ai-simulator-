import { format, layerName, neuronName } from './model';
import type { Connection, Example, Network, TrainingResult, TrainingSettings } from './model';
import { Icon, NumberField, PanelTitle } from './ui';

function LossChart({ history }: { history: number[] }) {
  if (history.length < 2) return <div className="empty-chart">
    <span className="empty-chart-icon"><Icon name="gauge" size={22}/></span>
    <p>Run a training step to see how the loss changes.</p>
  </div>;
  const steps = history.length - 1;
  const max = Math.max(...history);
  const min = Math.min(...history);
  const spread = max - min;
  const points = history.map((loss, index) => [
    57 + 514 * index / (history.length - 1),
    spread === 0 ? 97 : 26 + 142 * ((max - loss) / spread),
  ]);
  const area = `57,170 ${points.map(point => point.join(',')).join(' ')} 571,170`;
  return <svg className="loss-chart" viewBox="0 0 600 218" role="img"
    aria-label={`Loss over ${steps} training ${steps === 1 ? 'step' : 'steps'}, from ${format(history[0])} to ${format(history.at(-1)!)}`}>
    <defs>
      <linearGradient id="loss-fill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#5ef2a0" stopOpacity=".34"/>
        <stop offset="100%" stopColor="#5ef2a0" stopOpacity="0"/>
      </linearGradient>
      <linearGradient id="loss-line" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#5ee7ff"/>
        <stop offset="100%" stopColor="#5ef2a0"/>
      </linearGradient>
    </defs>
    {[26, 97, 168].map(y => <line key={y} x1="57" x2="571" y1={y} y2={y}/>)}
    <polygon className="loss-area" points={area}/>
    <text x="49" y="31" textAnchor="end">{format(max)}</text>
    {spread > 0 && <text x="49" y="172" textAnchor="end">{format(min)}</text>}
    <text x="57" y="190" textAnchor="middle">0</text>
    <text x="571" y="190" textAnchor="middle">{history.length - 1}</text>
    <text x="314" y="211" textAnchor="middle">Training step</text>
    <polyline key={history.length} className="loss-line" points={points.map(point => point.join(',')).join(' ')}/>
    <circle className="loss-end" cx={points.at(-1)![0]} cy={points.at(-1)![1]} r="4"/>
  </svg>;
}

export function Training({ network, settings, selection, report, history, busy, onEdit, onExamples,
  onConnection, onAnd, onTrain, onReset }: {
  network: Network; settings: TrainingSettings; selection: Connection; report: TrainingResult | null;
  history: number[]; busy: boolean;
  onEdit: (settings: TrainingSettings) => void; onExamples: (examples: Example[]) => void;
  onConnection: (connection: Connection) => void; onAnd: () => void;
  onTrain: (single: boolean) => void; onReset: () => void;
}) {
  const inputs = network.inputs.length;
  const outputs = network.layers.at(-1)!.weights.length;
  const inputColumns = Array.from({ length: inputs }, (_, index) => index);
  const outputColumns = Array.from({ length: outputs }, (_, index) => index);
  const layer = network.layers[selection.layer];
  const weight = report?.weight;
  const first = history[0];
  const current = history.at(-1);
  const change = first !== undefined && current !== undefined && first > 0
    ? Math.round(((first - current) / first) * 100) : 0;
  const updateExample = (index: number, example: Example) => onExamples(
    settings.examples.map((old, position) => index === position ? example : old),
  );
  return <div className="training-layout">
    <section className="panel training-guide">
      <PanelTitle icon="flask">How training works</PanelTitle>
      <div className="training-guide-body">
        <p>Use labeled examples to teach the network what output to make.</p>
        <ol>
          <li><strong>Forward pass</strong><p>Use the current weights and biases to make a prediction.</p></li>
          <li><strong>Mean squared error</strong><p>Square each gap between the prediction and target, then take the average.</p></li>
          <li><strong>Backpropagation</strong><p>Work backward to find how each weight and bias affects the loss.</p></li>
          <li><strong>Gradient descent</strong><p>Subtract the learning rate times the gradient from each parameter, using all examples in one step.</p></li>
        </ol>
        <button className="button full ready-button" disabled={busy} onClick={onAnd}><Icon name="layers" size={16}/>Load AND gate</button>
        <p className="micro muted">Four examples. The target is 1 only when both inputs are 1.</p>
      </div>
    </section>
    <div className="training-work">
      <section className="panel">
        <PanelTitle icon="sliders" aside={<span className="badge neutral-badge">{inputs} inputs · {outputs} targets</span>}>Training examples</PanelTitle>
        <div className="training-body">
          <p className="muted">Changing the network or examples starts a new session from the current weights and biases.</p>
          <div className="table-scroll">
            <table className="training-table">
              <thead><tr><th>Example</th>{inputColumns.map(index => <th key={`input-${index}`}>Input {index + 1}</th>)}
                {outputColumns.map(index => <th key={`target-${index}`}>Target {index + 1}</th>)}<th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>{settings.examples.map((example, index) => <tr key={index}>
                <td><input aria-label={`Row ${index + 1} label`} value={example.label} placeholder={`Example ${index + 1}`}
                  maxLength={80} disabled={busy} onChange={event => updateExample(index, { ...example, label: event.target.value })}/></td>
                {inputColumns.map(column => <td key={`input-${column}`}>
                  <NumberField label={`Row ${index + 1} input ${column + 1}`} value={example.inputs[column]} disabled={busy}
                    onChange={value => updateExample(index, { ...example, inputs: example.inputs.map((old, cell) => cell === column ? value : old) })}/>
                </td>)}
                {outputColumns.map(column => <td key={`target-${column}`}>
                  <NumberField label={`Row ${index + 1} target ${column + 1}`} value={example.targets[column]} disabled={busy}
                    onChange={value => updateExample(index, { ...example, targets: example.targets.map((old, cell) => cell === column ? value : old) })}/>
                </td>)}
                <td><button className="icon-button" aria-label={`Remove row ${index + 1}`} disabled={busy || settings.examples.length <= 1}
                  onClick={() => onExamples(settings.examples.filter((_, position) => position !== index))}><Icon name="trash" size={15}/></button></td>
              </tr>)}</tbody>
            </table>
          </div>
          <button className="button small" disabled={busy || settings.examples.length >= 64}
            onClick={() => onExamples([...settings.examples, { label: '', inputs: Array(inputs).fill(''), targets: Array(outputs).fill('') }])}>
            <Icon name="plus" size={15}/>Add example
          </button>
        </div>
      </section>
      <section className="panel">
        <PanelTitle icon="play">Train the network</PanelTitle>
        <div className="training-body">
          <div className="training-settings">
            <label className="field-label">Learning rate <NumberField label="Learning rate" value={settings.learning_rate} disabled={busy}
              onChange={value => onEdit({ ...settings, learning_rate: value })}/><small>Above 0 and at most 10</small></label>
            <label className="field-label">Steps <NumberField label="Steps" value={settings.steps} disabled={busy}
              onChange={value => onEdit({ ...settings, steps: value })}/><small>1 to 500 per run</small></label>
          </div>
          <fieldset className="weight-picker">
            <legend>Weight to follow</legend>
            <label>Layer<select aria-label="Weight layer" disabled={busy} value={selection.layer}
              onChange={event => onConnection({ layer: Number(event.target.value), neuron: 0, source: 0 })}>
              {network.layers.map((_, index) => <option value={index} key={index}>{layerName(index, network.layers.length)}</option>)}
            </select></label>
            <label>Neuron<select aria-label="Weight neuron" disabled={busy} value={selection.neuron}
              onChange={event => onConnection({ ...selection, neuron: Number(event.target.value) })}>
              {layer.weights.map((_, index) => <option value={index} key={index}>{neuronName(selection.layer, index, network.layers.length)}</option>)}
            </select></label>
            <label>Source<select aria-label="Weight source" disabled={busy} value={selection.source}
              onChange={event => onConnection({ ...selection, source: Number(event.target.value) })}>
              {layer.weights[selection.neuron].map((_, index) =>
                <option value={index} key={index}>{neuronName(selection.layer - 1, index, network.layers.length)}</option>)}
            </select></label>
          </fieldset>
          <div className="button-row">
            <button className="button primary" disabled={busy} onClick={() => onTrain(true)}><Icon name="play" size={15}/>One training step</button>
            <button className="button" disabled={busy} onClick={() => onTrain(false)}>Train for set steps</button>
            <button className="button quiet" disabled={busy || !report} onClick={onReset}><Icon name="reset" size={16}/>Reset training</button>
          </div>
        </div>
      </section>
      <section className="panel">
        <PanelTitle icon="target" aside={<span className="badge neutral-badge">{Math.max(0, history.length - 1)}
          {Math.max(0, history.length - 1) === 1 ? ' step' : ' steps'}</span>}>Training results</PanelTitle>
        <div className="training-body">
          <div className="loss-head">
            <h3>Loss history</h3>
            {change > 0 && <span className="badge drop-badge"><Icon name="down" size={12}/>{change}% lower</span>}
          </div>
          {history.length > 0 && <div className="loss-summary"><span>Start <strong>{format(history[0])}</strong></span>
            <Icon name="arrow" size={16}/><span>Current <strong>{format(history.at(-1)!)}</strong></span></div>}
          <LossChart history={history}/>
          {report && weight && <>
            <h3>Before and after the last step</h3>
            <p>Loss <strong className="math">{format(report.before.loss)}</strong> → <strong className="math">{format(report.after.loss)}</strong></p>
            <div className="table-scroll"><table className="results-table">
              <thead><tr><th>Example</th><th>Target</th><th>Before</th><th>After</th></tr></thead>
              <tbody>{settings.examples.map((example, index) => <tr key={index}>
                <th scope="row">{example.label || `Example ${index + 1}`}</th>
                <td>{example.targets.map(Number).map(value => format(value)).join(', ')}</td>
                <td>{report.before.predictions[index].map(value => format(value)).join(', ')}</td>
                <td>{report.after.predictions[index].map(value => format(value)).join(', ')}</td>
              </tr>)}</tbody>
            </table></div>
            <div className="weight-update">
              <h3><Icon name="bolt" size={15}/>Weight update</h3>
              <p>{neuronName(weight.connection.layer - 1, weight.connection.source, network.layers.length)}
                {' → '}{neuronName(weight.connection.layer, weight.connection.neuron, network.layers.length)}</p>
              <div className="math">new value = old value − learning rate × gradient</div>
              <div className="math">{format(weight.new)} = {format(weight.old)} − {format(weight.rate)} × ({format(weight.gradient)})</div>
              <dl><div><dt>Old value</dt><dd>{format(weight.old)}</dd></div>
                <div><dt>Gradient</dt><dd>{format(weight.gradient)}</dd></div>
                <div><dt>New value</dt><dd>{format(weight.new)}</dd></div></dl>
            </div>
          </>}
        </div>
      </section>
    </div>
  </div>;
}
