/**
 * The frame of the fine-tuning lab: the pipeline map, the Watch / Try / Remember tabs,
 * the part summary cards, the printable reference sheet, the search palette and the
 * remembered progress.
 */
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import './labshell.css';
import { Icon } from './ui';
import type { IconName } from './ui';
import { useI18n } from './i18n';
import { CARDS, CHAPTERS, TOOLS, chapterOf } from './labNav';
import type { PartTab } from './labNav';
import { GLOSSARY } from './lessonContent';
import type { Text } from './finetuneContent';

export interface PartInfo { key: string; icon: IconName; tone: string; label: Text; question: Text }

const cls = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ');
const tone = (color: string) => ({ '--tone': color }) as CSSProperties;

function useSay() {
  const { isArabic } = useI18n();
  return (text: Text) => isArabic ? text.ar : text.en;
}
const t = (en: string, ar: string): Text => ({ en, ar });

// ------------------------------------------------------------------ state

export const REFERENCE = 100;
export const QUIZ = 101;

interface Progress { active: number; visited: number[] }
const KEY = 'neuron-lab-ft-progress';

export function useLabProgress() {
  const [progress, setProgress] = useState<Progress>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Progress | null;
      if (saved && typeof saved.active === 'number') return { active: saved.active, visited: Array.isArray(saved.visited) ? saved.visited : [] };
    } catch { /* storage may be unavailable */ }
    return { active: 0, visited: [0] };
  });
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch { /* ignore */ }
  }, [progress]);
  const go = (active: number) => setProgress(current => ({
    active, visited: active < REFERENCE && !current.visited.includes(active) ? [...current.visited, active] : current.visited,
  }));
  return { ...progress, go };
}

interface PartNav { tab: PartTab | null; setTab: (tab: PartTab) => void; go: (part: number) => void; parts: PartInfo[] }
export const PartNavContext = createContext<PartNav | null>(null);
export const usePartNav = () => useContext(PartNavContext)!;

// ------------------------------------------------------------ pipeline map

export function PipelineMap({ active, visited, onPick }: { active: number; visited: number[]; onPick: (part: number) => void }) {
  const say = useSay();
  const current = chapterOf(active);
  return <nav className="ft-map" aria-label={say(t('The fine-tuning pipeline', 'خط الضبط الدقيق'))}>
    {CHAPTERS.map((chapter, index) => {
      const done = chapter.parts.every(part => visited.includes(part));
      const started = chapter.parts.some(part => visited.includes(part));
      return <div key={chapter.key} className={cls('ft-map-step', index === current && 'current', done && 'done', index < current && 'passed')}>
        {index > 0 && <span className="ft-map-link" aria-hidden="true"><i/></span>}
        <button type="button" onClick={() => onPick(chapter.parts[0])} aria-current={index === current ? 'step' : undefined}
          aria-label={say(t(`Chapter ${index + 1}: ${chapter.name.en}`, `الفصل ${index + 1}: ${chapter.name.ar}`))}>
          <span className="ft-map-icon"><Icon name={done ? 'check' : chapter.icon} size={17}/></span>
          <span className="ft-map-text"><strong>{say(chapter.name)}</strong><small>{say(chapter.stage)}</small></span>
          <span className="ft-map-dots" aria-hidden="true">{chapter.parts.map(part => <i key={part}
            className={cls(visited.includes(part) && 'seen', part === active && 'here')}/>)}</span>
          {started && !done && <span className="sr-only">{say(t('in progress', 'قيد التقدم'))}</span>}
        </button>
      </div>;
    })}
  </nav>;
}

// --------------------------------------------------------- grouped rail

export function ChapterRail({ parts, active, visited, onPick }: { parts: PartInfo[]; active: number; visited: number[]; onPick: (part: number) => void }) {
  const say = useSay();
  return <nav className="llm-rail ft-rail" aria-label={say(t('Parts of the lesson', 'أجزاء الدرس'))}>
    {CHAPTERS.map((chapter, chapterIndex) => <div key={chapter.key} className="ft-rail-group">
      <span className="llm-rail-title">{chapterIndex + 1} · {say(chapter.name)}</span>
      <ol>
        {chapter.parts.map(index => {
          const part = parts[index];
          return <li key={part.key} style={tone(part.tone)}>
            <button type="button" className={cls(active === index && 'current', visited.includes(index) && 'seen')} aria-current={active === index ? 'step' : undefined}
              aria-label={say(t(`Part ${index + 1}: ${part.label.en}`, `الجزء ${index + 1}: ${part.label.ar}`))} onClick={() => onPick(index)}>
              <span className="llm-rail-dot">{visited.includes(index) && active !== index ? <Icon name="check" size={12}/> : index + 1}</span>
              <span className="llm-rail-text"><strong>{say(part.label)}</strong><small>{say(part.question)}</small></span>
            </button>
          </li>;
        })}
      </ol>
    </div>)}
    <div className="ft-rail-group">
      <span className="llm-rail-title">{say(t('Review', 'المراجعة'))}</span>
      <ol>
        <li style={tone('#e2e8f0')}><button type="button" className={active === REFERENCE ? 'current' : ''} onClick={() => onPick(REFERENCE)}
          aria-current={active === REFERENCE ? 'step' : undefined}>
          <span className="llm-rail-dot"><Icon name="book" size={13}/></span>
          <span className="llm-rail-text"><strong>{say(t('Reference sheet', 'ورقة المرجع'))}</strong><small>{say(t('every part on one page', 'كل الأجزاء في صفحة واحدة'))}</small></span></button></li>
        <li style={tone('#facc15')}><button type="button" className={active === QUIZ ? 'current' : ''} onClick={() => onPick(QUIZ)}
          aria-current={active === QUIZ ? 'step' : undefined}>
          <span className="llm-rail-dot"><Icon name="trophy" size={13}/></span>
          <span className="llm-rail-text"><strong>{say(t('Check yourself', 'اختبر نفسك'))}</strong><small>{say(t('10 questions', '10 أسئلة'))}</small></span></button></li>
      </ol>
    </div>
  </nav>;
}

// ------------------------------------------------------------- part tabs

/** “On this page”: chips that jump to each tool of a long Try tab, read from the tools' own headings. */
export function ToolIndex({ owner }: { owner: string }) {
  const say = useSay();
  const { isArabic } = useI18n();
  const [titles, setTitles] = useState<string[]>([]);
  useEffect(() => {
    const read = () => setTitles([...document.querySelectorAll<HTMLElement>(`#${owner} .ft-try .llm-stage-visual h4.llm-sub`)]
      .map(heading => heading.textContent?.trim() ?? '').filter(Boolean));
    const timer = window.setTimeout(read, 0);
    return () => window.clearTimeout(timer);
  }, [owner, isArabic]);
  if (titles.length < 4) return null;
  const jump = (index: number) => {
    const heading = document.querySelectorAll<HTMLElement>(`#${owner} .ft-try .llm-stage-visual h4.llm-sub`)[index];
    heading?.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };
  return <nav className="ft-tool-index" aria-label={say(t('Tools in this part', 'أدوات هذا الجزء'))}>
    <span>{say(t('On this page:', 'في هذه الصفحة:'))}</span>
    {titles.map((title, index) => <button key={index} type="button" onClick={() => jump(index)}>{index + 1}. {title}</button>)}
  </nav>;
}

export function PartTabs({ hasScene, tab }: { hasScene: boolean; tab: PartTab }) {
  const say = useSay();
  const { setTab } = usePartNav();
  const tabs: { key: PartTab; icon: IconName; name: Text; hint: Text }[] = [
    ...(hasScene ? [{ key: 'watch' as PartTab, icon: 'play' as IconName, name: t('Watch', 'شاهد'), hint: t('the animated explanation', 'الشرح المتحرك') }] : []),
    { key: 'try', icon: 'flask', name: t('Try', 'جرّب'), hint: t('hands-on tools', 'أدوات تفاعلية') },
    { key: 'remember', icon: 'bookmark', name: t('Remember', 'تذكّر'), hint: t('the summary card', 'بطاقة الملخص') },
  ];
  return <div className="ft-part-tabs" role="tablist" aria-label={say(t('Ways to learn this part', 'طرق تعلّم هذا الجزء'))}>
    {tabs.map(item => <button key={item.key} type="button" role="tab" aria-selected={tab === item.key} className={tab === item.key ? 'current' : ''}
      onClick={() => setTab(item.key)}>
      <Icon name={item.icon} size={15}/><span><strong>{say(item.name)}</strong><small>{say(item.hint)}</small></span>
    </button>)}
  </div>;
}

/** The summary card of one part. */
export function RememberCard({ index, idea, why, compact = false }: { index: number; idea?: string; why?: string; compact?: boolean }) {
  const say = useSay();
  const { parts, go } = usePartNav();
  const card = CARDS[index];
  const part = parts[index];
  return <article className={cls('ft-card', compact && 'compact')} style={tone(part.tone)} data-testid={`card-${part.key}`}>
    <header>
      <span className="ft-card-number">{index + 1}</span>
      <h4>{say(part.label)}</h4>
      {compact && <button type="button" className="lx-link" onClick={() => go(index)}>{say(t('Open the part', 'افتح الجزء'))}<Icon name="next" size={12}/></button>}
    </header>
    <p className="ft-card-headline" dir="auto" data-keep="">{say(card.headline)}</p>
    <ul>{card.facts.map(fact => <li key={fact.en}>{say(fact)}</li>)}</ul>
    <p className="ft-card-mistake"><strong>{say(t('Common mistake: ', 'خطأ شائع: '))}</strong>{say(card.mistake)} <span>{say(card.fix)}</span></p>
    {!compact && idea && <div className="ft-card-more">
      <section><h5>{say(t('The idea', 'الفكرة'))}</h5><p>{idea}</p></section>
      {why && <section><h5>{say(t('Why it matters', 'لماذا يهم'))}</h5><p>{why}</p></section>}
    </div>}
  </article>;
}

/** Previous / next, with the hand-over sentence to the next part. */
export function PartFooter({ index, flow }: { index: number; flow?: string }) {
  const say = useSay();
  const { parts, go } = usePartNav();
  const previous = index > 0 ? parts[index - 1] : null;
  const next = index < parts.length - 1 ? parts[index + 1] : null;
  return <footer className="ft-part-footer">
    {previous ? <button type="button" className="ft-step-button" onClick={() => go(index - 1)}>
      <Icon name="previous" size={15}/><span><small>{say(t('Previous', 'السابق'))}</small><strong>{say(previous.label)}</strong></span>
    </button> : <span/>}
    {next ? <button type="button" className="ft-step-button next" onClick={() => go(index + 1)} style={tone(next.tone)}>
      <span><small>{say(t('Next', 'التالي'))}{flow ? ` · ${flow}` : ''}</small><strong>{say(next.label)}</strong></span><Icon name="next" size={15}/>
    </button> : <button type="button" className="ft-step-button next" onClick={() => go(REFERENCE)}>
      <span><small>{say(t('Finished', 'انتهيت'))}</small><strong>{say(t('Open the reference sheet', 'افتح ورقة المرجع'))}</strong></span><Icon name="next" size={15}/>
    </button>}
  </footer>;
}

// ----------------------------------------------------------- reference

export function ReferenceSheet() {
  const say = useSay();
  const { parts } = usePartNav();
  const [query, setQuery] = useState('');
  const terms = GLOSSARY.filter(term => !query.trim() || `${term.name.en} ${term.name.ar} ${term.plain.en} ${term.plain.ar}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <section className="ft-reference" aria-labelledby="ft-reference-title">
    <header className="ft-reference-head">
      <div>
        <span className="llm-stage-eyebrow">{say(t('Review', 'المراجعة'))}</span>
        <h3 id="ft-reference-title">{say(t('Reference sheet: fine-tuning on one page', 'ورقة المرجع: الضبط الدقيق في صفحة واحدة'))}</h3>
        <p>{say(t('The summary card of every part, grouped by chapter, and the glossary. Print it, or keep it open while you work.', 'بطاقة الملخص لكل جزء مجمّعة حسب الفصول، مع المسرد. اطبعها، أو أبقها مفتوحة أثناء العمل.'))}</p>
      </div>
      <button type="button" className="button" onClick={() => window.print()}><Icon name="print" size={15}/>{say(t('Print or save as PDF', 'اطبع أو احفظ PDF'))}</button>
    </header>
    {CHAPTERS.map((chapter, index) => <div key={chapter.key} className="ft-reference-chapter">
      <h4><span>{index + 1}</span>{say(chapter.name)} <small>{say(chapter.stage)}</small></h4>
      <div className="ft-reference-grid">{chapter.parts.map(part => <RememberCard key={part} index={part} compact/>)}</div>
    </div>)}
    <div className="ft-reference-chapter">
      <h4><span><Icon name="book" size={13}/></span>{say(t('Glossary', 'المسرد'))} <small>{say(t(`${GLOSSARY.length} words`, `${GLOSSARY.length} كلمة`))}</small></h4>
      <label className="lx-search"><Icon name="search" size={15}/>
        <input type="search" value={query} onChange={event => setQuery(event.target.value)} aria-label={say(t('Search the glossary', 'ابحث في المسرد'))}
          placeholder={say(t('Search a word, e.g. rank, JSONL, gradient', 'ابحث عن كلمة، مثل الرتبة أو JSONL أو التدرّج'))}/></label>
      <dl className="ft-glossary">{terms.map(term => <div key={term.name.en}>
        <dt>{say(term.name)} <small>{say(t(`part ${term.part}`, `الجزء ${term.part}`))} · {say(parts[term.part - 1].label)}</small></dt>
        <dd>{say(term.plain)}</dd>
      </div>)}</dl>
    </div>
  </section>;
}

// -------------------------------------------------------------- search

interface Hit { key: string; kind: 'part' | 'tool' | 'scene' | 'term'; title: string; detail: string; part: number; tab: PartTab | null; selector?: string }

export function SearchPalette({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (hit: Hit) => void }) {
  const say = useSay();
  const { parts } = usePartNav();
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) { setQuery(''); setIndex(0); input.current?.focus(); } }, [open]);
  const all = useMemo<Hit[]>(() => [
    ...parts.map((part, number) => ({ key: `p${number}`, kind: 'part' as const, title: say(part.label), detail: say(part.question), part: number, tab: null })),
    ...TOOLS.map((tool, number) => ({ key: `t${number}`, kind: tool.kind, title: say(tool.name), detail: say(parts[tool.part].label), part: tool.part, tab: tool.tab, selector: tool.selector })),
    ...GLOSSARY.map((term, number) => ({ key: `g${number}`, kind: 'term' as const, title: say(term.name), detail: say(term.plain), part: term.part - 1, tab: 'remember' as PartTab })),
  ], [parts, say]);
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const hits = (words.length ? all.filter(hit => words.every(word => `${hit.title} ${hit.detail}`.toLowerCase().includes(word))) : all.filter(hit => hit.kind === 'part')).slice(0, 12);
  if (!open) return null;
  const choose = (hit: Hit | undefined) => { if (hit) { onPick(hit); onClose(); } };
  const kindName = { part: t('part', 'جزء'), tool: t('tool', 'أداة'), scene: t('animation', 'مشهد'), term: t('word', 'كلمة') };
  return <div className="ft-search-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="ft-search" role="dialog" aria-modal="true" aria-label={say(t('Search the fine-tuning lab', 'ابحث في مختبر الضبط الدقيق'))}>
      <label className="ft-search-input"><Icon name="search" size={18}/>
        <input ref={input} autoFocus value={query} placeholder={say(t('Search parts, tools and words: try “rank”, “JSONL”, “batch”…', 'ابحث في الأجزاء والأدوات والكلمات: جرّب “الرتبة” أو “JSONL” أو “الدفعة”…'))}
          aria-label={say(t('Search', 'بحث'))}
          onChange={event => { setQuery(event.target.value); setIndex(0); }}
          onKeyDown={event => {
            if (event.key === 'ArrowDown') { event.preventDefault(); setIndex(value => Math.min(hits.length - 1, value + 1)); }
            if (event.key === 'ArrowUp') { event.preventDefault(); setIndex(value => Math.max(0, value - 1)); }
            if (event.key === 'Enter') { event.preventDefault(); choose(hits[index]); }
            if (event.key === 'Escape') onClose();
          }}/>
        <kbd>Esc</kbd></label>
      <ul className="ft-search-hits" role="listbox">
        {hits.map((hit, position) => <li key={hit.key} role="option" aria-selected={position === index}>
          <button type="button" className={position === index ? 'current' : ''} onMouseEnter={() => setIndex(position)} onClick={() => choose(hit)}
            style={tone(parts[hit.part].tone)}>
            <span className={`ft-search-kind ${hit.kind}`}>{say(kindName[hit.kind])}</span>
            <span className="ft-search-text"><strong>{hit.title}</strong><small>{hit.detail}</small></span>
            <span className="ft-search-part">{hit.part + 1}</span>
          </button>
        </li>)}
        {!hits.length && <li className="ft-search-none">{say(t('Nothing found. Try another word.', 'لم يُعثر على شيء. جرّب كلمة أخرى.'))}</li>}
      </ul>
    </div>
  </div>;
}
export type { Hit };

/** Scroll to an element once it exists, and make it glow for a moment. */
export function flashWhenReady(selector: string) {
  let tries = 0;
  const look = () => {
    const element = document.querySelector<HTMLElement>(`.ft-lab ${selector}`) ?? document.querySelector<HTMLElement>(selector);
    if (element) {
      element.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
      element.classList.add('ft-flash');
      window.setTimeout(() => element.classList.remove('ft-flash'), 1800);
    } else if (tries++ < 20) window.setTimeout(look, 60);
  };
  look();
}

export function useSearchShortcut(open: () => void) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const typing = target.closest('input, textarea, select, [contenteditable="true"]');
      if ((event.key === 'k' && (event.ctrlKey || event.metaKey)) || (event.key === '/' && !typing)) {
        event.preventDefault();
        open();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
}

export function LabHeaderActions({ onSearch, onReference }: { onSearch: () => void; onReference: () => void }) {
  const say = useSay();
  return <div className="ft-head-actions">
    <button type="button" className="button ft-search-button" onClick={onSearch}><Icon name="search" size={15}/>{say(t('Search the lab', 'ابحث في المختبر'))}<kbd>Ctrl K</kbd></button>
    <button type="button" className="button" onClick={onReference}><Icon name="book" size={15}/>{say(t('Reference sheet', 'ورقة المرجع'))}</button>
  </div>;
}

