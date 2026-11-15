import type { Network } from './model';

export type Precision = 'float32' | 'float16' | 'bfloat16' | 'float64';
export type Optimizer = 'sgd' | 'adam';
export type GpuVerdict = 'unnecessary' | 'optional' | 'worth evaluating' | 'unsupported';

export interface AdvisorConfig {
  examples: number;
  batchSize: number;
  epochs: number;
  precision: Precision;
  optimizer: Optimizer;
}

export interface LayerParameters {
  index: number;
  inputUnits: number;
  outputUnits: number;
  weights: number;
  biases: number;
  activation: string;
}

export interface AdvisorEstimate {
  supported: boolean;
  architecture: string;
  features: number;
  outputs: number;
  weights: number;
  biases: number;
  totalParameters: number;
  layers: LayerParameters[];
  batchesPerEpoch: number;
  updates: number;
  bytesPerParameter: number;
  parameterStorageBytes: number;
  optimizerStateBytes: number;
  activationBytes: number;
  dataBytes: number;
  frameworkBytes: number;
  estimatedTrainingBytes: number;
  suggestedRamGb: number;
  comfortableRamGb: number;
  gpu: GpuVerdict;
}

const BYTES: Record<Precision, number> = {
  float32: 4,
  float16: 2,
  bfloat16: 2,
  float64: 8,
};

/**
 * Transparent classroom heuristics, not hardware benchmarks.
 * They are deliberately conservative: tiny teaching networks stay on the CPU.
 */
export const HEURISTICS = {
  unnecessaryGpu: { maxParameters: 100_000, maxExamples: 50_000, maxUpdates: 5_000 },
  optionalGpu: { maxParameters: 2_000_000, maxExamples: 500_000, maxUpdates: 50_000 },
  frameworkOverheadBytes: 1_500_000_000,
  activationFactor: 6,
  ramSteps: [4, 8, 16, 32, 64],
} as const;

export function precisionLabel(precision: Precision) {
  return precision === 'float32' ? 'float32' : precision === 'float64' ? 'float64' : precision;
}

export function optimizerLabel(optimizer: Optimizer) {
  return optimizer === 'adam' ? 'Adam' : 'SGD';
}

export function calculateParameters(network: Network): {
  layers: LayerParameters[];
  weights: number;
  biases: number;
  total: number;
} {
  const layers = network.layers.map((layer, index) => {
    const inputUnits = index === 0 ? network.inputs.length : network.layers[index - 1].weights.length;
    const outputUnits = layer.weights.length;
    const weights = layer.weights.reduce((sum, row) => sum + row.length, 0);
    const biases = layer.biases.length;
    return {
      index,
      inputUnits,
      outputUnits,
      weights,
      biases,
      activation: layer.activation,
    };
  });
  const weights = layers.reduce((sum, layer) => sum + layer.weights, 0);
  const biases = layers.reduce((sum, layer) => sum + layer.biases, 0);
  return { layers, weights, biases, total: weights + biases };
}

export function calculateEstimate(network: Network, config: AdvisorConfig): AdvisorEstimate {
  const params = calculateParameters(network);
  const architecture = [network.inputs.length, ...network.layers.map(layer => layer.weights.length)].join(' → ');
  const examples = Number.isFinite(config.examples) && config.examples > 0 ? Math.floor(config.examples) : 0;
  const batchSize = Number.isFinite(config.batchSize) && config.batchSize > 0 ? Math.floor(config.batchSize) : 0;
  const epochs = Number.isFinite(config.epochs) && config.epochs > 0 ? Math.floor(config.epochs) : 0;
  const batchesPerEpoch = examples > 0 && batchSize > 0 ? Math.ceil(examples / batchSize) : 0;
  const updates = batchesPerEpoch * epochs;
  const bytesPerParameter = BYTES[config.precision] ?? 4;
  const parameterStorageBytes = params.total * bytesPerParameter;
  const optimizerStateBytes = parameterStorageBytes * (config.optimizer === 'adam' ? 3 : 1);
  const maxWidth = Math.max(network.inputs.length, ...network.layers.map(layer => layer.weights.length));
  const activationBytes = batchSize * maxWidth * bytesPerParameter * HEURISTICS.activationFactor;
  const dataBytes = examples * (network.inputs.length + network.layers.at(-1)!.weights.length) * bytesPerParameter;
  const estimatedTrainingBytes = parameterStorageBytes
    + optimizerStateBytes
    + activationBytes * 2
    + dataBytes
    + HEURISTICS.frameworkOverheadBytes;
  const estimatedGb = estimatedTrainingBytes / 1_000_000_000;
  const minimum = HEURISTICS.ramSteps.find(step => step >= estimatedGb + 2) ?? 64;
  const suggestedRamGb = Math.max(4, minimum);
  const comfortableRamGb = Math.max(8, suggestedRamGb);

  let gpu: GpuVerdict = 'unsupported';
  if (params.total > 0) {
    const tiny = params.total <= HEURISTICS.unnecessaryGpu.maxParameters
      && examples <= HEURISTICS.unnecessaryGpu.maxExamples
      && updates <= HEURISTICS.unnecessaryGpu.maxUpdates;
    const medium = params.total <= HEURISTICS.optionalGpu.maxParameters
      && examples <= HEURISTICS.optionalGpu.maxExamples
      && updates <= HEURISTICS.optionalGpu.maxUpdates;
    gpu = tiny ? 'unnecessary' : medium ? 'optional' : 'worth evaluating';
  }

  return {
    supported: network.layers.every((layer, index) => {
      const inputUnits = index === 0 ? network.inputs.length : network.layers[index - 1].weights.length;
      return layer.weights.length > 0 && layer.weights.every(row => row.length === inputUnits);
    }),
    architecture,
    features: network.inputs.length,
    outputs: network.layers.at(-1)?.weights.length ?? 0,
    weights: params.weights,
    biases: params.biases,
    totalParameters: params.total,
    layers: params.layers,
    batchesPerEpoch,
    updates,
    bytesPerParameter,
    parameterStorageBytes,
    optimizerStateBytes,
    activationBytes,
    dataBytes,
    frameworkBytes: HEURISTICS.frameworkOverheadBytes,
    estimatedTrainingBytes,
    suggestedRamGb,
    comfortableRamGb,
    gpu,
  };
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '—';
  if (bytes < 1_000) return `${bytes.toFixed(0)} B`;
  if (bytes < 1_000_000) return `${(bytes / 1_000).toFixed(1)} KB`;
  if (bytes < 1_000_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${(bytes / 1_000_000_000).toFixed(2)} GB`;
}

export function formatCount(value: number) {
  return Number.isFinite(value) ? Math.floor(value).toLocaleString() : '—';
}

export interface SoftwareOption {
  id: string;
  name: string;
  role: string;
  bestFor: string;
  link: string;
  linkLabel: string;
}

export const SOFTWARE_OPTIONS: SoftwareOption[] = [
  {
    id: 'playground',
    name: 'Browser playground',
    role: 'Visual exploration',
    bestFor: 'Seeing how inputs, weights, and hidden layers change a prediction without installing anything.',
    link: 'https://playground.tensorflow.org/',
    linkLabel: 'TensorFlow Playground',
  },
  {
    id: 'numpy',
    name: 'Python + NumPy',
    role: 'Understanding the mathematics',
    bestFor: 'Rebuilding the forward pass, gradients, and parameter counts by hand in a notebook.',
    link: 'https://numpy.org/install/',
    linkLabel: 'Install NumPy',
  },
  {
    id: 'pytorch',
    name: 'Python + PyTorch',
    role: 'Training with automatic gradients',
    bestFor: 'Moving from hand-written equations to `autograd`, tensors, and GPU acceleration.',
    link: 'https://pytorch.org/get-started/locally/',
    linkLabel: 'PyTorch install guide',
  },
  {
    id: 'colab',
    name: 'Google Colab',
    role: 'No local installation',
    bestFor: 'Running a notebook in the browser when you do not want to set up Python or a GPU locally.',
    link: 'https://colab.research.google.com/',
    linkLabel: 'Open Colab',
  },
  {
    id: 'jupyter',
    name: 'Jupyter Notebook',
    role: 'Local development',
    bestFor: 'Reading code, plots, and explanations together on your own computer.',
    link: 'https://jupyter.org/install',
    linkLabel: 'Install Jupyter',
  },
  {
    id: 'vscode',
    name: 'VS Code + Python',
    role: 'Local development',
    bestFor: 'Editing full projects, running scripts, and debugging a Python environment.',
    link: 'https://code.visualstudio.com/docs/python/python-tutorial',
    linkLabel: 'VS Code Python tutorial',
  },
];
