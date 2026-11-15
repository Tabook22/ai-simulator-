import { api } from './model';

export interface LlmInfo {
  corpus: string;
  vocab: string[];
  context_window: number;
  parameters: number;
  loss: number;
}

export interface LlmTop {
  token: string;
  prob: number;
}

export interface LlmForward {
  prompt: string;
  unknown: string[];
  tokens: string[];
  position: number;
  attention: number[];
  scores: number[];
  /** The vocabulary number of every token in the prompt. */
  ids: number[];
  /** The query token's row of the token table, and the row for its position; their sum is `embedding`. */
  token_embedding: number[];
  position_embedding: number[];
  embedding: number[];
  context_vector: number[];
  /** The MLP's input (token vector + attention), its hidden neurons after ReLU, and the finished vector. */
  mlp_input: number[];
  mlp: number[];
  final_vector: number[];
  logits: number[];
  probs: number[];
  top: LlmTop[];
  predicted: string;
  predicted_prob: number;
  target: string;
  target_prob: number;
  loss: number;
  matched: boolean;
  context_window: number;
  vocab: string[];
  corpus: string;
  parameters: number;
  model_loss: number;
}

export interface LlmGradients {
  loss: number;
  target: string;
  target_prob: number;
  attention: number[];
  dattention: number[];
  dscores: number[];
  dembedding: number[];
  gradient_norm: number;
  norms: Record<string, number>;
  matched: boolean;
}

export interface LlmStep {
  token: string;
  position: number;
  attention: number[];
  probability: number;
  text: string;
}

export interface LlmGeneration {
  prompt: string;
  text: string;
  steps: LlmStep[];
}

export interface LlmTrainResult {
  history: number[];
  loss: number;
}

export interface LlmTraceStep {
  key: string;
  title: string;
  seed: boolean;
  equation: string;
  local: string;
  incoming: string;
  outgoing: string;
  norm: number;
  note: string;
  share?: number;
}

export interface LlmTrace {
  tokens: string[];
  position: number;
  query: string;
  target: string;
  loss: number;
  matched: boolean;
  max_norm: number;
  link: {
    index: number;
    token: string;
    weight: number;
    score: number;
    gradient: number;
    share: number;
    v_norm: number;
    k_norm: number;
  };
  steps: LlmTraceStep[];
}

export const llmApi = {
  info: () => api<LlmInfo>('/llm/info'),
  forward: (prompt: string, position: number | null) =>
    api<LlmForward>('/llm/forward', { prompt, position }),
  gradients: (prompt: string, position: number | null, target: string | null) =>
    api<LlmGradients>('/llm/gradients', { prompt, position, target }),
  trace: (prompt: string, position: number | null, target: string | null, link: number | null) =>
    api<LlmTrace>('/llm/trace', { prompt, position, target, link }),
  train: (steps: number, learning_rate = 0.15) =>
    api<LlmTrainResult>('/llm/train', { steps, learning_rate }),
  reset: () => api<{ loss: number }>('/llm/reset', {}),
  generate: (prompt: string, count: number, temperature: number) =>
    api<LlmGeneration>('/llm/generate', { prompt, count, temperature }),
};
