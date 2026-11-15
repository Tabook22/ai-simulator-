import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './playground.css';
import {
  CLASSIFICATION_DATASETS, DATASET_META, FEATURE_OPTIONS, LEARNING_RATES,
  MAX_HIDDEN_LAYERS, MAX_NEURONS, REGRESSION_DATASETS, REGULARIZATION_RATES,
  datasetProblem, evaluate, featureVector, forward, makeDataset, makeNetwork,
  parameterCount, trainEpoch,
} from './playgroundModel';
import type {
  DatasetKind, FeatureKey, PlaygroundActivation, PlaygroundNetwork, PlaygroundPoint,
  ProblemType, Regularization,
} from './playgroundModel';
import { NetworkStage } from './NetworkStage';
import type { StageSelection } from './NetworkStage';
import { useI18n } from './i18n';

const DOMAIN = 6;
const DATA_COLORS = { positive: '#0877bd', negative: '#f59322', neutral: '#a8a39a' };

function colorFor(value: number, min: number, max: number) {
  const t = Math.max(0, Math.min(1, (value - min) / Math.max(1e-6, max - min)));
  const from = [245, 147, 34];
  const mid = [232, 234, 235];
  const to = [8, 119, 189];
  const [a, b, k] = t < 0.5 ? [from, mid, t * 2] : [mid, to, (t - 0.5) * 2];
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * k)},${Math.round(a[1] + (b[1] - a[1]) * k)},${Math.round(a[2] + (b[2] - a[2]) * k)})`;
}

function pointColor(point: PlaygroundPoint, problem: ProblemType) {
  if (problem === 'classification') return point.label >= 0 ? DATA_COLORS.positive : DATA_COLORS.negative;
  return colorFor(point.label, -1, 1);
}

function DatasetThumb({ kind, seed }: { kind: DatasetKind; seed: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.fillStyle = '#f7f5f1';
    context.fillRect(0, 0, 100, 100);
    const problem = datasetProblem(kind);
    const points = makeDataset(kind, seed, 0, 0.5, 120);
    for (const point of points) {
      context.fillStyle = pointColor(point, problem);
      context.fillRect((point.x + DOMAIN) / (DOMAIN * 2) * 100, (DOMAIN - point.y) / (DOMAIN * 2) * 100, 3, 3);
    }
  }, [kind, seed]);
  return <canvas ref={ref} width={100} height={100} className="tf-dataset-canvas" aria-hidden="true"/>;
}

function OutputHeatmap({
  network, features, focus, problem, points, showTest, discretize, version,
}: {
  network: PlaygroundNetwork | null;
  features: FeatureKey[];
  focus: { layer: number; neuron: number } | null;
  problem: ProblemType;
  points: PlaygroundPoint[];
  showTest: boolean;
  discretize: boolean;
  version: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const size = 300;
    const density = 72;
    const layer = focus?.layer ?? Math.max(0, (network?.layers.length ?? 1) - 1);
    const neuron = focus?.neuron ?? 0;
    context.clearRect(0, 0, 320, 320);
    context.fillStyle = '#f7f5f1';
    context.fillRect(0, 0, 320, 320);
    context.fillStyle = '#e8eaeb';
    context.fillRect(0, 0, size, size);
    for (let row = 0; row < density; row += 1) {
      for (let column = 0; column < density; column += 1) {
        const x = -DOMAIN + (column + 0.5) / density * DOMAIN * 2;
        const y = DOMAIN - (row + 0.5) / density * DOMAIN * 2;
        let value = 0;
        if (network) {
          const result = forwardValue(network, features, x, y, layer, neuron);
          value = result;
        }
        if (discretize) value = value >= 0 ? 1 : -1;
        context.fillStyle = problem === 'classification'
          ? (value >= 0 ? '#9cc7df' : '#f2c499')
          : colorFor(value, -1, 1);
        const cell = size / density;
        context.fillRect(column * cell, row * cell, cell + 0.5, cell + 0.5);
      }
    }
    for (const point of points) {
      if (point.split === 'test' && !showTest) continue;
      const px = (point.x + DOMAIN) / (DOMAIN * 2) * size;
      const py = (DOMAIN - point.y) / (DOMAIN * 2) * size;
      context.beginPath();
      context.arc(px, py, point.split === 'test' ? 2.4 : 2.1, 0, Math.PI * 2);
      context.fillStyle = pointColor(point, problem);
      context.fill();
      if (point.split === 'test') {
        context.strokeStyle = '#4a453d';
        context.lineWidth = 0.8;
        context.stroke();
      }
    }
    context.fillStyle = '#817a6e';
    context.font = '10px Inter, sans-serif';
    for (let tick = -6; tick <= 6; tick += 2) {
      const position = (tick + DOMAIN) / (DOMAIN * 2) * size;
      context.fillText(String(tick), Math.max(0, position - 5), size + 16);
      context.fillText(String(tick), 3, size - position + 3);
    }
  }, [network, features, focus, problem, points, showTest, discretize, version]);
  return <canvas ref={ref} width={320} height={320} className="tf-heatmap" aria-label="Network output over the input plane"/>;
}

function forwardValue(
  network: PlaygroundNetwork,
  features: FeatureKey[],
  x: number,
  y: number,
  layer: number,
  neuron: number,
) {
  const result = forward(network, featureVector({ x, y }, features));
  return result.activations[layer + 1]?.[neuron] ?? 0;
}

function LossChart({ history }: { history: { train: number; test: number }[] }) {
  const { t } = useI18n();
  if (history.length < 2) return <div className="tf-chart-empty">{t('Train to see the loss curve.')}</div>;
  const width = 300;
  const height = 60;
  const max = Math.max(0.05, ...history.flatMap(point => [point.train, point.test]));
  const x = (index: number) => 2 + index / Math.max(1, history.length - 1) * (width - 4);
  const y = (value: number) => height - 2 - value / max * (height - 4);
  const line = (key: 'train' | 'test') => history.map((point, index) => `${x(index)},${y(point[key])}`).join(' ');
  return <svg className="tf-chart" viewBox={`0 0 ${width} ${height}`} aria-label="Training and test loss">
    <polyline points={line('train')} fill="none" stroke="#111" strokeWidth="1.4"/>
    <polyline points={line('test')} fill="none" stroke="#8b857a" strokeWidth="1.2"/>
  </svg>;
}

export function Playground() {
  const { t } = useI18n();
  const [dataset, setDataset] = useState<DatasetKind>('circle');
  const [problem, setProblem] = useState<ProblemType>('classification');
  const [seed, setSeed] = useState(42);
  const [ratio, setRatio] = useState(50);
  const [noise, setNoise] = useState(0);
  const [batchSize, setBatchSize] = useState(10);
  const [features, setFeatures] = useState<FeatureKey[]>(['x1', 'x2']);
  const [hidden, setHidden] = useState<number[]>([4, 2]);
  const [activation, setActivation] = useState<PlaygroundActivation>('tanh');
  const [learningRate, setLearningRate] = useState(0.03);
  const [regularization, setRegularization] = useState<Regularization>('none');
  const [regularizationRate, setRegularizationRate] = useState(0);
  const [showTest, setShowTest] = useState(false);
  const [discretize, setDiscretize] = useState(false);
  const [running, setRunning] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const [updates, setUpdates] = useState(0);
  const [trainLoss, setTrainLoss] = useState<number | null>(null);
  const [testLoss, setTestLoss] = useState<number | null>(null);
  const [history, setHistory] = useState<{ train: number; test: number }[]>([]);
  const [version, setVersion] = useState(0);
  const [selected, setSelected] = useState<StageSelection | null>(null);
  const [focus, setFocus] = useState<{ layer: number; neuron: number } | null>(null);
  const networkRef = useRef<PlaygroundNetwork | null>(null);
  const epochRef = useRef(0);

  const data = useMemo(
    () => makeDataset(dataset, seed, noise / 100, ratio / 100),
    [dataset, seed, noise, ratio],
  );
  const trainPoints = useMemo(() => data.filter(point => point.split === 'train'), [data]);
  const testPoints = useMemo(() => data.filter(point => point.split === 'test'), [data]);
  const featureKey = features.join(',');
  const hiddenKey = hidden.join(',');

  const resetNetwork = useCallback(() => {
    setRunning(false);
    networkRef.current = makeNetwork(features.length, hidden, activation, problem, seed);
    epochRef.current = 0;
    setEpoch(0);
    setUpdates(0);
    setTrainLoss(null);
    setTestLoss(null);
    setHistory([]);
    setSelected(null);
    setFocus(null);
    setVersion(value => value + 1);
  }, [features.length, featureKey, hiddenKey, activation, problem, seed, regularization, regularizationRate, batchSize]);

  useEffect(() => {
    resetNetwork();
  }, [data, resetNetwork]);

  const trainOnce = useCallback(() => {
    const network = networkRef.current;
    if (!network) return;
    const result = trainEpoch(network, trainPoints, features, {
      batchSize, learningRate, regularization, regularizationRate,
      seed: seed + epochRef.current * 7919,
    });
    const train = evaluate(network, trainPoints, features, problem);
    const test = evaluate(network, testPoints, features, problem);
    epochRef.current += 1;
    setEpoch(epochRef.current);
    setUpdates(value => value + result.updates);
    setTrainLoss(train.loss);
    setTestLoss(test.loss);
    setHistory(current => [...current.slice(-119), { train: train.loss, test: test.loss }]);
    setVersion(value => value + 1);
  }, [batchSize, learningRate, regularization, regularizationRate, seed, trainPoints, testPoints, features, problem]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(trainOnce, 80);
    return () => window.clearInterval(timer);
  }, [running, trainOnce]);

  function chooseDataset(next: DatasetKind) {
    setDataset(next);
    setProblem(datasetProblem(next));
    setSeed(value => value + 1);
  }

  function chooseProblem(next: ProblemType) {
    setProblem(next);
    setDataset(next === 'classification' ? 'circle' : 'plane');
    setSeed(value => value + 1);
  }

  function toggleFeature(key: FeatureKey) {
    setFeatures(current => {
      if (current.includes(key)) return current.length === 1 ? current : current.filter(item => item !== key);
      return [...current, key];
    });
  }

  function addLayer() {
    if (hidden.length < MAX_HIDDEN_LAYERS) setHidden(current => [...current, 2]);
  }

  function removeLayer() {
    if (hidden.length > 0) setHidden(current => current.slice(0, -1));
  }

  function changeNeurons(index: number, delta: number) {
    setHidden(current => current.map((value, at) =>
      at === index ? Math.max(1, Math.min(MAX_NEURONS, value + delta)) : value));
  }

  function editWeight(layer: number, neuron: number, source: number, value: number) {
    const network = networkRef.current;
    if (!network) return;
    network.layers[layer].weights[neuron][source] = value;
    setRunning(false);
    setVersion(current => current + 1);
  }

  function editBias(layer: number, neuron: number, value: number) {
    const network = networkRef.current;
    if (!network) return;
    network.layers[layer].biases[neuron] = value;
    setRunning(false);
    setVersion(current => current + 1);
  }

  const datasets = problem === 'classification' ? CLASSIFICATION_DATASETS : REGRESSION_DATASETS;
  const selectedNodeFocus = selected?.kind === 'node' ? { layer: selected.layer, neuron: selected.neuron } : null;
  const outputFocus = focus ?? selectedNodeFocus;
  const selectedWeight = selected?.kind === 'edge' && selected.source !== undefined && networkRef.current
    ? networkRef.current.layers[selected.layer]?.weights[selected.neuron]?.[selected.source] : undefined;
  const selectedBias = selected?.kind === 'node' && networkRef.current
    ? networkRef.current.layers[selected.layer]?.biases[selected.neuron] : undefined;

  return <div className="tf-playground">
    <header className="tf-intro">
      <div>
        <div className="tf-kicker">{t('2D playground · TensorFlow Playground-style')}</div>
        <h1>{t('Tinker with a neural network')}</h1>
        <p>{t('Pick a pattern, choose features, add hidden layers, and press Play. Change one thing at a time. You cannot break it.')}</p>
      </div>
      <a href="https://playground.tensorflow.org/" target="_blank" rel="noreferrer">{t('Based on TensorFlow Playground')}</a>
    </header>

    <div className="tf-board">
      <div className="tf-toolbar">
        <div className="tf-run">
          <button type="button" className="tf-icon" onClick={() => { setRunning(false); resetNetwork(); }} aria-label={t('Reset')}>↺</button>
          <button type="button" className={`tf-play ${running ? 'playing' : ''}`} onClick={() => setRunning(value => !value)} aria-label={running ? t('Pause') : t('Play')}>
            {running ? '❚❚' : '▶'}
          </button>
          <button type="button" className="tf-icon" onClick={() => { setRunning(false); trainOnce(); }} aria-label={t('Step one epoch')}>▶|</button>
          <div className="tf-epoch"><span>{t('Epoch')}</span><strong>{String(epoch).padStart(6, '0')}</strong></div>
        </div>
        <label>{t('Learning rate')}
          <select value={learningRate} aria-label={t('Learning rate')} onChange={event => setLearningRate(Number(event.target.value))}>
            {LEARNING_RATES.map(value => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label>{t('Activation')}
          <select value={activation} aria-label={t('Activation')} onChange={event => setActivation(event.target.value as PlaygroundActivation)}>
            <option value="tanh">Tanh</option><option value="relu">ReLU</option>
            <option value="sigmoid">Sigmoid</option><option value="linear">Linear</option>
          </select>
        </label>
        <label>{t('Regularization')}
          <select value={regularization} aria-label={t('Regularization')} onChange={event => setRegularization(event.target.value as Regularization)}>
            <option value="none">{t('None')}</option><option value="l1">L1</option><option value="l2">L2</option>
          </select>
        </label>
        <label>{t('Regularization rate')}
          <select value={regularizationRate} aria-label={t('Regularization rate')} onChange={event => setRegularizationRate(Number(event.target.value))}>
            {REGULARIZATION_RATES.map(value => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label>{t('Problem type')}
          <select value={problem} aria-label={t('Problem type')} onChange={event => chooseProblem(event.target.value as ProblemType)}>
            <option value="classification">{t('Classification')}</option><option value="regression">{t('Regression')}</option>
          </select>
        </label>
      </div>

      <div className="tf-columns">
        <aside className="tf-data">
          <h2>{t('DATA')}</h2>
          <p className="tf-side-question">{t('Which dataset do you want to use?')}</p>
          <div className="tf-dataset-grid">
            {datasets.map(kind => <button type="button" key={kind}
              className={`tf-dataset ${dataset === kind ? 'selected' : ''}`} aria-pressed={dataset === kind}
              onClick={() => chooseDataset(kind)}>
              <DatasetThumb kind={kind} seed={seed}/>
              <span>{t(DATASET_META[kind].label)}</span>
            </button>)}
          </div>
          <p className="tf-data-note">{t(DATASET_META[dataset].description)}</p>
          <label className="tf-slider">{t('Ratio of training to test data')} <strong>{ratio}%</strong>
            <input type="range" min="10" max="90" step="5" value={ratio} onChange={event => setRatio(Number(event.target.value))}/>
          </label>
          <label className="tf-slider">{t('Noise')} <strong>{noise}</strong>
            <input type="range" min="0" max="50" step="1" value={noise} onChange={event => setNoise(Number(event.target.value))}/>
          </label>
          <label className="tf-slider">{t('Batch size')} <strong>{batchSize}</strong>
            <input type="range" min="1" max="50" step="1" value={batchSize} onChange={event => setBatchSize(Number(event.target.value))}/>
          </label>
          <button type="button" className="tf-regenerate" onClick={() => setSeed(value => value + 1)}>{t('Regenerate')}</button>
        </aside>

        <section className="tf-network" aria-label={t('Live network')}>
          <div className="tf-network-header">
            <div><h2>{t('FEATURES')}</h2><p>{t('Click a feature tile to include it. Hover a neuron to see its map in Output. Dots move only while Play is active.')}</p></div>
            <span className={`tf-live ${running ? 'on' : ''}`}><i/>{running ? t('Live training') : t('Paused')}</span>
            <div className="tf-architecture">
              <span>{t('Hidden layers')}</span>
              <button type="button" onClick={removeLayer} disabled={hidden.length === 0} aria-label={t('Remove hidden layer')}>−</button>
              <strong>{hidden.length}</strong>
              <button type="button" onClick={addLayer} disabled={hidden.length === MAX_HIDDEN_LAYERS} aria-label={t('Add hidden layer')}>+</button>
              {hidden.map((size, index) => <span className="tf-layer-ctl" key={index}>
                L{index + 1}
                <button type="button" onClick={() => changeNeurons(index, -1)} disabled={size <= 1} aria-label={t('Remove neuron from hidden layer')}>−</button>
                <strong>{size}</strong>
                <button type="button" onClick={() => changeNeurons(index, 1)} disabled={size >= MAX_NEURONS} aria-label={t('Add neuron to hidden layer')}>+</button>
              </span>)}
            </div>
          </div>
          <NetworkStage
            network={networkRef.current}
            features={features}
            version={version}
            problem={problem}
            active={running}
            selected={selected}
            onSelect={setSelected}
            onToggleFeature={toggleFeature}
            onFocusNode={(layer, neuron) => setFocus(layer === null || neuron === null ? null : { layer, neuron })}
          />
          <fieldset className="tf-sr-only">
            <legend>Feature inputs</legend>
            {FEATURE_OPTIONS.map(option => <button type="button" key={option.key}
              aria-pressed={features.includes(option.key)} onClick={() => toggleFeature(option.key)}>
              {option.label} — {option.short}
            </button>)}
          </fieldset>
          <div className="tf-inspector">
            {!selected && <span>{t('Click a feature to toggle it, a neuron to inspect its bias, or a connection to edit its weight. Hover a neuron to preview its output.')}</span>}
            {selected?.kind === 'edge' && selectedWeight !== undefined && <label>
              {t('Weight')} <strong>{selectedWeight.toFixed(2)}</strong>
              <input type="range" min="-2" max="2" step="0.01" value={selectedWeight}
                aria-label={t('Weight')}
                onChange={event => editWeight(selected.layer, selected.neuron, selected.source!, Number(event.target.value))}/>
            </label>}
            {selected?.kind === 'node' && selectedBias !== undefined && <label>
              {t('Bias')} <strong>{selectedBias.toFixed(2)}</strong>
              <input type="range" min="-2" max="2" step="0.01" value={selectedBias}
                aria-label={t('Bias')}
                onChange={event => editBias(selected.layer, selected.neuron, Number(event.target.value))}/>
            </label>}
          </div>
        </section>

        <aside className="tf-output">
          <h2>{t('OUTPUT')}</h2>
          <div className="tf-losses">
            <div><span>{t('Test loss')}</span><strong>{testLoss === null ? '—' : testLoss.toFixed(3)}</strong></div>
            <div><span>{t('Training loss')}</span><strong>{trainLoss === null ? '—' : trainLoss.toFixed(3)}</strong></div>
          </div>
          <OutputHeatmap network={networkRef.current} features={features} focus={outputFocus}
            problem={problem} points={data} showTest={showTest} discretize={discretize} version={version}/>
          <div className="tf-output-options">
            <label><input type="checkbox" checked={showTest} onChange={event => setShowTest(event.target.checked)}/>{t('Show test data')}</label>
            <label><input type="checkbox" checked={discretize} onChange={event => setDiscretize(event.target.checked)}/>{t('Discretize output')}</label>
          </div>
          <div className="tf-legend"><span>−1</span><i/><span>0</span><i/><span>1</span>
            <small>{t('colors show data, neuron, and weight values')}</small>
          </div>
          <LossChart history={history}/>
          <div className="tf-output-meta">{t('{count} updates · {params} parameters', {
            count: updates,
            params: parameterCount(networkRef.current ?? makeNetwork(features.length, hidden, activation, problem, seed)),
          })}</div>
        </aside>
      </div>
    </div>
  </div>;
}
