import { applyActivation } from './model';
import type { Activation } from './model';

export type ProblemType = 'classification' | 'regression';
export type DatasetKind = 'circle' | 'xor' | 'gaussian' | 'spiral' | 'plane' | 'reg-gaussian';
export type PlaygroundActivation = Activation;
export type FeatureKey = 'x1' | 'x2' | 'x1sq' | 'x2sq' | 'x1x2' | 'sinx1' | 'sinx2';
export type Regularization = 'none' | 'l1' | 'l2';

export interface FeatureOption {
  key: FeatureKey;
  label: string;
  short: string;
}

export interface PlaygroundPoint {
  x: number;
  y: number;
  label: number;
  split: 'train' | 'test';
}

export interface PlaygroundLayer {
  weights: number[][];
  biases: number[];
  activation: PlaygroundActivation;
}

export interface PlaygroundNetwork {
  layers: PlaygroundLayer[];
}

export interface PlaygroundMetrics {
  loss: number;
  accuracy: number;
}

export interface PlaygroundEpochResult {
  loss: number;
  updates: number;
}

export interface DatasetMeta {
  label: string;
  problem: ProblemType;
  description: string;
}

export const FEATURE_OPTIONS: FeatureOption[] = [
  { key: 'x1', label: 'X₁', short: 'horizontal position' },
  { key: 'x2', label: 'X₂', short: 'vertical position' },
  { key: 'x1sq', label: 'X₁²', short: 'horizontal squared' },
  { key: 'x2sq', label: 'X₂²', short: 'vertical squared' },
  { key: 'x1x2', label: 'X₁X₂', short: 'interaction' },
  { key: 'sinx1', label: 'sin(X₁)', short: 'horizontal wave' },
  { key: 'sinx2', label: 'sin(X₂)', short: 'vertical wave' },
];

export const DATASET_META: Record<DatasetKind, DatasetMeta> = {
  circle: {
    label: 'Circle',
    problem: 'classification',
    description: 'Points inside a circle versus points outside it.',
  },
  xor: {
    label: 'XOR',
    problem: 'classification',
    description: 'Alternating quadrants — no single straight boundary separates them.',
  },
  gaussian: {
    label: 'Gaussian',
    problem: 'classification',
    description: 'Two separated, overlapping Gaussian clusters.',
  },
  spiral: {
    label: 'Spiral',
    problem: 'classification',
    description: 'Two intertwined arms that need a wavy boundary.',
  },
  plane: {
    label: 'Plane',
    problem: 'regression',
    description: 'A smooth plane: the target rises diagonally across the space.',
  },
  'reg-gaussian': {
    label: 'Gaussian',
    problem: 'regression',
    description: 'Six alternating Gaussian bumps form a continuous target surface.',
  },
};

export const CLASSIFICATION_DATASETS: DatasetKind[] = ['circle', 'xor', 'gaussian', 'spiral'];
export const REGRESSION_DATASETS: DatasetKind[] = ['plane', 'reg-gaussian'];
export const LEARNING_RATES = [0.00001, 0.0001, 0.001, 0.003, 0.01, 0.03, 0.1, 0.3, 1, 3, 10];
export const REGULARIZATION_RATES = [0, 0.001, 0.003, 0.01, 0.03, 0.1, 0.3, 1, 3, 10];
export const MAX_HIDDEN_LAYERS = 6;
export const MAX_NEURONS = 8;
export const DOMAIN_RADIUS = 6;
export const CLASSIFICATION_SAMPLES = 500;
export const REGRESSION_SAMPLES = 1200;

export function mulberry32(seed: number) {
  let value = seed >>> 0;
  return () => {
    value |= 0;
    value = (value + 0x6D2B79F5) | 0;
    let next = Math.imul(value ^ (value >>> 15), 1 | value);
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next;
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(rng: () => number, mean = 0, variance = 1) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  const standard = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return mean + Math.sqrt(variance) * standard;
}

function clamp(value: number, min = -DOMAIN_RADIUS, max = DOMAIN_RADIUS) {
  return Math.max(min, Math.min(max, value));
}

function classifyCircle(rng: () => number, count: number, noise: number): PlaygroundPoint[] {
  const points: PlaygroundPoint[] = [];
  const radius = 5;
  for (let index = 0; index < count; index += 1) {
    const label = index % 2 === 0 ? 1 : -1;
    const r = label === 1 ? Math.sqrt(rng()) * radius * 0.5 : radius * 0.7 + Math.sqrt(rng()) * radius * 0.3;
    const angle = rng() * Math.PI * 2;
    const noiseX = (rng() * 2 - 1) * radius * noise;
    const noiseY = (rng() * 2 - 1) * radius * noise;
    const x = r * Math.sin(angle);
    const y = r * Math.cos(angle);
    const noisyX = clamp(x + noiseX);
    const noisyY = clamp(y + noiseY);
    points.push({
      x: noisyX,
      y: noisyY,
      label: Math.hypot(noisyX, noisyY) < radius * 0.5 ? 1 : -1,
      split: 'train',
    });
  }
  return points;
}

function classifyXor(rng: () => number, count: number, noise: number): PlaygroundPoint[] {
  const points: PlaygroundPoint[] = [];
  for (let index = 0; index < count; index += 1) {
    let x = rng() * 10 - 5;
    let y = rng() * 10 - 5;
    x += x > 0 ? 0.3 : -0.3;
    y += y > 0 ? 0.3 : -0.3;
    const noiseX = (rng() * 10 - 5) * noise;
    const noiseY = (rng() * 10 - 5) * noise;
    points.push({
      x: clamp(x + noiseX),
      y: clamp(y + noiseY),
      label: (x + noiseX) * (y + noiseY) >= 0 ? 1 : -1,
      split: 'train',
    });
  }
  return points;
}

function classifyGaussian(rng: () => number, count: number, noise: number): PlaygroundPoint[] {
  const variance = 0.5 + noise * 7;
  const points: PlaygroundPoint[] = [];
  for (let index = 0; index < count; index += 1) {
    const label = index % 2 === 0 ? 1 : -1;
    const center = label === 1 ? 2 : -2;
    points.push({
      x: clamp(normal(rng, center, variance)),
      y: clamp(normal(rng, center, variance)),
      label,
      split: 'train',
    });
  }
  return points;
}

function classifySpiral(rng: () => number, count: number, noise: number): PlaygroundPoint[] {
  const points: PlaygroundPoint[] = [];
  const half = Math.floor(count / 2);
  for (const [delta, label] of [[0, 1], [Math.PI, -1]] as const) {
    for (let index = 0; index < half; index += 1) {
      const radius = index / half * 5;
      const angle = 1.75 * index / half * 2 * Math.PI + delta;
      points.push({
        x: clamp(radius * Math.sin(angle) + (rng() * 2 - 1) * noise),
        y: clamp(radius * Math.cos(angle) + (rng() * 2 - 1) * noise),
        label,
        split: 'train',
      });
    }
  }
  return points;
}

function regressionPlane(rng: () => number, count: number, noise: number): PlaygroundPoint[] {
  const points: PlaygroundPoint[] = [];
  for (let index = 0; index < count; index += 1) {
    const x = rng() * 12 - 6;
    const y = rng() * 12 - 6;
    const noiseX = (rng() * 12 - 6) * noise;
    const noiseY = (rng() * 12 - 6) * noise;
    points.push({
      x,
      y,
      label: Math.max(-1, Math.min(1, (x + noiseX + y + noiseY) / 10)),
      split: 'train',
    });
  }
  return points;
}

function regressionGaussian(rng: () => number, count: number, noise: number): PlaygroundPoint[] {
  const centers: [number, number, number][] = [
    [-4, 2.5, 1], [0, 2.5, -1], [4, 2.5, 1],
    [-4, -2.5, -1], [0, -2.5, 1], [4, -2.5, -1],
  ];
  const points: PlaygroundPoint[] = [];
  for (let index = 0; index < count; index += 1) {
    const x = rng() * 12 - 6;
    const y = rng() * 12 - 6;
    const noiseX = (rng() * 12 - 6) * noise;
    const noiseY = (rng() * 12 - 6) * noise;
    let label = 0;
    for (const [cx, cy, sign] of centers) {
      const distance = Math.hypot(x + noiseX - cx, y + noiseY - cy);
      const value = sign * Math.max(0, Math.min(1, 1 - distance / 2));
      if (Math.abs(value) > Math.abs(label)) label = value;
    }
    points.push({ x, y, label, split: 'train' });
  }
  return points;
}

const GENERATORS: Record<DatasetKind, (rng: () => number, count: number, noise: number) => PlaygroundPoint[]> = {
  circle: classifyCircle,
  xor: classifyXor,
  gaussian: classifyGaussian,
  spiral: classifySpiral,
  plane: regressionPlane,
  'reg-gaussian': regressionGaussian,
};

export function makeDataset(
  kind: DatasetKind,
  seed: number,
  noise = 0,
  trainRatio = 0.5,
  count?: number,
): PlaygroundPoint[] {
  const rng = mulberry32(seed);
  const problem = DATASET_META[kind].problem;
  const samples = count ?? (problem === 'classification' ? CLASSIFICATION_SAMPLES : REGRESSION_SAMPLES);
  const points = GENERATORS[kind](rng, samples, noise);
  const splitRng = mulberry32(seed ^ 0xa5a5a5a5);
  for (let index = points.length - 1; index > 0; index -= 1) {
    const other = Math.floor(splitRng() * (index + 1));
    [points[index], points[other]] = [points[other], points[index]];
  }
  const trainCount = Math.max(1, Math.min(points.length - 1, Math.floor(points.length * trainRatio)));
  return points.map((point, index) => ({ ...point, split: index < trainCount ? 'train' : 'test' }));
}

export function datasetProblem(kind: DatasetKind) {
  return DATASET_META[kind].problem;
}

export function featureValue(point: Pick<PlaygroundPoint, 'x' | 'y'>, key: FeatureKey) {
  if (key === 'x1') return point.x;
  if (key === 'x2') return point.y;
  if (key === 'x1sq') return point.x * point.x;
  if (key === 'x2sq') return point.y * point.y;
  if (key === 'x1x2') return point.x * point.y;
  if (key === 'sinx1') return Math.sin(point.x);
  return Math.sin(point.y);
}

export function featureVector(point: Pick<PlaygroundPoint, 'x' | 'y'>, features: FeatureKey[]) {
  return features.map(key => featureValue(point, key));
}

export function outputActivation(problem: ProblemType): PlaygroundActivation {
  return problem === 'regression' ? 'linear' : 'tanh';
}

export function makeNetwork(
  inputCount: number,
  hidden: number[],
  activation: PlaygroundActivation,
  problem: ProblemType,
  seed: number,
): PlaygroundNetwork {
  const sizes = [inputCount, ...hidden, 1];
  const rng = mulberry32((seed ^ 0x9e3779b9) >>> 0);
  const layers: PlaygroundLayer[] = [];
  for (let index = 1; index < sizes.length; index += 1) {
    const input = sizes[index - 1];
    const output = sizes[index];
    const isOutput = index === sizes.length - 1;
    const layerActivation = isOutput ? outputActivation(problem) : activation;
    const limit = layerActivation === 'relu' ? Math.sqrt(6 / input) : Math.sqrt(6 / (input + output));
    const weights = Array.from({ length: output }, () =>
      Array.from({ length: input }, () => (rng() * 2 - 1) * limit));
    const biases = Array.from({ length: output }, () => (rng() * 2 - 1) * 0.1);
    layers.push({ weights, biases, activation: layerActivation });
  }
  return { layers };
}

export function parameterCount(network: PlaygroundNetwork) {
  return network.layers.reduce((total, layer) =>
    total + layer.weights.reduce((sum, row) => sum + row.length, 0) + layer.biases.length, 0);
}

export function derivative(z: number, output: number, activation: PlaygroundActivation) {
  if (activation === 'relu') return z > 0 ? 1 : 0;
  if (activation === 'tanh') return 1 - output * output;
  if (activation === 'sigmoid') return output * (1 - output);
  return 1;
}

export interface ForwardResult {
  output: number;
  activations: number[][];
  zs: number[][];
}

export function forward(network: PlaygroundNetwork, input: number[]): ForwardResult {
  const activations: number[][] = [input];
  const zs: number[][] = [];
  for (const layer of network.layers) {
    const previous = activations[activations.length - 1];
    const z = layer.weights.map((row, neuron) =>
      row.reduce((sum, weight, index) => sum + weight * previous[index], layer.biases[neuron]));
    const output = z.map(value => applyActivation(layer.activation, value));
    zs.push(z);
    activations.push(output);
  }
  return { output: activations[activations.length - 1][0], activations, zs };
}

export function predict(network: PlaygroundNetwork, input: number[]) {
  return forward(network, input).output;
}

function squaredError(output: number, target: number) {
  return 0.5 * (output - target) ** 2;
}

export function evaluate(
  network: PlaygroundNetwork,
  points: PlaygroundPoint[],
  features: FeatureKey[],
  problem: ProblemType,
): PlaygroundMetrics {
  if (points.length === 0) return { loss: 0, accuracy: 0 };
  let loss = 0;
  let correct = 0;
  for (const point of points) {
    const output = predict(network, featureVector(point, features));
    loss += squaredError(output, point.label);
    if (problem === 'classification' && (output >= 0 ? 1 : -1) === point.label) correct += 1;
  }
  return {
    loss: loss / points.length,
    accuracy: problem === 'classification' ? correct / points.length : 0,
  };
}

export interface TrainOptions {
  batchSize: number;
  learningRate: number;
  regularization: Regularization;
  regularizationRate: number;
  seed: number;
}

export function trainEpoch(
  network: PlaygroundNetwork,
  points: PlaygroundPoint[],
  features: FeatureKey[],
  options: TrainOptions,
): PlaygroundEpochResult {
  if (points.length === 0) return { loss: 0, updates: 0 };
  const order = points.map((_, index) => index);
  const rng = mulberry32(options.seed);
  for (let index = order.length - 1; index > 0; index -= 1) {
    const other = Math.floor(rng() * (index + 1));
    [order[index], order[other]] = [order[other], order[index]];
  }

  let lossTotal = 0;
  let updates = 0;
  const batchSize = Math.max(1, Math.floor(options.batchSize));
  const batchCount = Math.ceil(points.length / batchSize);
  for (let batch = 0; batch < batchCount; batch += 1) {
    const indices = order.slice(batch * batchSize, (batch + 1) * batchSize);
    if (indices.length === 0) continue;
    const gradWeights = network.layers.map(layer => layer.weights.map(row => row.map(() => 0)));
    const gradBiases = network.layers.map(layer => layer.biases.map(() => 0));

    for (const index of indices) {
      const point = points[index];
      const input = featureVector(point, features);
      const { output, activations, zs } = forward(network, input);
      lossTotal += squaredError(output, point.label);
      const last = network.layers.length - 1;
      let delta = [(output - point.label)
        * derivative(zs[last][0], output, network.layers[last].activation)];

      for (let layerIndex = last; layerIndex >= 0; layerIndex -= 1) {
        const layer = network.layers[layerIndex];
        const previous = activations[layerIndex];
        for (let neuron = 0; neuron < layer.weights.length; neuron += 1) {
          gradBiases[layerIndex][neuron] += delta[neuron];
          for (let source = 0; source < layer.weights[neuron].length; source += 1) {
            gradWeights[layerIndex][neuron][source] += delta[neuron] * previous[source];
          }
        }
        if (layerIndex > 0) {
          const previousLayer = network.layers[layerIndex - 1];
          delta = previous.map((_, source) =>
            layer.weights.reduce((sum, row, neuron) => sum + row[source] * delta[neuron], 0)
            * derivative(zs[layerIndex - 1][source], activations[layerIndex][source], previousLayer.activation));
        }
      }
    }

    for (let layerIndex = 0; layerIndex < network.layers.length; layerIndex += 1) {
      const layer = network.layers[layerIndex];
      for (let neuron = 0; neuron < layer.weights.length; neuron += 1) {
        layer.biases[neuron] -= options.learningRate * gradBiases[layerIndex][neuron] / indices.length;
        for (let source = 0; source < layer.weights[neuron].length; source += 1) {
          const weight = layer.weights[neuron][source];
          const dataGradient = gradWeights[layerIndex][neuron][source] / indices.length;
          const regularizationGradient = options.regularization === 'l2'
            ? options.regularizationRate * weight
            : options.regularization === 'l1'
              ? options.regularizationRate * Math.sign(weight)
              : 0;
          const next = weight - options.learningRate * (dataGradient + regularizationGradient);
          layer.weights[neuron][source] = options.regularization === 'l1' && weight * next < 0 ? 0 : next;
        }
      }
    }
    updates += 1;
  }
  return { loss: lossTotal / points.length, updates };
}
