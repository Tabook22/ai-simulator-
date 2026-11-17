/**
 * The translation engine. English text is the key; `locales/ar.json` holds the Arabic.
 *
 * Every piece of text the interface renders passes through `translate` (see `i18n-jsx/`), so
 * a screen needs no code of its own to be translated. A key such as "Layer {0} of {1}"
 * is a pattern: it matches "Layer 1 of 2", and each `{n}` is translated on its own.
 * Text without an entry stays in English.
 */
import { Fragment } from 'react';
import arabic from './locales/ar.json';

export type Language = 'en' | 'ar';

interface Pattern { test: RegExp; text: string; weight: number }

interface Engine {
  exact: Map<string, string>;
  relaxed: Map<string, string>;
  patterns: Map<string, Pattern>;
  ordered: Pattern[] | null;
  cache: Map<string, string>;
  language: Language;
}

// One engine for the page, even if a bundler loads this module twice (the dev server
// pre-bundles the JSX runtime, which would otherwise get its own copy of the language).
const shared = globalThis as { __neuronLabI18n?: Engine };
const engine: Engine = shared.__neuronLabI18n ??= {
  exact: new Map(), relaxed: new Map(), patterns: new Map(), ordered: null, cache: new Map(), language: 'en',
};
const { exact, relaxed, cache } = engine;

const HOLE = /\{(\d+)\}/g;
const LETTERS = /[A-Za-z]/;
const ARABIC = /[؀-ۿ]/;
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function addTranslations(entries: Record<string, string>) {
  for (const [source, target] of Object.entries(entries)) {
    if (!target) continue;
    const key = source.trim();
    if (HOLE.test(key)) {
      HOLE.lastIndex = 0;
      const literal = key.replace(HOLE, '');
      // A pattern needs real words to hold on to, or it would match everything.
      if (!/[A-Za-z]{2,}/.test(literal)) continue;
      const order: string[] = [];
      const body = key.split(HOLE).map((part, index) => {
        if (index % 2 === 0) return escape(part);
        const first = !order.includes(part);
        order.push(part);
        return first ? `(?<h${part}>[\\s\\S]+?)` : `\\k<h${part}>`;
      }).join('');
      engine.patterns.set(key, { test: new RegExp(`^${body}$`), text: target, weight: literal.length });
      engine.ordered = null;
    } else {
      exact.set(key, target);
      relaxed.set(key.toLowerCase(), target);
    }
  }
  cache.clear();
}

addTranslations(arabic as Record<string, string>);

export function setActiveLanguage(next: Language) {
  engine.language = next;
  cache.clear();
}

export const activeLanguage = () => engine.language;

function lookup(core: string, depth: number): string | null {
  const direct = exact.get(core);
  if (direct !== undefined) return direct;
  // The pattern with the most fixed words wins.
  const patterns = engine.ordered ??= [...engine.patterns.values()].sort((left, right) => right.weight - left.weight);
  if (depth < 3) {
    for (const pattern of patterns) {
      const match = pattern.test.exec(core);
      if (!match?.groups) continue;
      const groups = match.groups;
      return pattern.text.replace(HOLE, (_, index: string) => translateText(groups[`h${index}`] ?? '', depth + 1));
    }
  }
  return relaxed.get(core.toLowerCase()) ?? null;
}

function translateText(text: string, depth: number): string {
  if (!LETTERS.test(text)) return text;
  const core = text.trim();
  const found = lookup(core, depth);
  if (found === null) return text;
  const start = text.indexOf(core);
  return text.slice(0, start) + found + text.slice(start + core.length);
}

/** The Arabic for a piece of interface text, or the text itself when there is none. */
export function translate(text: string): string {
  // Text that is already Arabic (it may still name LoRA or a GPU) is left as written.
  if (engine.language === 'en' || !LETTERS.test(text) || ARABIC.test(text)) return text;
  const known = cache.get(text);
  if (known !== undefined) return known;
  const result = translateText(text, 0);
  if (cache.size > 6000) cache.clear();
  cache.set(text, result);
  return result;
}

const TEXT_PROPS = ['aria-label', 'title', 'placeholder', 'alt', 'aria-description'];
const CODE_TAGS = new Set(['code', 'pre', 'script', 'style', 'textarea']);

/**
 * Translate the text of one host element (`div`, `button`, `text`, …) or fragment.
 * `data-keep` (or `translate="no"`) leaves an element's own text alone: model tokens, names the
 * student typed, code. It applies to that element's direct text only.
 */
export function localizeProps<P>(type: unknown, props: P): P {
  if (engine.language === 'en' || !props) return props;
  // Text can also sit directly inside a fragment: <>{icon}Up to date</>.
  if (type !== Fragment && (typeof type !== 'string' || CODE_TAGS.has(type))) return props;
  const source = props as Record<string, unknown>;
  if (source.translate === 'no' || source['data-keep'] !== undefined) return props;
  let next: Record<string, unknown> | null = null;
  const set = (key: string, value: unknown) => {
    next ??= { ...source };
    next[key] = value;
  };
  const children = source.children;
  if (typeof children === 'string') {
    const text = translate(children);
    if (text !== children) set('children', text);
  } else if (Array.isArray(children)) {
    let changed = false;
    const list = children.map(child => {
      if (typeof child !== 'string') return child as unknown;
      const text = translate(child);
      if (text !== child) changed = true;
      return text;
    });
    if (changed) set('children', list);
  }
  for (const key of TEXT_PROPS) {
    const value = source[key];
    if (typeof value !== 'string') continue;
    const text = translate(value);
    if (text !== value) set(key, text);
  }
  return (next ?? props) as P;
}

// Hand the engine to the JSX runtime (see i18n-jsx/hook.ts).
(globalThis as { __neuronLabLocalize?: typeof localizeProps }).__neuronLabLocalize = localizeProps;
