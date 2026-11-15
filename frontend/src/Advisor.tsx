import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import './advisor.css';
import { Icon } from './ui';
import type { Network, TrainingSettings } from './model';
import {
  SOFTWARE_OPTIONS, calculateEstimate, formatBytes, formatCount,
  HEURISTICS, optimizerLabel, precisionLabel,
} from './advisorModel';
import type { Optimizer, Precision } from './advisorModel';
import {
  HOUSE_BATCH_SIZE, HOUSE_DEFAULT_EPOCHS, HOUSE_TRAIN_ROWS,
} from './houseConfig';

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="advisor-field">
    <span>{label}</span>
    {children}
    {hint && <small>{hint}</small>}
  </label>;
}

export function Advisor({ network, training, onOpenExplore, onUseHouseSetup }: {
  network: Network;
  training: TrainingSettings | null;
  onOpenExplore: () => void;
  onUseHouseSetup: () => void;
}) {
  const trainingExamples = training?.examples.length ?? 0;
  const [examples, setExamples] = useState(() => String(trainingExamples || HOUSE_TRAIN_ROWS));
  const [batchSize, setBatchSize] = useState(String(HOUSE_BATCH_SIZE));
  const [epochs, setEpochs] = useState(String(HOUSE_DEFAULT_EPOCHS));
  const [precision, setPrecision] = useState<Precision>('float32');
  const [optimizer, setOptimizer] = useState<Optimizer>('sgd');
  const [ram, setRam] = useState('');
  const [cpu, setCpu] = useState('');
  const [gpuModel, setGpuModel] = useState('');
  const [gpuMemory, setGpuMemory] = useState('');
  const [hasGpu, setHasGpu] = useState<'unknown' | 'none' | 'yes'>('unknown');
  const examplesEdited = useRef(false);

  useEffect(() => {
    if (!examplesEdited.current && trainingExamples > 0) setExamples(String(trainingExamples));
  }, [trainingExamples]);

  const detectedCores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : undefined;
  const detectedMemory = typeof navigator !== 'undefined'
    ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory
    : undefined;
  const parsedExamples = Number(examples);
  const parsedBatch = Number(batchSize);
  const parsedEpochs = Number(epochs);
  const estimate = useMemo(() => calculateEstimate(network, {
    examples: parsedExamples,
    batchSize: parsedBatch,
    epochs: parsedEpochs,
    precision,
    optimizer,
  }), [network, parsedExamples, parsedBatch, parsedEpochs, precision, optimizer]);

  const ramValue = Number(ram);  const enteredHardware = Boolean(ram || cpu || gpuModel || gpuMemory) || hasGpu !== 'unknown';
  const primaryRoute = estimate.gpu === 'unnecessary' || estimate.gpu === 'optional'
    ? 'This app for exploration, then Python + NumPy in a notebook to rebuild the math. Move to PyTorch when you want automatic gradients.'
    : 'Python + PyTorch locally, or Google Colab if you do not have a suitable GPU. Keep this app as the visual introduction.';

  function useHouseSetup() {
    onUseHouseSetup();
    examplesEdited.current = true;
    setExamples(String(HOUSE_TRAIN_ROWS));
    setBatchSize(String(HOUSE_BATCH_SIZE));
    setEpochs(String(HOUSE_DEFAULT_EPOCHS));
    setPrecision('float32');
    setOptimizer('sgd');
  }

  const reason = estimate.gpu === 'unnecessary'
    ? `This network has ${formatCount(estimate.totalParameters)} trainable parameters, ${formatCount(parsedExamples)} examples, and ${formatCount(estimate.updates)} optimizer updates. That is a tiny parallel workload, so the CPU path is simpler and usually faster than moving data to a GPU.`
    : estimate.gpu === 'optional'
      ? `The workload is still modest (${formatCount(estimate.totalParameters)} parameters, ${formatCount(estimate.updates)} updates). A GPU can help, but it is not required; the transfer and setup overhead may cancel the gain.`
      : `At ${formatCount(estimate.totalParameters)} parameters and ${formatCount(estimate.updates)} updates, the workload may benefit from a GPU. Compare a local GPU with a cloud notebook rather than buying hardware first.`;

  const gpuLabel = estimate.gpu === 'unnecessary' ? 'Unnecessary'
    : estimate.gpu === 'optional' ? 'Optional'
      : estimate.gpu === 'worth evaluating' ? 'Worth evaluating' : 'Unsupported';
  const gpuClass = estimate.gpu === 'unnecessary' ? 'unnecessary' : estimate.gpu === 'optional' ? 'optional' : 'worth';

  const memoryRows = [
    ['Parameters', estimate.parameterStorageBytes, 'exact: parameter count × bytes per parameter'],
    ['Gradients + optimizer state', estimate.optimizerStateBytes, optimizerLabel(optimizer) === 'Adam' ? 'gradients + two Adam moments' : 'gradients (SGD)'],
    ['Activations and temporary buffers', estimate.activationBytes * 2, 'batch-size dependent heuristic'],
    ['Input data', estimate.dataBytes, 'examples × features heuristic'],
    ['Framework / OS overhead', estimate.frameworkBytes, 'fixed classroom allowance'],
  ] as const;

  return <div className="advisor">
    <header className="advisor-hero">
      <div>
        <div className="eyebrow">Hardware &amp; software advisor</div>
        <h1>Will your computer and tools handle this network?</h1>
        <p>The advisor reads the network you designed and the training assumptions below. Everything is a labeled classroom heuristic — not a benchmark.</p>
        <div className="advisor-hero-actions">
          <button type="button" className="button small" onClick={onOpenExplore}><Icon name="sliders" size={14}/>Edit the network in Explore</button>
          <button type="button" className="button small primary" onClick={useHouseSetup}><Icon name="home" size={14}/>Use the house-price setup</button>
        </div>
      </div>
      <div className="advisor-hero-note">
        <Icon name="bulb" size={18}/>
        <p><strong>Start with what you have.</strong> For a tiny dense network, a normal laptop CPU is enough. A dedicated GPU is not a requirement for learning.</p>
      </div>
    </header>

    <section className="panel advisor-assumptions" aria-labelledby="advisor-assumptions-title">
      <div className="advisor-section-head">
        <div><div className="eyebrow">Inputs</div><h2 id="advisor-assumptions-title">Your experiment</h2></div>
        <span className="badge neutral-badge">Fully connected</span>
      </div>
      <div className="advisor-assumption-grid">
        <Field label="Training examples" hint={trainingExamples > 0 ? `Teach the network currently has ${trainingExamples}.` : 'Enter the number of rows used for training.'}>
          <input type="number" min="1" step="1" value={examples}
            onChange={event => { examplesEdited.current = true; setExamples(event.target.value); }} aria-label="Training examples"/>
        </Field>
        <Field label="Batch size" hint="Advisor input; the Training tab does not store batches.">
          <input type="number" min="1" step="1" value={batchSize}
            onChange={event => setBatchSize(event.target.value)} aria-label="Batch size"/>
        </Field>
        <Field label="Epochs" hint="One epoch is one pass over the training examples.">
          <input type="number" min="1" step="1" value={epochs}
            onChange={event => setEpochs(event.target.value)} aria-label="Epochs"/>
        </Field>
        <Field label="Numeric precision" hint="Parameter storage is shown at this precision.">
          <select value={precision} onChange={event => setPrecision(event.target.value as Precision)} aria-label="Numeric precision">
            <option value="float32">float32 · 4 bytes</option>
            <option value="float16">float16 · 2 bytes</option>
            <option value="bfloat16">bfloat16 · 2 bytes</option>
            <option value="float64">float64 · 8 bytes</option>
          </select>
        </Field>
        <Field label="Optimizer" hint="A choice; the current lab trainer uses plain gradient descent.">
          <select value={optimizer} onChange={event => setOptimizer(event.target.value as Optimizer)} aria-label="Optimizer">
            <option value="sgd">SGD</option>
            <option value="adam">Adam</option>
          </select>
        </Field>
        <div className="advisor-assumption-note">
          <p><strong>Not from the lab:</strong> batch size, epochs, precision, and optimizer are entered here. The Training tab stores update steps, not epochs. The counts below update as you change them.</p>
          <p><strong>What does not change the estimate:</strong> more epochs add optimizer updates, not trainable parameters; a seed controls initialization, not hardware requirements; and the target is never an input feature.</p>
          <p className="advisor-scope">Estimator scope: fully connected layers with biases. Convolutional or transformer models would need a different estimator.</p>
        </div>
      </div>
    </section>

    <section className="panel advisor-glance" aria-labelledby="advisor-glance-title">
      <div className="advisor-section-head">
        <div><div className="eyebrow">Your experiment at a glance</div><h2 id="advisor-glance-title">{estimate.architecture} network</h2></div>
        <span className={`advisor-verdict ${gpuClass}`}>{estimate.gpu === 'unnecessary' ? 'CPU-friendly' : estimate.gpu === 'optional' ? 'GPU optional' : 'Evaluate a GPU'}</span>
      </div>
      <div className="advisor-metrics">
        <div className="advisor-metric"><span>Architecture</span><strong>{estimate.architecture}</strong><small>{estimate.features} input features · {estimate.outputs} output</small></div>
        <div className="advisor-metric"><span>Trainable parameters</span><strong>{formatCount(estimate.totalParameters)}</strong><small>{formatCount(estimate.weights)} weights + {formatCount(estimate.biases)} biases</small></div>
        <div className="advisor-metric"><span>Batches per epoch</span><strong>{formatCount(estimate.batchesPerEpoch)}</strong><small>{formatCount(parsedExamples)} examples ÷ {formatCount(parsedBatch)} per batch</small></div>
        <div className="advisor-metric"><span>Optimizer updates</span><strong>{formatCount(estimate.updates)}</strong><small>{formatCount(estimate.batchesPerEpoch)} batches × {formatCount(parsedEpochs)} epochs</small></div>
        <div className="advisor-metric"><span>Parameter storage</span><strong>{formatBytes(estimate.parameterStorageBytes)}</strong><small>{formatCount(estimate.totalParameters)} × {estimate.bytesPerParameter} bytes</small></div>
        <div className="advisor-metric"><span>Precision</span><strong>{precisionLabel(precision)}</strong><small>{optimizerLabel(optimizer)} optimizer</small></div>
      </div>
      <div className="advisor-table-wrap">
        <table className="advisor-table">
          <caption>Parameter count by layer. This is the exact count for the current architecture.</caption>
          <thead><tr><th>Layer</th><th>Shape</th><th>Weights</th><th>Biases</th><th>Activation</th></tr></thead>
          <tbody>{estimate.layers.map(layer => <tr key={layer.index}>
            <th scope="row">Layer {layer.index + 1}</th><td>{layer.inputUnits} → {layer.outputUnits}</td>
            <td>{formatCount(layer.weights)}</td><td>{formatCount(layer.biases)}</td><td>{layer.activation}</td>
          </tr>)}</tbody>
          <tfoot><tr><th scope="row">Total</th><td>—</td><td>{formatCount(estimate.weights)}</td><td>{formatCount(estimate.biases)}</td><td>{formatCount(estimate.totalParameters)} trainable</td></tr></tfoot>
        </table>
      </div>
    </section>

    <section className="advisor-recommendation" aria-live="polite">
      <div className="panel advisor-recommend">
        <div className="advisor-section-head"><div><div className="eyebrow">Recommendation</div><h2>Your hardware</h2></div></div>
        <div className="advisor-verdict-row">
          <div className="advisor-verdict-card"><span>Existing computer</span><strong>{ram ? (ramValue < estimate.suggestedRamGb ? 'Tight' : ramValue < estimate.comfortableRamGb ? 'Workable' : 'Comfortable') : 'Likely sufficient'}</strong><small>{ram ? `You entered ${ram} GB RAM` : 'No RAM entered; the default advice is a normal laptop.'}</small></div>
          <div className="advisor-verdict-card"><span>Suggested RAM</span><strong>{estimate.suggestedRamGb} GB min</strong><small>{estimate.comfortableRamGb} GB comfortable</small></div>
          <div className={`advisor-verdict-card gpu ${gpuClass}`}><span>Dedicated GPU</span><strong>{gpuLabel}</strong><small>{estimate.gpu === 'unnecessary' ? 'Not needed for this workload.' : estimate.gpu === 'optional' ? 'Useful, not required.' : 'Compare cloud and local options.'}</small></div>
        </div>
        <div className="advisor-reasoning">
          <h3>Reasoning</h3>
          <p>{reason}</p>
          {ram && <p>{ramValue < estimate.suggestedRamGb
            ? `Your entered ${ram} GB is below the ${estimate.suggestedRamGb} GB heuristic minimum. Close other applications, or use a cloud notebook if training becomes tight.`
            : ramValue < estimate.comfortableRamGb
              ? `Your entered ${ram} GB is workable but below the ${estimate.comfortableRamGb} GB comfort point. The parameter count is small; RAM pressure is more likely to come from the browser, OS, and data tooling than from the weights.`
              : `Your entered ${ram} GB is comfortable for this estimate. The weights themselves are only ${formatBytes(estimate.parameterStorageBytes)}.`}</p>}
          {hasGpu === 'yes' && <p>You entered a GPU ({gpuModel || 'model not given'}{gpuMemory ? `, ${gpuMemory} GB` : ''}). {estimate.gpu === 'unnecessary'
            ? 'It is not required here. Moving a tiny batch to the GPU can add overhead; use the simpler CPU path unless you are already set up for PyTorch.'
            : estimate.gpu === 'optional' ? 'It can help, but CPU training is still reasonable for this size.' : 'Compare its memory with the estimate below before relying on it.'}</p>}
          {hasGpu === 'none' && <p>No dedicated GPU: that is completely fine for this workload.</p>}
          {hasGpu === 'unknown' && <p>GPU not entered. The verdict above is based on the workload, not on unknown hardware.</p>}
        </div>
        <div className="advisor-assumptions-note">
          <h3>Assumptions and limitations</h3>
          <ul>
            <li><strong>From your design:</strong> the fully connected architecture and parameter count are read from the current network.</li>
            <li><strong>Entered:</strong> examples{batchSize && epochs ? ', batch size, epochs, precision, optimizer' : ''} and any computer details. The Training tab stores update steps, not epochs.</li>
            <li><strong>Heuristic:</strong> thresholds are transparent classroom rules, not universal benchmarks. Actual speed depends on hardware, framework, data loading, and other software.</li>
            <li><strong>No fabricated benchmarks:</strong> the advisor does not predict execution times. Browser hardware detection is limited{detectedCores ? ` (${detectedCores} logical processors reported)` : ''}.</li>
            <li><strong>Memory:</strong> parameter storage is exact; total training memory is an estimate. Optimizer state, activations, data, and framework overhead are all larger than the weights alone.</li>
          </ul>
          <details className="advisor-rules">
            <summary>How the GPU rule works (classroom heuristic)</summary>
            <p>Unnecessary when parameters ≤ {HEURISTICS.unnecessaryGpu.maxParameters.toLocaleString()}, examples ≤ {HEURISTICS.unnecessaryGpu.maxExamples.toLocaleString()}, and updates ≤ {HEURISTICS.unnecessaryGpu.maxUpdates.toLocaleString()}. Optional up to {HEURISTICS.optionalGpu.maxParameters.toLocaleString()} parameters, {HEURISTICS.optionalGpu.maxExamples.toLocaleString()} examples, and {HEURISTICS.optionalGpu.maxUpdates.toLocaleString()} updates. Beyond that, evaluate a GPU. These are transparent teaching rules, not universal thresholds or benchmark results.</p>
          </details>
        </div>
      </div>

      <aside className="panel advisor-machine">
        <div className="advisor-section-head"><div><div className="eyebrow">Optional</div><h2>Your computer</h2></div></div>
        <p className="advisor-machine-note">These fields are yours; the browser does not reliably expose the full hardware. {detectedCores ? `Detected: ${detectedCores} logical processors` : 'No processor count was reported.'} {detectedMemory ? `· Browser memory hint: ${detectedMemory} GB` : ''}</p>
        <div className="advisor-machine-grid">
          <Field label="RAM (GB)" hint="You enter this.">
            <input type="number" min="1" step="1" value={ram} onChange={event => setRam(event.target.value)} aria-label="RAM (GB)"/>
          </Field>
          <Field label="CPU model" hint="You enter this; no benchmark is inferred.">
            <input type="text" value={cpu} onChange={event => setCpu(event.target.value)} placeholder="e.g. Ryzen 5 5600U" aria-label="CPU model"/>
          </Field>
          <Field label="Dedicated GPU" hint="Choose what you have.">
            <select value={hasGpu} onChange={event => setHasGpu(event.target.value as 'unknown' | 'none' | 'yes')} aria-label="Dedicated GPU">
              <option value="unknown">Not entered</option>
              <option value="none">No dedicated GPU</option>
              <option value="yes">Yes, I have one</option>
            </select>
          </Field>
          {hasGpu === 'yes' && <>
            <Field label="GPU model" hint="You enter this.">
              <input type="text" value={gpuModel} onChange={event => setGpuModel(event.target.value)} placeholder="e.g. RTX 3060" aria-label="GPU model"/>
            </Field>
            <Field label="GPU memory (GB)" hint="Compare with the estimate, not a benchmark.">
              <input type="number" min="1" step="1" value={gpuMemory} onChange={event => setGpuMemory(event.target.value)} aria-label="GPU memory (GB)"/>
            </Field>
          </>}
        </div>
        <div className="advisor-badges">
          {detectedCores && <span className="advisor-badge detected"><Icon name="monitor" size={12}/>Browser-detected: {detectedCores} logical processors</span>}
          {enteredHardware && <span className="advisor-badge entered"><Icon name="check" size={12}/>Includes details you entered</span>}
          {!enteredHardware && <span className="advisor-badge neutral">No computer details entered</span>}
        </div>
        <div className="advisor-gpu-memory">
          <h3>GPU memory is only relevant if you evaluate a GPU</h3>
          <p>{estimate.gpu === 'unnecessary'
            ? `For this workload the GPU path would need far less than 1 GB for the weights (${formatBytes(estimate.parameterStorageBytes)} of parameters). A dedicated GPU is unnecessary.`
            : `A rough lower bound for the model state is ${formatBytes(estimate.parameterStorageBytes + estimate.optimizerStateBytes)}; activations, framework, and data need more. Check the actual framework requirements rather than buying a card from this estimate.`}</p>
        </div>
      </aside>
    </section>

    <section className="panel advisor-memory" aria-labelledby="advisor-memory-title">
      <div className="advisor-section-head"><div><div className="eyebrow">Memory, carefully</div><h2 id="advisor-memory-title">Parameter storage is not total training memory</h2></div></div>
      <p className="advisor-memory-lead"><strong>{formatCount(estimate.totalParameters)} parameters × {estimate.bytesPerParameter} bytes = {formatBytes(estimate.parameterStorageBytes)}</strong> of parameter storage. Training also needs gradients, optimizer state, activations, the data, and framework overhead.</p>
      <div className="advisor-memory-grid">
        {memoryRows.map(([label, bytes, note]) => <div key={label} className="advisor-memory-row">
          <span>{label}</span><strong>{formatBytes(bytes)}</strong><small>{note}</small>
        </div>)}
      </div>
      <p className="advisor-memory-total">Rough training budget: <strong>{formatBytes(estimate.estimatedTrainingBytes)}</strong> · suggested RAM {estimate.suggestedRamGb} GB minimum, {estimate.comfortableRamGb} GB comfortable.</p>
      <p className="advisor-caveat">This is a transparent heuristic, not a memory measurement. Data loading, framework versions, batch size, and the operating system can change it substantially. Do not present parameter storage as a complete RAM or GPU-memory requirement.</p>
    </section>

    <section className="panel advisor-software" aria-labelledby="advisor-software-title">
      <div className="advisor-section-head"><div><div className="eyebrow">Software by learning objective</div><h2 id="advisor-software-title">Choose the tool for the job</h2></div></div>
      <div className="advisor-primary"><strong>Primary route for this experiment:</strong> {primaryRoute}</div>
      <div className="advisor-software-grid">
        {SOFTWARE_OPTIONS.map(option => <div className="advisor-software-card" key={option.id}>
          <span className="advisor-software-role">{option.role}</span>
          <h3>{option.name}</h3>
          <p>{option.bestFor}</p>
          <a href={option.link} target="_blank" rel="noreferrer">{option.linkLabel}<Icon name="next" size={13}/></a>
        </div>)}
      </div>
      <p className="advisor-caveat">The current app is enough for introductory exploration. Cloud GPU availability can vary, and installing PyTorch is optional until you need automatic gradients or larger workloads. Official links open in a new tab.</p>
    </section>

    <section className="panel advisor-education" aria-labelledby="advisor-education-title">
      <div className="advisor-section-head"><div><div className="eyebrow">Student questions</div><h2 id="advisor-education-title">The ideas behind the numbers</h2></div></div>
      <p className="advisor-house-line">House example: <strong>x₁ = area</strong>, <strong>x₂ = bedrooms</strong>, <strong>target = actual price</strong>, <strong>output = predicted price</strong>. The target is compared with the output; it is never an input feature.</p>
      <details><summary>Why do two input features not mean two training examples?</summary>
        <p>A feature is a column: area and bedrooms. An example is a row: one house. One thousand houses are 1,000 examples with 2 features each, not 2 examples. The network receives 2 input values per row.</p>
      </details>
      <details><summary>Why do 100 examples per batch not mean 100 weights?</summary>
        <p>A weight connects two units in the network. In a 2 → 3 → 1 network there are 2×3 + 3×1 = 9 weights, regardless of batch size. Batch size is the number of rows processed together before one optimizer update.</p>
      </details>
      <details><summary>Why is the same network reused for every batch?</summary>
        <p>There is one set of weights and biases. Each batch uses the current parameters, computes a loss, and updates those same parameters. You do not create a new network for each batch.</p>
      </details>
      <details><summary>Why do updated weights continue into the next batch and epoch?</summary>
        <p>After each optimizer step, the new weights are the starting point for the next batch. After the last batch, the next epoch starts from those learned weights; the network is not reinitialized.</p>
      </details>
      <details><summary>Why does adding hidden layers not automatically improve predictions?</summary>
        <p>A hidden layer adds capacity, which can help with complex patterns. It can also overfit, add computation, and make optimization harder. More layers are a design choice to compare on validation data, not a guaranteed improvement.</p>
      </details>
      <details><summary>Why should validation performance guide architecture comparisons?</summary>
        <p>Training loss can keep falling while the network memorizes the training houses. Validation houses are not used for weight updates, so their loss tests whether the learned pattern generalizes. Choose the design by validation performance, then open the test set once.</p>
      </details>
    </section>

    <section className="panel advisor-worked" aria-labelledby="advisor-worked-title">
      <div className="advisor-section-head">
        <div><div className="eyebrow">Worked example</div><h2 id="advisor-worked-title">The house-price network</h2></div>
        <button type="button" className="button small primary" onClick={useHouseSetup}><Icon name="home" size={14}/>Use this setup</button>
      </div>
      <p className="advisor-memory-lead">Fully connected <strong>2 → 3 → 1</strong> with biases, 1,000 training houses, batch size 100, 20 epochs.</p>
      <div className="advisor-worked-grid">
        <div><span>Weights</span><strong>9</strong><small>2×3 + 3×1</small></div>
        <div><span>Biases</span><strong>4</strong><small>3 + 1</small></div>
        <div><span>Trainable</span><strong>13</strong><small>9 + 4</small></div>
        <div><span>Batches / epoch</span><strong>10</strong><small>1,000 ÷ 100</small></div>
        <div><span>Updates / epoch</span><strong>10</strong><small>one per batch</small></div>
        <div><span>20 epochs</span><strong>200</strong><small>updates</small></div>
        <div><span>float32 storage</span><strong>52 B</strong><small>13 × 4 bytes</small></div>
        <div><span>CPU</span><strong>Appropriate</strong><small>GPU unnecessary</small></div>
      </div>
      <div className="advisor-worked-notes">
        <p><strong>All 100 houses in a batch use the same current parameters.</strong> The network predicts 100 prices, their losses are averaged, gradients are calculated, and the optimizer updates the 13 parameters once. The next batch starts from those updated parameters.</p>
        <p>Parameter storage is 52 bytes; total training memory is larger because of gradients, optimizer state, activations, data, and framework overhead. The tiny size is exactly why a CPU is a good fit.</p>
        <p><strong>15-second check:</strong> 9 weights + 4 biases = 13 parameters; 1,000 ÷ 100 = 10 batches; 10 × 20 = 200 updates.</p>
      </div>
    </section>
  </div>;
}
