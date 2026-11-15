import { api } from './model';
import type { BackpropLayer, BackpropResult, BackwardLayer } from './model';

export interface ExampleSummary {
  id: string;
  name: string;
  blurb: string;
  focus: string;
  shape: string;
  target: number[];
  learning_rate: number;
}

/** A worked example is the same trace the main network's backward pass uses. */
export type ExampleTrace = BackpropResult;
export type ExampleForward = BackpropResult['forward'];
export type ExampleLayer = BackpropLayer;
export type ExampleBackwardLayer = BackwardLayer;

export interface WorkedExample extends ExampleSummary {
  trace: ExampleTrace;
}

export const examplesApi = {
  list: () => api<ExampleSummary[]>('/examples'),
  load: (id: string) => api<WorkedExample>(`/examples/${id}`),
};
