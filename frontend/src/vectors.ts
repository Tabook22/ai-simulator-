/**
 * From token IDs to vectors, the way a transformer's first layer does it, at teaching size.
 *
 * Real models learn their embedding table during training, and GPT-4o's (the model behind o200k_base)
 * is not public. So this uses a small DEMONSTRATION table: DIMS numbers per token, fixed for each ID
 * (the same ID always gives the same row) but not learned, so the numbers carry no meaning.
 * The steps are the real ones: look up the row for the ID, add a position vector, then average the
 * token vectors to get one vector for the whole sentence (mean pooling).
 */
import type { CSSProperties } from 'react';

export const DIMS = 8;
export const VOCAB_SIZE = 200_019; // o200k_base has token IDs 0 … 200,018

/** Round to 2 decimals the way students do by hand: halves go away from zero (−0.385 → −0.39). */
const round = (value: number) => Math.sign(value) * Math.round(Math.abs(value) * 100 + 1e-9) / 100 || 0;

/** A small, fast pseudo-random generator, seeded by the token ID (mulberry32). */
function generator(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let x = state;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** The demonstration table's row for one token ID: DIMS numbers, rounded to 2 decimals. */
export function embeddingRow(id: number): number[] {
  const next = generator(Math.imul(id + 1, 2654435761) ^ 0x9e3779b9);
  const row: number[] = [];
  for (let d = 0; d < DIMS; d += 2) {
    // Box–Muller: two evenly spread random numbers become two bell-curve numbers, like a fresh model's weights.
    const u = Math.max(next(), 1e-9), v = next();
    const radius = Math.sqrt(-2 * Math.log(u)) * 0.6;
    row.push(round(radius * Math.cos(2 * Math.PI * v)), round(radius * Math.sin(2 * Math.PI * v)));
  }
  return row;
}

/**
 * The position vector from the original Transformer paper (sinusoidal encoding):
 * PE(pos, 2i) = sin(pos / 10000^(2i/d)),  PE(pos, 2i+1) = cos(pos / 10000^(2i/d)).  `pos` counts from 0.
 */
export function positionVector(pos: number): number[] {
  const row: number[] = [];
  for (let i = 0; i < DIMS / 2; i += 1) {
    const angle = pos / 10000 ** ((2 * i) / DIMS);
    row.push(round(Math.sin(angle)), round(Math.cos(angle)));
  }
  return row;
}

export const addVectors = (a: number[], b: number[]) => a.map((value, d) => round(value + b[d]));

/** The token's input vector: its table row plus its position vector. */
export const inputVector = (id: number, pos: number) => addVectors(embeddingRow(id), positionVector(pos));

/** Mean pooling: average every column, giving one vector for the whole text. */
export function averageVector(rows: number[][]): number[] {
  if (rows.length === 0) return Array(DIMS).fill(0);
  return Array.from({ length: DIMS }, (_, d) => round(rows.reduce((sum, row) => sum + row[d], 0) / rows.length));
}

export const formatNumber = (value: number) => (value >= 0 ? '+' : '−') + Math.abs(value).toFixed(2);

/** A colour for one number: cyan when positive, pink when negative, stronger when larger. */
export function heat(value: number): CSSProperties {
  const strength = Math.min(1, Math.abs(value) / 1.6);
  const tone = value >= 0 ? '94, 231, 255' : '255, 143, 208';
  return { background: `rgba(${tone}, ${0.12 + strength * 0.62})`, color: strength > 0.55 ? '#06101f' : '#eef2ff' };
}

/** Blend two vectors: (1 − share) of `a` plus `share` of `b`. */
export const mixVectors = (a: number[], b: number[], share: number) => a.map((value, d) => round(value * (1 - share) + b[d] * share));
