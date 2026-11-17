/**
 * The arithmetic behind the fine-tuning lab. Everything here is real and runs in the browser:
 * a LoRA adapter trained by gradient descent beside a frozen weight matrix, a quantizer,
 * and the memory sums for a model of a chosen size.
 */

export type Matrix = number[][];

/** A small repeatable random source, so every student sees the same numbers. */
export function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** A normally distributed number: real network weights cluster around zero in this shape. */
function normal(random: () => number) {
  const first = Math.max(random(), 1e-9);
  return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * random());
}

const zeros = (rows: number, columns: number): Matrix => Array.from({ length: rows }, () => Array(columns).fill(0));
const multiply = (left: Matrix, right: Matrix): Matrix =>
  left.map(row => right[0].map((_, column) => row.reduce((sum, value, index) => sum + value * right[index][column], 0)));
const apply = (matrix: Matrix, vector: number[]) => matrix.map(row => row.reduce((sum, value, index) => sum + value * vector[index], 0));
const transpose = (matrix: Matrix): Matrix => matrix[0].map((_, column) => matrix.map(row => row[column]));

// ---------------------------------------------------------------------------- LoRA

export const LORA_SIZE = 8;
export const LORA_RANKS = [1, 2, 4] as const;

export interface LoraState {
  rank: number;
  /** The original weights. Training never touches them. */
  frozen: Matrix;
  /** A copy taken at the start, used to prove the frozen weights did not move. */
  original: Matrix;
  /** The small trainable pair: A is rank × size, B is size × rank. */
  a: Matrix;
  b: Matrix;
  /** What the new task needs the layer to become; the adapter has to discover the difference. */
  goal: Matrix;
  examples: { input: number[]; target: number[] }[];
  history: number[];
  steps: number;
}

/** alpha / rank, with alpha = rank here, so the adapter's effect is simply B·A. */
const LORA_SCALE = 1;

export function createLora(rank: number, seed = 7): LoraState {
  const random = seeded(seed);
  const size = LORA_SIZE;
  const frozen = Array.from({ length: size }, () => Array.from({ length: size }, () => normal(random) * 0.5));
  // The new skill is a rank-2 change: a few directions of the layer need to move, not all 64 numbers.
  const left = Array.from({ length: size }, () => [normal(random) * 0.6, normal(random) * 0.6]);
  const right = [Array.from({ length: size }, () => normal(random) * 0.6), Array.from({ length: size }, () => normal(random) * 0.6)];
  const change = multiply(left, right);
  const goal = frozen.map((row, r) => row.map((value, c) => value + change[r][c]));
  const examples = Array.from({ length: 32 }, () => {
    const input = Array.from({ length: size }, () => normal(random));
    return { input, target: apply(goal, input) };
  });
  // A starts small and random, B starts at zero: before training the adapter changes nothing.
  const a = Array.from({ length: rank }, () => Array.from({ length: size }, () => normal(random) * 0.3));
  const state: LoraState = {
    rank, frozen, original: frozen.map(row => [...row]), a, b: zeros(size, rank), goal, examples, history: [], steps: 0,
  };
  state.history.push(loraLoss(state));
  return state;
}

/** What the adapter adds to the frozen weights: ΔW = B · A. */
export function loraDelta(state: LoraState): Matrix {
  return multiply(state.b, state.a).map(row => row.map(value => value * LORA_SCALE));
}

export function loraLoss(state: LoraState) {
  const delta = loraDelta(state);
  let total = 0;
  for (const { input, target } of state.examples) {
    const base = apply(state.frozen, input);
    const extra = apply(delta, input);
    total += target.reduce((sum, value, index) => sum + (base[index] + extra[index] - value) ** 2, 0) / target.length;
  }
  return total / state.examples.length;
}

/** One or more steps of gradient descent on A and B only. The frozen matrix is read, never written. */
export function trainLora(state: LoraState, steps: number, rate = 0.08): LoraState {
  let a = state.a.map(row => [...row]);
  let b = state.b.map(row => [...row]);
  const size = LORA_SIZE;
  const history = [...state.history];
  for (let step = 0; step < steps; step++) {
    const gradA = zeros(state.rank, size);
    const gradB = zeros(size, state.rank);
    for (const { input, target } of state.examples) {
      const low = apply(a, input);                    // A·x: the input squeezed into `rank` numbers
      const base = apply(state.frozen, input);        // W·x: the frozen model's own answer
      const extra = apply(b, low);                    // B·(A·x): the adapter's correction
      const error = base.map((value, index) => 2 * (value + extra[index] * LORA_SCALE - target[index]) / size);
      const back = apply(transpose(b), error);        // the error as seen by A
      for (let r = 0; r < size; r++) for (let k = 0; k < state.rank; k++) gradB[r][k] += error[r] * low[k] * LORA_SCALE;
      for (let k = 0; k < state.rank; k++) for (let c = 0; c < size; c++) gradA[k][c] += back[k] * input[c] * LORA_SCALE;
    }
    const count = state.examples.length;
    a = a.map((row, k) => row.map((value, c) => value - rate * gradA[k][c] / count));
    b = b.map((row, r) => row.map((value, k) => value - rate * gradB[r][k] / count));
    history.push(loraLoss({ ...state, a, b }));
  }
  return { ...state, a, b, history, steps: state.steps + steps };
}

/** How many frozen numbers differ from the copy taken before training. It is always zero. */
export function frozenChanges(state: LoraState) {
  let changed = 0;
  state.frozen.forEach((row, r) => row.forEach((value, c) => { if (value !== state.original[r][c]) changed += 1; }));
  return changed;
}

// --------------------------------------------------------------------- quantization

/** The 16 levels of NF4, the "normal float" 4-bit format QLoRA uses (bitsandbytes). */
export const NF4_LEVELS = [
  -1.0, -0.6961928009986877, -0.5250730514526367, -0.39491748809814453, -0.28444138169288635,
  -0.18477343022823334, -0.09105003625154495, 0.0, 0.07958029955625534, 0.16093020141124725,
  0.24611230194568634, 0.33791524171829224, 0.44070982933044434, 0.5626170039176941, 0.7229568362236023, 1.0,
];

export type QuantMethod = 'uniform' | 'nf4';

export interface Quantized {
  /** The real values each code stands for, smallest to largest. */
  levels: number[];
  /** The small whole number stored for each weight. */
  codes: number[];
  /** The weights as the model sees them after loading. */
  restored: number[];
  meanError: number;
  maxError: number;
}

export function sampleWeights(count: number, seed = 11) {
  const random = seeded(seed);
  return Array.from({ length: count }, () => normal(random) * 0.35);
}

/**
 * Store each weight as one of 2^bits levels. "uniform" spaces the levels evenly;
 * "nf4" (4-bit only) puts more levels near zero, where most weights live.
 */
export function quantize(weights: number[], bits: number, method: QuantMethod): Quantized {
  const scale = Math.max(...weights.map(value => Math.abs(value)), 1e-9);
  const count = 2 ** bits;
  const levels = method === 'nf4' && bits === 4
    ? NF4_LEVELS.map(level => level * scale)
    : Array.from({ length: count }, (_, index) => -scale + (2 * scale * index) / (count - 1));
  const codes = weights.map(value => {
    let best = 0;
    for (let index = 1; index < levels.length; index++) {
      if (Math.abs(levels[index] - value) < Math.abs(levels[best] - value)) best = index;
    }
    return best;
  });
  const restored = codes.map(code => levels[code]);
  const errors = weights.map((value, index) => Math.abs(value - restored[index]));
  return {
    levels, codes, restored,
    meanError: errors.reduce((sum, value) => sum + value, 0) / errors.length,
    maxError: Math.max(...errors),
  };
}

// --------------------------------------------------------------------------- memory

/** Typical shapes for open-weight models of each size. Real models differ a little. */
export const MODEL_SIZES = [
  { label: '1B', billions: 1.2, hidden: 2048, layers: 16, wide: 8192 },
  { label: '4B', billions: 4.0, hidden: 2560, layers: 34, wide: 10240 },
  { label: '8B', billions: 8.2, hidden: 4096, layers: 36, wide: 12288 },
  { label: '14B', billions: 14.8, hidden: 5120, layers: 40, wide: 17408 },
  { label: '27B', billions: 27.0, hidden: 5376, layers: 62, wide: 21504 },
] as const;

export const PRECISIONS = [
  { bits: 32, label: '32-bit', name: 'float32' },
  { bits: 16, label: '16-bit', name: 'float16' },
  { bits: 8, label: '8-bit', name: 'int8' },
  { bits: 4, label: '4-bit', name: 'NF4' },
] as const;

export const GPUS = [
  { gb: 8, name: 'Laptop GPU' },
  { gb: 16, name: 'Free cloud GPU (T4)' },
  { gb: 24, name: 'RTX 3090 / 4090' },
  { gb: 48, name: 'Workstation GPU' },
  { gb: 80, name: 'Data-centre GPU' },
] as const;

const GIB = 1024 ** 3;

export interface Budget {
  /** Numbers in the base model, and in the adapters added to it. */
  parameters: number;
  adapterParameters: number;
  trainableShare: number;
  /** Gigabytes: the frozen base at the chosen precision, the adapters with their training state, and working room. */
  baseGb: number;
  adapterGb: number;
  workingGb: number;
  totalGb: number;
  /** For comparison: updating every weight, at 16-bit, with gradients and optimizer state. */
  fullGb: number;
  /** The adapter file you save at the end. */
  adapterFileMb: number;
}

export function budget(size: typeof MODEL_SIZES[number], bits: number, rank: number, everyLayer: boolean): Budget {
  const parameters = size.billions * 1e9;
  // Attention has four square matrices; the MLP has two that widen and one that narrows.
  const attention = 4 * rank * (size.hidden + size.hidden);
  const mlp = 3 * rank * (size.hidden + size.wide);
  const adapterParameters = size.layers * (attention + (everyLayer ? mlp : 0));
  const baseGb = parameters * bits / 8 / GIB;
  // Adapters are trained at 16-bit; each also needs a gradient and two optimizer averages (32-bit).
  const adapterGb = adapterParameters * (2 + 4 + 8) / GIB;
  // Activations kept for the backward pass: grows with the model's width and depth. A rough classroom figure.
  const workingGb = 1.5 + size.hidden * size.layers * 2048 * 2 * 6 / GIB;
  return {
    parameters, adapterParameters,
    trainableShare: adapterParameters / parameters,
    baseGb, adapterGb, workingGb,
    totalGb: baseGb + adapterGb + workingGb,
    fullGb: parameters * 2 / GIB * 4,
    adapterFileMb: adapterParameters * 2 / 1024 ** 2,
  };
}
