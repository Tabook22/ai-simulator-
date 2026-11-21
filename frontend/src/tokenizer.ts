import { api } from './model';

/** One token exactly as the tokenizer produced it. `piece` is null when the token holds only part of a character. */
export interface Token {
  position: number;
  id: number;
  piece: string | null;
  /** The token's raw UTF-8 bytes in hex, e.g. "D8 A8". */
  bytes: string;
  partial: boolean;
}

/** A coloured piece of the preview: one token, or several tokens that share a character. */
export interface Segment { text: string; tokens: number[] }

export interface TokenizeResult {
  tokenizer: string;
  tokenizer_version: string;
  encoding: string;
  token_count: number;
  word_count: number;
  character_count: number;
  max_characters: number;
  tokens: Token[];
  segments: Segment[];
}

export const MAX_CHARACTERS = 20_000;

/** The real o200k_base IDs of "The ship reached the port." (checked by a test), for the hero animation. */
export const HERO_IDS = [976, 12407, 15237, 290, 3135, 13];

export const tokenize = (text: string) => api<TokenizeResult>('/tokenize', { text });

/**
 * Make whitespace and invisible characters visible in the token table: · space, → tab, ↵ line break,
 * ␍ carriage return, and ⟨U+200D⟩ for invisible format characters such as the zero-width joiner in emoji.
 */
export function visiblePiece(piece: string) {
  return piece.replace(/ /g, '·').replace(/\t/g, '→').replace(/\r/g, '␍').replace(/\n/g, '↵')
    .replace(/[\p{Cf}️]/gu, char => `⟨U+${char.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}⟩`);
}
