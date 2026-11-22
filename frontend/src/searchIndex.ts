/**
 * Search across the whole application.
 *
 * `scripts/build-search-index.mjs` opens the built app in a browser, visits every lab, part,
 * tab and step in English and in Arabic, and saves what a student can read there, one entry
 * per heading, in `public/search-index.<lang>.json`. This module loads that index, ranks the
 * matches, and takes the student to a result: it opens the lab (and part, tab, step), finds the
 * heading, scrolls to the first matching words under it and highlights them.
 */
import type { Language } from './translate';
import type { WorkshopTab } from './lessons';
import type { PartTab } from './labNav';

/** Where a piece of text lives. `clicks` are tab or step buttons to press after arriving. */
export interface Place {
  lab: WorkshopTab | 'library' | 'watch' | 'glossary';
  part?: number;
  tab?: PartTab;
  clicks?: string[];
  /** Readable path, e.g. ["Fine-tuning lab", "Part 12: RAG in depth", "Try"]. */
  crumbs: string[];
}

/** One heading and the text under it. `n` tells identical headings apart (0 = first). */
/** `title` is the heading as it reads on screen, when that differs from its plain text (used to find it). */
export interface Entry { place: number; heading: string; title?: string; n: number; text: string }

export interface SearchIndex { language: Language; built: string; places: Place[]; entries: Entry[] }

export interface Result { entry: Entry; place: Place; score: number; snippet: { before: string; match: string; after: string } | null }

// ------------------------------------------------------------------ text

const ARABIC_MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/;

function fold(char: string): string {
  if (ARABIC_MARKS.test(char)) return '';
  switch (char) {
    case 'أ': case 'إ': case 'آ': case 'ٱ': return 'ا';
    case 'ى': return 'ي';
    case 'ة': return 'ه';
    case 'ؤ': return 'و';
    case 'ئ': return 'ي';
    case '’': case '‘': case 'ʼ': return "'";
    case '“': case '”': return '"';
  }
  return char.toLowerCase();
}

/** Lower case, without Arabic marks and with Arabic letter forms unified, so “الأنطولوجيا” finds “الانطولوجيا”. */
export function normalize(text: string): string {
  let out = '';
  for (const char of text) out += fold(char);
  return out;
}

/** The normalized text plus, for every normalized character, its position in the original. */
function normalizeWithMap(text: string): { folded: string; map: number[] } {
  let folded = '';
  const map: number[] = [];
  let position = 0;
  for (const char of text) {
    const out = fold(char);
    for (let i = 0; i < out.length; i++) { folded += out[i]; map.push(position); }
    position += char.length;
  }
  map.push(position);
  return { folded, map };
}

/** Latin words and numbers match from the start of a word ("rate" does not match "curated"); Arabic words, which take attached prefixes, match anywhere. */
const LATIN_START = /^[a-z0-9]/;
const isWordChar = (char: string | undefined) => Boolean(char && /[\p{L}\p{N}]/u.test(char));

/** Where `word` occurs in the normalized `folded` text, respecting word starts. */
function occurrences(folded: string, word: string): number[] {
  const found: number[] = [];
  const atStart = LATIN_START.test(word);
  for (let from = 0; ;) {
    const at = folded.indexOf(word, from);
    if (at < 0) return found;
    if (!atStart || !isWordChar(folded[at - 1])) found.push(at);
    from = at + 1;
  }
}

export const queryWords = (query: string) => normalize(query).split(/[\s,.;:!?؟،()«»"]+/).filter(word => word.length > 0);

/** Every place the query's words appear in `text`, in the original text's positions. */
export function findWords(text: string, words: string[]): { start: number; end: number }[] {
  if (!words.length) return [];
  const { folded, map } = normalizeWithMap(text);
  const ranges: { start: number; end: number }[] = [];
  for (const word of words) for (const at of occurrences(folded, word)) ranges.push({ start: map[at], end: map[at + word.length] });
  return ranges.sort((a, b) => a.start - b.start || b.end - a.end);
}

// ------------------------------------------------------------------ index

const loaded = new Map<Language, Promise<SearchIndex>>();

export function loadIndex(language: Language): Promise<SearchIndex> {
  let promise = loaded.get(language);
  if (!promise) {
    promise = fetch(`${import.meta.env.BASE_URL}search-index.${language}.json`, { cache: 'no-cache' })
      .then(response => { if (!response.ok) throw new Error(`search index ${response.status}`); return response.json() as Promise<SearchIndex>; });
    promise.catch(() => loaded.delete(language));
    loaded.set(language, promise);
  }
  return promise;
}

interface Prepared { heading: string; text: string; crumbs: string }
const prepared = new WeakMap<SearchIndex, Prepared[]>();

function prepare(index: SearchIndex): Prepared[] {
  let list = prepared.get(index);
  if (!list) {
    list = index.entries.map(entry => ({ heading: normalize(entry.title ?? entry.heading), text: normalize(entry.text), crumbs: normalize(index.places[entry.place].crumbs.join(' ')) }));
    prepared.set(index, list);
  }
  return list;
}

function snippetOf(text: string, words: string[]): Result['snippet'] {
  const first = findWords(text, words)[0];
  if (!first) return null;
  const start = Math.max(0, first.start - 70);
  const end = Math.min(text.length, first.end + 110);
  return {
    before: (start > 0 ? '…' : '') + text.slice(start, first.start).replace(/^\S*\s/, start > 0 ? '' : '$&'),
    match: text.slice(first.start, first.end),
    after: text.slice(first.end, end) + (end < text.length ? '…' : ''),
  };
}

/** Entries that contain every word, best first: words in the heading count most, then the whole phrase, then the path. */
export function search(index: SearchIndex, query: string, lab: Place['lab'] | 'all' = 'all', limit = 60): { results: Result[]; labs: Map<Place['lab'], number> } {
  const words = queryWords(query);
  const labs = new Map<Place['lab'], number>();
  if (!words.length) return { results: [], labs };
  const phrase = words.join(' ');
  const list = prepare(index);
  const scored: { at: number; score: number }[] = [];
  list.forEach((item, at) => {
    let score = 0;
    for (const word of words) {
      const inHeading = occurrences(item.heading, word);
      const inText = occurrences(item.text, word);
      const inCrumbs = occurrences(item.crumbs, word);
      if (!inHeading.length && !inText.length && !inCrumbs.length) return;
      if (inHeading.length) score += 12 + (inHeading[0] === 0 || item.heading[inHeading[0] - 1] === ' ' ? 4 : 0);
      if (inText.length) score += 3 + Math.min(4, inText.length - 1);
      if (inCrumbs.length) score += 2;
    }
    if (words.length > 1 && item.heading.includes(phrase)) score += 20;
    else if (words.length > 1 && item.text.includes(phrase)) score += 8;
    if (item.heading === phrase) score += 15;
    const place = index.places[index.entries[at].place];
    labs.set(place.lab, (labs.get(place.lab) ?? 0) + 1);
    if (lab !== 'all' && place.lab !== lab) return;
    scored.push({ at, score: score - Math.min(3, item.text.length / 3000) });
  });
  scored.sort((a, b) => b.score - a.score || a.at - b.at);
  const results = scored.slice(0, limit).map(({ at, score }) => {
    const entry = index.entries[at];
    return { entry, place: index.places[entry.place], score, snippet: snippetOf(entry.text, words) };
  });
  return { results, labs };
}

// ------------------------------------------------------------------ going there

/** What the app should open; App and the labs read it (they may mount after the request). */
let pending: Place | null = null;
export const NAVIGATE = 'neuron-lab:navigate';
export const OPEN_SEARCH = 'neuron-lab:open-search';

export function openSiteSearch() { window.dispatchEvent(new Event(OPEN_SEARCH)); }

/** Called by a lab when it mounts or hears NAVIGATE: returns the request meant for it, once. */
export function takePending(lab: Place['lab']): Place | null {
  if (pending?.lab !== lab) return null;
  const place = pending;
  pending = null;
  return place;
}

const HEADINGS = 'h1, h2, h3, h4, h5, h6, summary, dt';
const SWITCHERS = 'button, [role="tab"]';
const clean = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, ' ').trim();
const visible = (element: Element) => (element as HTMLElement).offsetParent !== null || element.getClientRects().length > 0;
const wait = (ms: number) => new Promise(resolve => window.setTimeout(resolve, ms));

async function until<T>(find: () => T | null | undefined, ms = 3000): Promise<T | null> {
  const end = Date.now() + ms;
  for (;;) {
    const found = find();
    if (found) return found;
    if (Date.now() > end) return null;
    await wait(60);
  }
}

function openDetailsAround(element: Element) {
  for (let node = element.parentElement; node; node = node.parentElement) if (node instanceof HTMLDetailsElement) node.open = true;
}

let clearHighlight: (() => void) | null = null;

function highlight(ranges: Range[], target: HTMLElement) {
  clearHighlight?.();
  const registry = (CSS as unknown as { highlights?: Map<string, unknown> }).highlights;
  const HighlightClass = (window as unknown as { Highlight?: new (...ranges: Range[]) => unknown }).Highlight;
  if (registry && HighlightClass && ranges.length) registry.set('site-search', new HighlightClass(...ranges));
  target.classList.add('site-search-flash');
  const timer = window.setTimeout(() => clearHighlight?.(), 6000);
  clearHighlight = () => {
    window.clearTimeout(timer);
    registry?.delete('site-search');
    target.classList.remove('site-search-flash');
    clearHighlight = null;
  };
}

/** The text nodes after `heading` up to the next heading, in page order. */
function textAfter(heading: Element): Text[] {
  const root = document.querySelector('main') ?? document.body;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  walker.currentNode = heading;
  const nodes: Text[] = [];
  let node = walker.nextNode();
  while (node) {
    if (node instanceof Element) {
      if (node.matches(HEADINGS) && !heading.contains(node)) break;
    } else if (!heading.contains(node) && node.parentElement && visible(node.parentElement)) nodes.push(node as Text);
    node = walker.nextNode();
  }
  return nodes;
}

/** Open a result: the lab, part, tab and steps, then the heading and the matching words. */
export async function goToResult(place: Place, entry: Entry, query: string) {
  pending = place;
  window.dispatchEvent(new CustomEvent(NAVIGATE, { detail: place }));
  const root = () => place.lab === 'glossary' ? document.querySelector('dialog[open]') : document.querySelector('main');

  for (const label of place.clicks ?? []) {
    const button = await until(() => [...(root()?.querySelectorAll<HTMLElement>(SWITCHERS) ?? [])]
      .find(item => clean(item.textContent) === label && visible(item)));
    if (!button) break;
    if (button.getAttribute('aria-selected') !== 'true' && button.getAttribute('aria-current') == null) button.click();
    await wait(120);
  }

  const heading = await until(() => {
    const matches = [...(root()?.querySelectorAll(HEADINGS) ?? [])]
      .filter(item => visible(item) && !item.closest('[aria-hidden="true"]') && clean(item.textContent) === entry.heading);
    return matches[entry.n] ?? matches[0];
  });
  const words = queryWords(query);
  const area = heading ?? root();
  if (!area) return;
  openDetailsAround(area);

  // The first matching words under the heading, or in the heading itself.
  const nodes = heading ? [...textNodesIn(heading), ...textAfter(heading)] : textNodesIn(area);
  const ranges: Range[] = [];
  for (const node of nodes) {
    for (const found of findWords(node.data, words)) {
      const range = document.createRange();
      range.setStart(node, found.start);
      range.setEnd(node, found.end);
      ranges.push(range);
    }
  }
  const firstElement = ranges[0]?.startContainer.parentElement ?? null;
  const target = (firstElement?.closest<HTMLElement>(`p, li, td, dd, figcaption, pre, ${HEADINGS}, div`) ?? heading ?? area) as HTMLElement;
  await wait(60);
  const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ block: 'center', behavior: smooth ? 'smooth' : 'instant' as ScrollBehavior });
  highlight(ranges, target);
}

function textNodesIn(element: Element): Text[] {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) nodes.push(node as Text);
  return nodes;
}
