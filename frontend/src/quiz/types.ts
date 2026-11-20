/**
 * The "Check yourself" question bank: five kinds of question, each tagged with the lab part it tests.
 * Parts are 0-based lab indices (0 = why fine-tune … 15 = UTAS-70).
 */
import type { Text } from '../FineTuneScenes';

export type Pair = [string, string];
export const tx = ([en, ar]: Pair): Text => ({ en, ar });

export interface Choice { id: string; part: number; ask: Text; options: Text[]; right: number; why: Text }
export interface McQuestion extends Choice { kind: 'mcq' }
/** A sentence with one blank, written as "____" in both languages. */
export interface FillQuestion extends Choice { kind: 'fill' }
export interface ExplainQuestion {
  kind: 'explain'; id: string; part: number; ask: Text; model: Text;
  /** Key points a good answer covers; each matches if any of its words appears in the student's answer. */
  points: { text: Text; words: string[] }[];
}
export interface MatchQuestion { kind: 'match'; id: string; part: number; ask: Text; pairs: [Text, Text][]; why: Text }
export type FigureSpec =
  | { fig: 'neuron'; inputs: number[]; weights: number[]; bias: number }
  | { fig: 'loss'; shape: 'overfit' | 'underfit' | 'good' | 'lr-high' | 'lr-low' }
  | { fig: 'lora'; d: number; k: number; r: number }
  | { fig: 'quant'; bits: number }
  | { fig: 'memory'; bars: { label: string; gb: number }[]; limit: number }
  | { fig: 'activation'; fn: 'relu' | 'sigmoid' | 'step' | 'linear' }
  | { fig: 'confusion'; labels: string[]; cells: number[][] }
  | { fig: 'pipeline'; steps: Pair[]; missing: number }
  | { fig: 'vectors'; points: { label: string; x: number; y: number }[]; query: { x: number; y: number } }
  | { fig: 'chunks'; size: number; overlap: number; total: number }
  | { fig: 'box'; label: string; confidence: number; threshold: number }
  | { fig: 'matrix'; rows: number; cols: number; frozen: boolean; adapter?: number };
export interface ImageQuestion extends Choice { kind: 'image'; figure: FigureSpec }

export type Question = McQuestion | FillQuestion | ExplainQuestion | MatchQuestion | ImageQuestion;
export type Kind = Question['kind'];

/** Compact builders, so the bank reads like a list. */
export const mc = (id: string, part: number, ask: Pair, options: Pair[], right: number, why: Pair): McQuestion =>
  ({ kind: 'mcq', id, part, ask: tx(ask), options: options.map(tx), right, why: tx(why) });
export const fill = (id: string, part: number, ask: Pair, options: Pair[], right: number, why: Pair): FillQuestion =>
  ({ kind: 'fill', id, part, ask: tx(ask), options: options.map(tx), right, why: tx(why) });
export const explain = (id: string, part: number, ask: Pair, model: Pair, points: [Pair, string[]][]): ExplainQuestion =>
  ({ kind: 'explain', id, part, ask: tx(ask), model: tx(model), points: points.map(([text, words]) => ({ text: tx(text), words })) });
export const match = (id: string, part: number, ask: Pair, pairs: [Pair, Pair][], why: Pair): MatchQuestion =>
  ({ kind: 'match', id, part, ask: tx(ask), pairs: pairs.map(([a, b]) => [tx(a), tx(b)]), why: tx(why) });
export const image = (id: string, part: number, figure: FigureSpec, ask: Pair, options: Pair[], right: number, why: Pair): ImageQuestion =>
  ({ kind: 'image', id, part, figure, ask: tx(ask), options: options.map(tx), right, why: tx(why) });
