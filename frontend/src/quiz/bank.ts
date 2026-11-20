/** The whole "Check yourself" bank, by kind. Plain data, so tests can import it. */
import { MCQ } from './mcq';
import { FILL } from './fill';
import { EXPLAIN, MATCH } from './open';
import { IMAGES } from './images';
import type { Kind, Question } from './types';

export const BANK: Record<Kind, Question[]> = { mcq: MCQ, fill: FILL, explain: EXPLAIN, match: MATCH, image: IMAGES };
export const BANK_SIZE = Object.values(BANK).reduce((sum, list) => sum + list.length, 0);
