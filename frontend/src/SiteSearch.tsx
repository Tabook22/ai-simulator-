/**
 * The site search: a button in the top bar (and Ctrl K or /) opens a search across every lab,
 * part, tab and step. Each result shows where it lives; choosing one goes straight there and
 * highlights the words. The index is built by scripts/build-search-index.mjs (see searchIndex.ts).
 */
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Icon } from './ui';
import type { IconName } from './ui';
import { useI18n } from './i18n';
import { OPEN_SEARCH, findWords, goToResult, loadIndex, queryWords, search } from './searchIndex';
import type { Place, Result, SearchIndex } from './searchIndex';
import './site-search.css';

const LAB_ICONS: Record<Place['lab'], IconName> = {
  explore: 'network', train: 'flask', examples: 'target', playground: 'grid', house: 'home', exam: 'book', advisor: 'chip',
  python: 'code', tokenizer: 'tokens', llm: 'sparkles', finetune: 'sliders', library: 'library', watch: 'play', glossary: 'book',
};
const RECENT_KEY = 'neuron-lab-recent-searches';
const SUGGESTIONS = {
  en: ['LoRA rank', 'Qdrant', 'overfitting', 'learning rate', 'chunk size', 'ontology', 'softmax', 'khanjar', 'quantization', 'backpropagation'],
  ar: ['LoRA', 'Qdrant', 'فرط التخصيص', 'معدل التعلم', 'التقطيع', 'الأنطولوجيا', 'softmax', 'الخنجر', 'التكميم', 'الانتشار العكسي'],
};

function readRecent(): string[] {
  try { const list = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]'); return Array.isArray(list) ? list.filter(item => typeof item === 'string').slice(0, 6) : []; }
  catch { return []; }
}
function saveRecent(query: string) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify([query, ...readRecent().filter(item => item !== query)].slice(0, 6))); }
  catch { /* storage may be unavailable */ }
}

/** Text with the query's words marked. `data-keep` stops the interface translator from touching it. */
function Marked({ text, words }: { text: string; words: string[] }) {
  const pieces: ReactNode[] = [];
  let at = 0;
  for (const range of findWords(text, words)) {
    if (range.start < at) continue;
    if (range.start > at) pieces.push(<span key={at} data-keep>{text.slice(at, range.start)}</span>);
    pieces.push(<mark key={`m${range.start}`} data-keep>{text.slice(range.start, range.end)}</mark>);
    at = range.end;
  }
  if (at < text.length) pieces.push(<span key={at} data-keep>{text.slice(at)}</span>);
  return <>{pieces}</>;
}

export function SiteSearch() {
  const { language } = useI18n();
  const say = (en: string, ar: string) => language === 'ar' ? ar : en;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const show = () => setOpen(true);
    const onKey = (event: KeyboardEvent) => {
      const typing = (event.target as HTMLElement | null)?.closest?.('input, textarea, select, [contenteditable="true"]');
      if ((event.key.toLowerCase() === 'k' && (event.ctrlKey || event.metaKey)) || (event.key === '/' && !typing && !event.ctrlKey && !event.metaKey)) {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener(OPEN_SEARCH, show);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener(OPEN_SEARCH, show); window.removeEventListener('keydown', onKey); };
  }, []);

  return <>
    <button type="button" className="button top-button site-search-open" onClick={() => setOpen(true)} aria-haspopup="dialog"
      aria-label={say('Search the whole application', 'ابحث في التطبيق كله')} data-testid="site-search-open">
      <Icon name="search" size={17}/><span data-keep>{say('Search', 'بحث')}</span><kbd data-keep>Ctrl K</kbd>
    </button>
    {open && <SearchDialog language={language} say={say} onClose={() => setOpen(false)}/>}
  </>;
}

function SearchDialog({ language, say, onClose }: { language: 'en' | 'ar'; say: (en: string, ar: string) => string; onClose: () => void }) {
  const [index, setIndex] = useState<SearchIndex | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [lab, setLab] = useState<Place['lab'] | 'all'>('all');
  const [current, setCurrent] = useState(0);
  const [recent, setRecent] = useState(readRecent);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const deferred = useDeferredValue(query);

  useEffect(() => {
    let live = true;
    setIndex(null); setFailed(false);
    loadIndex(language).then(loaded => { if (live) setIndex(loaded); }, () => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [language]);
  useEffect(() => { input.current?.focus(); }, []);
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);

  const { results, labs } = useMemo(() => index ? search(index, deferred, lab) : { results: [] as Result[], labs: new Map<Place['lab'], number>() }, [index, deferred, lab]);
  const total = [...labs.values()].reduce((sum, count) => sum + count, 0);
  const labNames = useMemo(() => {
    const names = new Map<Place['lab'], string>();
    for (const place of index?.places ?? []) if (!names.has(place.lab)) names.set(place.lab, place.crumbs[0]);
    return names;
  }, [index]);
  const words = queryWords(deferred);

  useEffect(() => { setCurrent(0); }, [deferred, lab]);
  useEffect(() => { if (lab !== 'all' && !labs.has(lab) && deferred) setLab('all'); }, [labs, lab, deferred]);
  useEffect(() => { list.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }); }, [current]);

  const choose = (result: Result | undefined) => {
    if (!result) return;
    saveRecent(query.trim());
    onClose();
    void goToResult(result.place, result.entry, query);
  };
  const ask = (text: string) => { setQuery(text); input.current?.focus(); };

  return <div className="site-search-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="site-search" role="dialog" aria-modal="true" aria-label={say('Search the whole application', 'ابحث في التطبيق كله')} data-testid="site-search">
      <label className="site-search-input"><Icon name="search" size={19}/>
        <input ref={input} type="search" value={query} data-testid="site-search-input" role="combobox" aria-expanded={results.length > 0} aria-controls="site-search-results"
          aria-activedescendant={results.length ? `site-search-hit-${current}` : undefined}
          placeholder={say('Search every lab, part and step… e.g. “LoRA rank”, “Qdrant”, “overfitting”', 'ابحث في كل المختبرات والأجزاء والخطوات… مثل «LoRA» أو «Qdrant» أو «فرط التخصيص»')}
          aria-label={say('Search', 'بحث')}
          onChange={event => setQuery(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'ArrowDown') { event.preventDefault(); setCurrent(value => Math.min(results.length - 1, value + 1)); }
            if (event.key === 'ArrowUp') { event.preventDefault(); setCurrent(value => Math.max(0, value - 1)); }
            if (event.key === 'Enter') { event.preventDefault(); choose(results[current]); }
            if (event.key === 'Escape') { event.preventDefault(); if (query) setQuery(''); else onClose(); }
          }}/>
        <button type="button" className="site-search-close" onClick={onClose} aria-label={say('Close search', 'أغلق البحث')}><kbd data-keep>Esc</kbd></button>
      </label>

      {words.length > 0 && total > 0 && <div className="site-search-labs" role="group" aria-label={say('Filter by lab', 'صفِّ حسب المختبر')}>
        <button type="button" className={lab === 'all' ? 'on' : ''} aria-pressed={lab === 'all'} onClick={() => setLab('all')}>
          <span data-keep>{say('Everywhere', 'في كل مكان')}</span><b data-keep>{total}</b></button>
        {[...labs.entries()].sort((a, b) => b[1] - a[1]).map(([key, count]) => <button key={key} type="button" className={lab === key ? 'on' : ''}
          aria-pressed={lab === key} onClick={() => setLab(lab === key ? 'all' : key)} data-testid={`site-search-lab-${key}`}>
          <Icon name={LAB_ICONS[key]} size={13}/><span data-keep>{labNames.get(key)}</span><b data-keep>{count}</b></button>)}
      </div>}

      <div className="site-search-body">
        {failed && <p className="site-search-note"><Icon name="close" size={15}/><span data-keep>{say('The search index could not be loaded. Check your connection and try again.', 'تعذّر تحميل فهرس البحث. تحقّق من اتصالك وحاول مرة أخرى.')}</span></p>}
        {!failed && !index && <p className="site-search-note"><span className="site-search-spinner"/><span data-keep>{say('Loading the search index…', 'جارٍ تحميل فهرس البحث…')}</span></p>}

        {index && !words.length && <div className="site-search-start">
          {recent.length > 0 && <>
            <h3 data-keep>{say('Recent searches', 'عمليات البحث الأخيرة')}</h3>
            <div className="site-search-chips">{recent.map(item => <button key={item} type="button" onClick={() => ask(item)}><Icon name="clock" size={13}/><span data-keep>{item}</span></button>)}</div>
          </>}
          <h3 data-keep>{say('Try searching for', 'جرّب البحث عن')}</h3>
          <div className="site-search-chips">{SUGGESTIONS[language].map(item => <button key={item} type="button" onClick={() => ask(item)}><Icon name="search" size={13}/><span data-keep>{item}</span></button>)}</div>
          <p className="site-search-tip" data-keep>{say(`${index.entries.length.toLocaleString()} sections across ${new Set(index.places.map(place => place.lab)).size} areas of the app. Use ↑ ↓ to move and Enter to open. The result opens in its lab, part and tab, with your words highlighted.`,
            `${index.entries.length.toLocaleString('ar')} قسمًا في ${new Set(index.places.map(place => place.lab)).size} أقسام من التطبيق. استخدم ↑ ↓ للتنقل و Enter للفتح. تُفتح النتيجة في مختبرها وجزئها وتبويبها، مع تمييز كلماتك.`)}</p>
        </div>}

        {index && words.length > 0 && <>
          <p className="site-search-count" aria-live="polite" data-keep>{results.length
            ? say(`${total} matching section${total === 1 ? '' : 's'}${results.length < (lab === 'all' ? total : labs.get(lab) ?? 0) ? `, showing the best ${results.length}` : ''}`,
              `${total} قسمًا مطابقًا${results.length < (lab === 'all' ? total : labs.get(lab) ?? 0) ? `، تُعرض أفضل ${results.length}` : ''}`)
            : say('Nothing found. Try fewer or different words, or the other language.', 'لم يُعثر على شيء. جرّب كلمات أقل أو مختلفة، أو اللغة الأخرى.')}</p>
          <ul className="site-search-results" id="site-search-results" role="listbox" ref={list} data-testid="site-search-results">
            {results.map((result, position) => {
              const { place, entry, snippet } = result;
              const title = entry.title ?? (entry.heading || place.crumbs[place.crumbs.length - 1]);
              return <li key={`${entry.place}-${entry.heading}-${entry.n}-${position}`} id={`site-search-hit-${position}`} role="option" aria-selected={position === current}>
                <button type="button" className={position === current ? 'current' : ''} onMouseMove={() => position !== current && setCurrent(position)} onClick={() => choose(result)}>
                  <span className={`site-search-icon lab-${place.lab}`}><Icon name={LAB_ICONS[place.lab]} size={16}/></span>
                  <span className="site-search-hit">
                    <span className="site-search-path">{place.crumbs.map((crumb, i) => <span key={i} data-keep>{crumb}</span>)}</span>
                    <strong><Marked text={title} words={words}/></strong>
                    {snippet && <small><span data-keep>{snippet.before}</span><mark data-keep>{snippet.match}</mark><span data-keep>{snippet.after}</span></small>}
                  </span>
                  <Icon name="next" size={15}/>
                </button>
              </li>;
            })}
          </ul>
        </>}
      </div>
      <footer className="site-search-foot" data-keep>
        <span><kbd>↑</kbd><kbd>↓</kbd> {say('move', 'تنقّل')}</span><span><kbd>Enter</kbd> {say('open', 'افتح')}</span><span><kbd>Esc</kbd> {say('close', 'إغلاق')}</span>
      </footer>
    </div>
  </div>;
}
