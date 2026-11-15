import { useMemo, useState } from 'react';
import './python-guide.css';
import { Icon } from './ui';
import type { Network, TrainingSettings } from './model';
import { buildGuide } from './guideGenerator';
import type { GuideConfig, GuideExample, GuideSource, GuideStep } from './guideGenerator';
import {
  HOUSE_BATCH_SIZE, HOUSE_DEFAULT_EPOCHS, HOUSE_FEATURE_NAMES,
  HOUSE_LEARNING_RATE, HOUSE_NEW_EXAMPLE, HOUSE_TARGET_NAMES,
  HOUSE_TEST_ROWS, HOUSE_TRAIN_ROWS, HOUSE_VALIDATION_ROWS, isHouseShape,
} from './houseConfig';

function completeExamples(training: TrainingSettings | null, features: number, outputs: number): GuideExample[] {
  return (training?.examples ?? []).flatMap(example => {
    if (example.inputs.length !== features || example.targets.length !== outputs) return [];
    const inputs = example.inputs.map(value => Number(String(value).trim()));
    const targets = example.targets.map(value => Number(String(value).trim()));
    if (inputs.some(value => !Number.isFinite(value)) || targets.some(value => !Number.isFinite(value))) return [];
    return [{ inputs, targets }];
  });
}

function defaultFeatureNames(count: number) {
  return Array.from({ length: count }, (_, index) => `feature_${index + 1}`);
}

function defaultTargetNames(count: number) {
  return Array.from({ length: count }, (_, index) => `target_${index + 1}`);
}

function splitPreview(n: number) {
  if (n < 3) return { train: 0, validation: 0, test: 0 };
  const train = Math.max(1, Math.floor(n * 0.7));
  const validation = Math.max(1, Math.floor(n * 0.15));
  const test = Math.max(1, n - train - validation);
  return { train, validation, test };
}

function defaultConfig(network: Network, training: TrainingSettings | null): GuideConfig {
  const outputs = network.layers.at(-1)?.weights.length ?? 0;
  const houseLike = isHouseShape(network.inputs.length, outputs);
  const featureNames = houseLike ? [...HOUSE_FEATURE_NAMES] : defaultFeatureNames(network.inputs.length);
  const targetNames = houseLike ? [...HOUSE_TARGET_NAMES] : defaultTargetNames(outputs);
  const learningRate = Number(training?.learning_rate);
  return {
    source: houseLike ? 'synthetic-house' : 'synthetic-generic',
    featureNames,
    targetNames,
    trainRows: HOUSE_TRAIN_ROWS,
    validationRows: HOUSE_VALIDATION_ROWS,
    testRows: HOUSE_TEST_ROWS,
    batchSize: HOUSE_BATCH_SIZE,
    epochs: HOUSE_DEFAULT_EPOCHS,
    learningRate: Number.isFinite(learningRate) && learningRate > 0 ? learningRate : HOUSE_LEARNING_RATE,
    optimizer: 'sgd',
    device: 'cpu',
    targetScaled: true,
    earlyStopping: false,
    patience: 5,
    newExample: houseLike ? [...HOUSE_NEW_EXAMPLE] : defaultFeatureNames(network.inputs.length).map((_, index) => index === 1 ? 1 : 0),
    seed: Number(network.seed) || 42,
  };
}

function CodeBlock({ label, code, onCopy, copied }: {
  label: string;
  code: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return <div className="py-code-wrap">
    <div className="py-code-head">
      <span>{label}</span>
      <button type="button" className="py-copy" onClick={onCopy}>
        <Icon name={copied ? 'check' : 'copy'} size={13}/>{copied ? 'Copied' : 'Copy code'}
      </button>
    </div>
    <pre className="py-code"><code>{code}</code></pre>
  </div>;
}

function StepCard({ step, index }: { step: GuideStep; index: number }) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(which: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    setCopied(which);
    window.setTimeout(() => setCopied(null), 1600);
  }

  return <details className="py-step" open={index === 0}>
    <summary>
      <span className="py-step-number">{String(step.number).padStart(2, '0')}</span>
      <span className="py-step-title"><strong>{step.title}</strong><small>{step.purpose}</small></span>
      <Icon name="next" size={15}/>
    </summary>
    <div className="py-step-body">
      <div className="py-step-meta">
        <div><span>Purpose</span><p>{step.purpose}</p></div>
        <div><span>Input</span><p>{step.input}</p></div>
        <div><span>What the code does</span><p>{step.explanation}</p></div>
      </div>
      {step.terminal && <CodeBlock label="Terminal commands (not Python)" code={step.terminal}
        onCopy={() => void copy(`terminal-${step.number}`, step.terminal!)} copied={copied === `terminal-${step.number}`}/>}
      <CodeBlock label={`Step ${step.number} Python code`} code={step.code}
        onCopy={() => void copy(`code-${step.number}`, step.code)} copied={copied === `code-${step.number}`}/>
      <div className="py-step-outcome">
        <div><span>Output</span><p>{step.output}</p></div>
        <div className="py-check"><span>Check before continuing</span><p>{step.check}</p></div>
      </div>
    </div>
  </details>;
}

export function PythonGuide({ network, training, onOpenExplore, onUseHouseSetup }: {
  network: Network;
  training: TrainingSettings | null;
  onOpenExplore: () => void;
  onUseHouseSetup: () => void;
}) {
  const [config, setConfig] = useState<GuideConfig>(() => defaultConfig(network, training));
  const [copiedAll, setCopiedAll] = useState(false);
  const outputs = network.layers.at(-1)?.weights.length ?? 0;
  const availableExamples = completeExamples(training, network.inputs.length, outputs);
  const guide = useMemo(() => buildGuide(network, config), [network, config]);
  const { summary } = guide;
  const currentExamplesCount = training?.examples.length ?? 0;
  const totalRows = config.trainRows + config.validationRows + config.testRows;

  function update<K extends keyof GuideConfig>(key: K, value: GuideConfig[K]) {
    setConfig(current => ({ ...current, [key]: value }));
  }

  function changeSource(source: GuideSource) {
    if (source === 'current-examples') {
      const split = splitPreview(availableExamples.length);
      setConfig(current => ({
        ...current, source,
        trainRows: split.train, validationRows: split.validation, testRows: split.test,
        currentExamples: availableExamples,
      }));
      return;
    }
    if (source === 'synthetic-house') {
      setConfig(current => ({
        ...current, source, featureNames: [...HOUSE_FEATURE_NAMES], targetNames: [...HOUSE_TARGET_NAMES],
        trainRows: HOUSE_TRAIN_ROWS, validationRows: HOUSE_VALIDATION_ROWS, testRows: HOUSE_TEST_ROWS,
        newExample: [...HOUSE_NEW_EXAMPLE], targetScaled: true,
      }));
      return;
    }
    setConfig(current => ({ ...current, source, featureNames: defaultFeatureNames(network.inputs.length),
      targetNames: defaultTargetNames(outputs), newExample: defaultFeatureNames(network.inputs.length).map((_, index) => index === 1 ? 1 : 0) }));
  }

  function useHouseSetup() {
    onUseHouseSetup();
    setConfig({
      ...config,
      source: 'synthetic-house', featureNames: [...HOUSE_FEATURE_NAMES], targetNames: [...HOUSE_TARGET_NAMES],
      trainRows: HOUSE_TRAIN_ROWS, validationRows: HOUSE_VALIDATION_ROWS, testRows: HOUSE_TEST_ROWS,
      batchSize: HOUSE_BATCH_SIZE, epochs: HOUSE_DEFAULT_EPOCHS, learningRate: HOUSE_LEARNING_RATE,
      optimizer: 'sgd', device: 'cpu', targetScaled: true, earlyStopping: false, patience: 5,
      newExample: [...HOUSE_NEW_EXAMPLE], currentExamples: undefined,
    });
  }

  async function copyComplete() {
    try {
      await navigator.clipboard.writeText(guide.script);
    } catch {
      const area = document.createElement('textarea');
      area.value = guide.script;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    setCopiedAll(true);
    window.setTimeout(() => setCopiedAll(false), 1800);
  }

  function download(filename: string, content: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return <div className="python-guide">
    <header className="py-hero">
      <div>
        <div className="eyebrow">Python training guide</div>
        <h1>Generate the Python that trains your network</h1>
        <p>Complete, runnable PyTorch code for the architecture you built. Every numbered step shows what runs next and why it is needed.</p>
        <div className="py-hero-actions">
          <button type="button" className="button small" onClick={onOpenExplore}><Icon name="sliders" size={14}/>Edit the network</button>
          <button type="button" className="button small primary" onClick={useHouseSetup}><Icon name="home" size={14}/>Use the house-price setup</button>
        </div>
      </div>
      <div className="py-hero-note">
        <Icon name="code" size={18}/>
        <p><strong>Generated code runs in your environment.</strong> This page does not execute Python. Run the terminal setup in Step 1, then run the steps in order.</p>
      </div>
    </header>

    <section className="panel py-config" aria-labelledby="py-config-title">
      <div className="py-section-head">
        <div><div className="eyebrow">Matched to your lab</div><h2 id="py-config-title">Configuration</h2></div>
        <div className="py-arch-badge">{summary.architecture} · seed {summary.seed}</div>
      </div>
      <div className="py-current-strip">
        <span><strong>{summary.features}</strong> input features</span>
        <span><strong>{summary.outputs}</strong> output(s)</span>
        <span><strong>{summary.parameters}</strong> trainable parameters</span>
        <span><strong>{currentExamplesCount}</strong> rows in Teach the network</span>
        <span>Output activation: <strong>{network.layers.at(-1)?.activation ?? '—'}</strong></span>
      </div>
      {config.source === 'synthetic-house' && <p className="py-notice"><Icon name="bulb" size={13}/>The default dataset is a <strong>synthetic classroom demonstration</strong>, not real house observations. The script generates it reproducibly from your seed.</p>}
      {config.source === 'current-examples' && <p className="py-notice"><Icon name="check" size={13}/>Using your complete numeric rows from Teach the network. The script embeds them and does not invent extra rows.</p>}
      <p className="py-notice py-defaults"><Icon name="bulb" size={13}/><span><strong>Guide defaults:</strong> batch size 100, 20 epochs, SGD, CPU, float32 tensors, and MSE. The Training tab stores update steps, not epochs, so edit the fields above to match another plan. The architecture and seed come from your current network. <strong>Fresh run:</strong> the script re-initializes the same architecture with your seed; it does not copy the browser's current trained weights.</span></p>

      <div className="py-config-grid">
        <label className="py-field"><span>Dataset source</span>
          <select value={config.source} onChange={event => changeSource(event.target.value as GuideSource)}>
            {network.inputs.length === 2 && outputs === 1 && <option value="synthetic-house">Synthetic house-price demo (not real)</option>}
            <option value="synthetic-generic">Synthetic generic demo (not real)</option>
            <option value="current-examples" disabled={availableExamples.length < 3}>
              Current Teach-the-network rows {availableExamples.length > 0 ? `(${availableExamples.length} complete)` : '(none complete)'}
            </option>
          </select>
          <small>{config.source === 'current-examples' ? 'Uses only complete numeric rows from the Training tab.' : 'Clearly labeled synthetic data; replace the loading block with a CSV later.'}</small>
        </label>
        <label className="py-field"><span>Feature names, in order</span>
          <input type="text" value={config.featureNames.join(', ')}
            onChange={event => update('featureNames', event.target.value.split(',').map(name => name.trim()).filter(Boolean))}/>
          <small>Must contain exactly {network.inputs.length} name(s). This is the input order for the new example.</small>
        </label>
        <label className="py-field"><span>Target name(s)</span>
          <input type="text" value={config.targetNames.join(', ')}
            onChange={event => update('targetNames', event.target.value.split(',').map(name => name.trim()).filter(Boolean))}/>
          <small>Must contain exactly {outputs} name(s).</small>
        </label>
        <div className="py-field"><span>Rows</span>
          <div className="py-split-inputs">
            <label>Train <input type="number" min="1" value={config.trainRows} onChange={event => update('trainRows', Number(event.target.value))}/></label>
            <label>Val <input type="number" min="1" value={config.validationRows} onChange={event => update('validationRows', Number(event.target.value))}/></label>
            <label>Test <input type="number" min="1" value={config.testRows} onChange={event => update('testRows', Number(event.target.value))}/></label>
          </div>
          <small>Total dataset: <strong>{totalRows.toLocaleString()}</strong>; training: <strong>{config.trainRows.toLocaleString()}</strong>. The training set is not the whole dataset.</small>
        </div>
        <label className="py-field"><span>Batch size</span>
          <input type="number" min="1" value={config.batchSize} onChange={event => update('batchSize', Number(event.target.value))}/>
          <small>{summary.batchesPerEpoch} batches per epoch; the final incomplete batch is retained.</small>
        </label>
        <label className="py-field"><span>Epochs</span>
          <input type="number" min="1" value={config.epochs} onChange={event => update('epochs', Number(event.target.value))}/>
          <small>{summary.updates} total optimizer updates.</small>
        </label>
        <label className="py-field"><span>Learning rate</span>
          <input type="number" min="0.000001" step="0.001" value={config.learningRate} onChange={event => update('learningRate', Number(event.target.value))}/>
          <small>Prefilled from Teach the network; edit if needed.</small>
        </label>
        <label className="py-field"><span>Optimizer</span>
          <select value={config.optimizer} onChange={event => update('optimizer', event.target.value as 'sgd' | 'adam')}>
            <option value="sgd">SGD</option>
            <option value="adam">Adam</option>
          </select>
          <small>One optimizer update per batch.</small>
        </label>
        <label className="py-field"><span>Execution device</span>
          <select value={config.device} onChange={event => update('device', event.target.value as 'cpu' | 'cuda')}>
            <option value="cpu">CPU (default for small experiments)</option>
            <option value="cuda">GPU (CUDA, falls back to CPU)</option>
          </select>
          <small>GPU install guidance comes from the official PyTorch selector, not guessed CUDA commands.</small>
        </label>
        <div className="py-field">
          <span>Target scaling &amp; early stopping</span>
          <div className="py-checks">
            <label><input type="checkbox" checked={config.targetScaled} onChange={event => update('targetScaled', event.target.checked)}/> Scale target and invert predictions</label>
            <label><input type="checkbox" checked={config.earlyStopping} onChange={event => update('earlyStopping', event.target.checked)}/> Early stopping</label>
            {config.earlyStopping && <label className="py-patience">Patience <input type="number" min="1" value={config.patience} onChange={event => update('patience', Number(event.target.value))}/></label>}
          </div>
          <small>Early stopping restores the best validation checkpoint.</small>
        </div>
        <label className="py-field py-wide"><span>New example values, in feature order</span>
          <input type="text" value={config.newExample.join(', ')}
            onChange={event => update('newExample', event.target.value.split(',').map(value => Number(value.trim())))}/>
          <small>{config.featureNames.map((name, index) => `${name} = ${config.newExample[index] ?? '—'}`).join(' · ')}</small>
        </label>
      </div>

      {guide.errors.length > 0 && <div className="py-alert error" role="alert"><strong>Fix these before generating:</strong><ul>{guide.errors.map(error => <li key={error}>{error}</li>)}</ul></div>}
      {guide.warnings.length > 0 && <div className="py-alert warning"><strong>Configuration notes:</strong><ul>{guide.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul></div>}
    </section>

    <section className="py-summary" aria-label="Generated guide summary">
      <div className="py-summary-item"><span>Architecture</span><strong>{summary.architecture}</strong></div>
      <div className="py-summary-item"><span>Parameters</span><strong>{summary.parameters}</strong><small>{summary.weights} weights + {summary.biases} biases</small></div>
      <div className="py-summary-item"><span>Data</span><strong>{summary.trainRows} / {summary.validationRows} / {summary.testRows}</strong><small>train / val / test</small></div>
      <div className="py-summary-item"><span>Batches</span><strong>{summary.batchesPerEpoch}</strong><small>per epoch</small></div>
      <div className="py-summary-item"><span>Updates</span><strong>{summary.updates}</strong><small>{summary.batchesPerEpoch} × {summary.epochs}</small></div>
      <div className="py-summary-item"><span>Device</span><strong>{summary.device}</strong><small>{summary.optimizer} · float32 · {summary.parameterStorage} storage</small></div>
    </section>

    <div className="py-actions-bar">
      <div>
        <strong>Run these steps in order.</strong>
        <p>Later steps use variables created in earlier steps. The script and notebook perform the same workflow.</p>
      </div>
      <div className="py-actions">
        <button type="button" className="button small" onClick={() => void copyComplete()} disabled={guide.errors.length > 0}>
          <Icon name={copiedAll ? 'check' : 'copy'} size={14}/>{copiedAll ? 'Copied script' : 'Copy complete script'}
        </button>
        <button type="button" className="button small" disabled={guide.errors.length > 0}
          onClick={() => download(guide.scriptFilename, guide.script, 'text/x-python')}>
          <Icon name="download" size={14}/>Download .py
        </button>
        <button type="button" className="button small" disabled={guide.errors.length > 0}
          onClick={() => download(guide.notebookFilename, guide.notebook, 'application/x-ipynb+json')}>
          <Icon name="next" size={14}/>Download notebook
        </button>
        <button type="button" className="button small quiet" disabled={guide.errors.length > 0}
          onClick={() => download('requirements.txt', guide.requirements, 'text/plain')}>
          <Icon name="next" size={14}/>requirements.txt
        </button>
      </div>
    </div>

    {guide.errors.length === 0 && <section className="py-steps" aria-label="Fifteen-step Python training guide">
      {guide.steps.map((step, index) => <StepCard key={step.number} step={step} index={index}/>)}
    </section>}

    <footer className="py-footer">
      <p><strong>Safety note:</strong> this page only generates text and files. It does not run Python, install packages, or use your hardware. Run the terminal commands yourself, in a virtual environment.</p>
      <p>The default synthetic data is for teaching only. Replace the data-loading block with your own CSV and keep the same feature order and preprocessing flow.</p>
    </footer>
  </div>;
}
