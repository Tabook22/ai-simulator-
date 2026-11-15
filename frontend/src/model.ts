export type Numeric = number | string;
export type Activation = 'linear' | 'relu' | 'sigmoid' | 'tanh';

export interface Layer {
  activation: Activation;
  weights: Numeric[][];
  biases: Numeric[];
}

export interface Network {
  inputs: Numeric[];
  layers: Layer[];
  seed: Numeric;
}

export interface Trace {
  inputs: number[];
  weights: number[];
  products: number[];
  sum: number;
  bias: number;
  z: number;
  output: number;
}

export interface Forward {
  layers: { activation: Activation; neurons: Trace[] }[];
  outputs: number[];
}

export interface Example {
  label: string;
  inputs: Numeric[];
  targets: Numeric[];
}

export interface TrainingSettings {
  learning_rate: Numeric;
  steps: Numeric;
  examples: Example[];
}

export interface Connection {
  layer: number;
  neuron: number;
  source: number;
}

export interface TrainingResult {
  network: Network;
  forward: Forward;
  history: number[];
  before: { predictions: number[][]; loss: number };
  after: { predictions: number[][]; loss: number };
  weight: { connection: Connection; old: number; gradient: number; new: number; rate: number };
}

export interface BackwardLayer {
  output_gradient: number[];
  deltas: number[];
  weight_gradients: number[][];
  bias_gradients: number[];
  input_gradient: number[];
}

export interface BackpropLayer {
  activation: Activation;
  inputs: number[];
  weights: number[][];
  biases: number[];
  products: number[][];
  sums: number[];
  z: number[];
  outputs: number[];
  /** f′(z) for every neuron: the factor the error is multiplied by on the way back. */
  slopes: number[];
}

export interface BackpropResult {
  network: Network;
  inputs: number[];
  targets: number[];
  learning_rate: number;
  forward: { layers: BackpropLayer[]; prediction: number[] };
  loss: number;
  output_gradient: number[];
  backward: { layers: BackwardLayer[] };
  updated: {
    network: Network;
    forward: { layers: BackpropLayer[]; prediction: number[] };
    loss: number;
  };
}

export interface AutoBackpropResult {
  before: { prediction: number[]; loss: number };
  history: number[];
  best: { step: number; loss: number; network: Network; prediction: number[] };
  final: { loss: number; network: Network; prediction: number[] };
  stopped: string;
}

export interface HouseMetrics { mae: number; rmse: number }
export interface HouseSample { area: number; bedrooms: number; actual: number; predicted: number }
export interface HouseResult {
  dataset: {
    name: string;
    features: { name: string; unit: string }[];
    target: string;
    unit: string;
    counts: { train: number; validation: number; test: number };
    samples: HouseSample[];
    batch_size: number;
    batches_per_epoch: number;
    feature_mean: number[];
    feature_std: number[];
    target_mean_omr: number;
    target_std_omr: number;
  };
  network: {
    inputs: number;
    hidden: number;
    outputs: number;
    weights: number;
    biases: number;
    layers: { activation: Activation; weights: number[][]; biases: number[] }[];
    final_layers: { activation: Activation; weights: number[][]; biases: number[] }[];
  };
  history: { train_rmse: number[]; validation_rmse: number[] };
  batch_losses: number[];
  initial: { train: HouseMetrics; validation: HouseMetrics; test: HouseMetrics };
  final: { train: HouseMetrics; validation: HouseMetrics; test: HouseMetrics };
  predictions: HouseSample[];
  epochs: number;
  updates: number;
}

export interface LoadedLesson {
  name: string;
  network: Network;
  forward: Forward | null;
  warning?: string;
  training?: TrainingSettings | null;
}

export interface SavedLesson {
  id: number;
  name: string;
}

export const activations: Record<Activation, { name: string; equation: string; slope: string; range: string; idea: string }> = {
  linear: { name: 'Linear', equation: 'f(z) = z', slope: 'f′(z) = 1', range: 'any number',
    idea: 'Passes the total through unchanged. It never switches off, but it also never adds a bend.' },
  relu: { name: 'ReLU', equation: 'f(z) = max(0, z)', slope: 'f′(z) = 1 if z > 0, else 0', range: '0 and up',
    idea: 'A gate: positive totals pass through, negative totals become 0 and the neuron goes silent.' },
  sigmoid: { name: 'Sigmoid', equation: 'f(z) = 1 / (1 + e^(−z))', slope: 'f′(z) = a × (1 − a)', range: 'between 0 and 1',
    idea: 'Squashes any total into a score between 0 and 1. Large totals flatten out, so the slope gets tiny.' },
  tanh: { name: 'Tanh', equation: 'f(z) = tanh(z)', slope: 'f′(z) = 1 − a²', range: 'between −1 and 1',
    idea: 'Squashes any total into a score between −1 and 1, centred on zero.' },
};

export function substitution(activation: Activation, z: string) {
  if (activation === 'relu') return `max(0, ${z})`;
  if (activation === 'sigmoid') return `1 / (1 + e^(−(${z})))`;
  if (activation === 'tanh') return `tanh(${z})`;
  return z;
}

export function layerName(index: number, count: number) {
  if (index < 0) return 'Inputs';
  return index === count - 1 ? 'Outputs' : `Hidden Layer ${index + 1}`;
}

export function neuronName(layer: number, neuron: number, count: number) {
  if (layer < 0) return `Input ${neuron + 1}`;
  return layer === count - 1 ? `Output ${neuron + 1}` : `Hidden ${layer + 1} · Neuron ${neuron + 1}`;
}

export function format(value: number, exact = false) {
  if (exact) return String(value);
  if (Math.abs(value) >= 1e6 || (value !== 0 && Math.abs(value) < 0.0001)) return value.toExponential(2);
  return String(Number(value.toFixed(4)));
}

/** Wrap a negative addend in parentheses without losing its sign. */
export function addend(value: number) {
  return value < 0 ? `(${format(value)})` : format(value);
}

/** The scalar activation rule used in explanations and the tutor. */
export function applyActivation(activation: Activation, z: number) {
  if (activation === 'relu') return Math.max(0, z);
  if (activation === 'sigmoid') return 1 / (1 + Math.exp(-z));
  if (activation === 'tanh') return Math.tanh(z);
  return z;
}

/** The slope f′(z): how much the output moves when z moves a little. Backprop multiplies by it. */
export function activationSlope(activation: Activation, z: number) {
  if (activation === 'relu') return z > 0 ? 1 : 0;
  if (activation === 'sigmoid') { const a = applyActivation('sigmoid', z); return a * (1 - a); }
  if (activation === 'tanh') return 1 - Math.tanh(z) ** 2;
  return 1;
}

export function finite(value: Numeric, label: string) {
  const number = typeof value === 'number' ? value : Number(value);
  if (String(value).trim() === '' || !Number.isFinite(number)) throw new Error(`${label} needs a finite number.`);
  return number;
}

export function networkPayload(network: Network) {
  const seed = finite(network.seed, 'Seed');
  if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295) {
    throw new Error('Use a whole-number seed between 0 and 4294967295.');
  }
  return {
    seed,
    inputs: network.inputs.map((value, index) => finite(value, `Input ${index + 1}`)),
    layers: network.layers.map((layer, index) => ({
      activation: layer.activation,
      biases: layer.biases.map((value, neuron) =>
        finite(value, `${neuronName(index, neuron, network.layers.length)} bias`)),
      weights: layer.weights.map((row, neuron) => row.map((value, source) =>
        finite(value, `${neuronName(index, neuron, network.layers.length)} weight ${source + 1}`))),
    })),
  };
}

export function trainingPayload(settings: TrainingSettings, stepsOverride?: number) {
  const rate = finite(settings.learning_rate, 'Learning rate');
  const steps = stepsOverride ?? finite(settings.steps, 'Steps');
  if (rate <= 0 || rate > 10) throw new Error('Use a learning rate above 0 and at most 10.');
  if (!Number.isInteger(steps) || steps < 1 || steps > 500) {
    throw new Error('Choose a whole number of steps between 1 and 500.');
  }
  return {
    learning_rate: rate,
    steps,
    examples: settings.examples.map((row, index) => ({
      label: row.label,
      inputs: row.inputs.map((value, cell) => finite(value, `Row ${index + 1}, input ${cell + 1}`)),
      targets: row.targets.map((value, cell) => finite(value, `Row ${index + 1}, target ${cell + 1}`)),
    })),
  };
}

export function blankExample(inputs: number, outputs: number): Example {
  return { label: '', inputs: Array(inputs).fill(''), targets: Array(outputs).fill('') };
}

export async function api<T>(path: string, body?: unknown, method = body === undefined ? 'GET' : 'POST'): Promise<T> {
  const connectionError = 'Neuron Lab could not reach the local server. Check that the backend is running.';
  const response = await fetch(`/api${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).catch(() => { throw new Error(connectionError); });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || connectionError);
  }
  return response.status === 204 ? undefined as T : response.json();
}
