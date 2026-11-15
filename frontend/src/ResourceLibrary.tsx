import { useEffect, useMemo, useRef, useState } from 'react';
import './library.css';
import {
  levelLabels, PATHS, RESOURCES, topicLabels, typeLabels,
} from './library';
import type { LabTarget, Level, Resource, ResourceType } from './library';
import { Icon } from './ui';
import type { IconName } from './ui';
import { readIds, toggleId, writeIds } from './libraryStorage';

const SAVED_KEY = 'neuron-lab-library-saved';
const DONE_KEY = 'neuron-lab-library-done';

type TypeFilter = 'all' | ResourceType;
type LevelFilter = 'all' | Level;

const TYPE_ORDER: TypeFilter[] = ['all', 'book', 'paper', 'video', 'post', 'podcast', 'course', 'tool'];
const LEVEL_ORDER: Level[] = ['beginner', 'intermediate', 'advanced'];

const typeIcons: Record<ResourceType, IconName> = {
  book: 'book',
  paper: 'file',
  video: 'monitor',
  post: 'file',
  podcast: 'mic',
  course: 'layers',
  tool: 'sliders',
};

function duration(minutes: number) {
  return minutes >= 120 ? `${Math.round(minutes / 60)} h` : `${minutes} min`;
}

export function ResourceLibrary({ onClose, onOpenLab }: {
  onClose: () => void;
  onOpenLab: (tab: LabTarget) => void;
}) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<TypeFilter>('all');
  const [level, setLevel] = useState<LevelFilter>('all');
  const [freeOnly, setFreeOnly] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
  const [pathId, setPathId] = useState<string | null>(null);
  const [saved, setSaved] = useState<string[]>(() => readIds(SAVED_KEY));
  const [done, setDone] = useState<string[]>(() => readIds(DONE_KEY));
  const resultsRef = useRef<HTMLElement>(null);

  useEffect(() => { writeIds(SAVED_KEY, saved); }, [saved]);
  useEffect(() => { writeIds(DONE_KEY, done); }, [done]);

  const path = pathId ? PATHS.find(item => item.id === pathId) ?? null : null;
  const hasFilters = Boolean(query || pathId || type !== 'all' || level !== 'all' || freeOnly || savedOnly);

  const filtered = useMemo(() => {
    const base: Resource[] = path
      ? path.ids.map(id => RESOURCES.find(resource => resource.id === id)).filter((resource): resource is Resource => Boolean(resource))
      : RESOURCES;
    const needle = query.trim().toLowerCase();
    return base.filter(resource => {
      if (type !== 'all' && resource.type !== type) return false;
      if (level !== 'all' && resource.level !== level) return false;
      if (freeOnly && !resource.free) return false;
      if (savedOnly && !saved.includes(resource.id)) return false;
      if (needle) {
        const haystack = `${resource.title} ${resource.author} ${resource.why} ${resource.topics.map(topic => topicLabels[topic]).join(' ')}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [freeOnly, level, path, query, saved, savedOnly, type]);

  function scrollToResults() {
    window.requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  function openPath(id: string) {
    setPathId(id);
    setQuery('');
    setType('all');
    setLevel('all');
    setFreeOnly(false);
    setSavedOnly(false);
    scrollToResults();
  }

  function clearFilters() {
    setPathId(null);
    setQuery('');
    setType('all');
    setLevel('all');
    setFreeOnly(false);
    setSavedOnly(false);
  }

  return <div className="library-page">
    <header className="library-head">
      <div className="library-head-copy">
        <div className="eyebrow">The reading room</div>
        <h1>Go <em>deeper</em> than the demo</h1>
        <p>A curated library of books, papers, videos, posts, and podcasts about how AI works inside.
          Every entry is here for a student — not a search engine. Pick a path, save what you want,
          and open the labs when you want to see the idea move.</p>
        <div className="library-head-actions">
          <button type="button" className="button primary" onClick={() => openPath('intro')}>
            <Icon name="play" size={14}/>Start with the 30-minute intro
          </button>
          <button type="button" className="button" onClick={onClose}>
            <Icon name="previous" size={15}/>Back to the lab
          </button>
          <button type="button" className="button quiet" onClick={() => window.print()}>
            <Icon name="print" size={15}/>Print list
          </button>
        </div>
      </div>
      <div className="library-stats" aria-label="Library at a glance">
        <div><strong>{RESOURCES.length}</strong><span>resources</span></div>
        <div><strong>{PATHS.length}</strong><span>learning paths</span></div>
        <div><strong>{saved.length}</strong><span>saved</span></div>
        <div><strong>{done.length}</strong><span>finished</span></div>
      </div>
    </header>

    <section className="library-paths" aria-label="Learning paths">
      <div className="library-section-head">
        <div><h2>Learning paths</h2><span>Curated orders, not a pile of links.</span></div>
        {path && <button type="button" className="button quiet small" onClick={() => setPathId(null)}>
          <Icon name="close" size={13}/>Clear path
        </button>}
      </div>
      <div className="path-row">
        {PATHS.map(item => {
          const finished = item.ids.filter(id => done.includes(id)).length;
          const percent = Math.round((finished / item.ids.length) * 100);
          return <button key={item.id} type="button" aria-pressed={pathId === item.id}
            className={`path-card ${pathId === item.id ? 'active' : ''}`}
            onClick={() => pathId === item.id ? setPathId(null) : openPath(item.id)}>
            <span className="path-kicker">{item.ids.length} resources</span>
            <strong>{item.title}</strong>
            <small>{item.blurb}</small>
            <span className="path-progress" aria-hidden="true"><i style={{ width: `${percent}%` }}/></span>
            <span className="path-finished">{finished} / {item.ids.length} finished</span>
          </button>;
        })}
      </div>
    </section>

    <section className="library-toolbar" aria-label="Filter the library">
      <div className="library-search">
        <Icon name="search" size={18}/>
        <input type="search" value={query} placeholder="Search titles, authors, topics…"
          aria-label="Search the library" onChange={event => setQuery(event.target.value)}/>
      </div>
      <div className="library-filters" role="group" aria-label="Resource type">
        {TYPE_ORDER.map(item => <button key={item} type="button" aria-pressed={type === item}
          className={`filter-chip ${type === item ? 'active' : ''}`} onClick={() => setType(item)}>
          {item === 'all' ? 'All' : typeLabels[item]}
        </button>)}
      </div>
      <div className="library-filter-row">
        <label className="library-select"><span>Level</span>
          <select value={level} onChange={event => setLevel(event.target.value as LevelFilter)}>
            <option value="all">All levels</option>
            {LEVEL_ORDER.map(item => <option key={item} value={item}>{levelLabels[item]}</option>)}
          </select>
        </label>
        <label className="library-check">
          <input type="checkbox" checked={freeOnly} onChange={event => setFreeOnly(event.target.checked)}/>
          Free only
        </label>
        <button type="button" className={`filter-chip saved-chip ${savedOnly ? 'active' : ''}`}
          aria-pressed={savedOnly} onClick={() => setSavedOnly(value => !value)}>
          <Icon name="bookmark" size={13}/>Saved {saved.length > 0 && <em>{saved.length}</em>}
        </button>
        {hasFilters && <button type="button" className="button quiet small" onClick={clearFilters}>
          <Icon name="reset" size={13}/>Clear filters
        </button>}
        <span className="library-count" aria-live="polite">{filtered.length} of {RESOURCES.length}</span>
      </div>
      {path && <div className="active-path"><span>Path</span><strong>{path.title}</strong>
        <button type="button" className="button quiet small" onClick={() => setPathId(null)}>Clear</button></div>}
    </section>

    <section className="library-results" ref={resultsRef} aria-label="Resources">
      <div className="library-grid">
        {filtered.map(resource => <article key={resource.id}
          className={`lib-card ${done.includes(resource.id) ? 'done' : ''}`}>
          <div className="lib-card-top">
            <span className={`lib-type ${resource.type}`}>
              <Icon name={typeIcons[resource.type]} size={13}/>{typeLabels[resource.type]}
            </span>
            <span className={`lib-level ${resource.level}`}>{levelLabels[resource.level]}</span>
            {resource.free && <span className="lib-free">free</span>}
            {done.includes(resource.id) && <span className="lib-done"><Icon name="check" size={12}/>finished</span>}
          </div>
          <h3>{resource.title}</h3>
          <p className="lib-byline">{resource.author}{resource.year ? ` · ${resource.year}` : ''}</p>
          <p className="lib-why">{resource.why}</p>
          <div className="lib-meta">
            <span className="lib-time"><Icon name="clock" size={13}/>{duration(resource.minutes)}</span>
            {resource.topics.slice(0, 3).map(topic => <span key={topic} className="lib-topic">{topicLabels[topic]}</span>)}
          </div>
          <div className="lib-actions">
            <div className="lib-links">
              <a className="button small lib-open" href={resource.url} target="_blank" rel="noreferrer">
                Open<Icon name="external" size={13}/>
              </a>
              {resource.lab && <button type="button" className="button small quiet lib-lab"
                onClick={() => onOpenLab(resource.lab!)}>
                <Icon name="flask" size={13}/>{resource.labLabel ?? 'Open in the lab'}
              </button>}
            </div>
            <div className="lib-marks">
              <button type="button" className="lib-icon-button" aria-pressed={saved.includes(resource.id)}
                aria-label={saved.includes(resource.id) ? 'Remove from my list' : 'Save to my list'}
                title={saved.includes(resource.id) ? 'Remove from my list' : 'Save to my list'}
                onClick={() => setSaved(ids => toggleId(ids, resource.id))}>
                <Icon name="bookmark" size={16}/>
              </button>
              <button type="button" className="lib-icon-button" aria-pressed={done.includes(resource.id)}
                aria-label={done.includes(resource.id) ? 'Mark as not finished' : 'Mark as finished'}
                title={done.includes(resource.id) ? 'Mark as not finished' : 'Mark as finished'}
                onClick={() => setDone(ids => toggleId(ids, resource.id))}>
                <Icon name="check" size={16}/>
              </button>
            </div>
          </div>
          <span className="lib-print-url">{resource.url}</span>
        </article>)}
      </div>
      {filtered.length === 0 && <div className="library-empty">
        <Icon name="search" size={24}/>
        <h3>Nothing matches those filters</h3>
        <p>Try a shorter search, a different media type, or clear the filters.</p>
        <button type="button" className="button" onClick={clearFilters}>Clear filters</button>
      </div>}
    </section>

    <p className="library-note">Curated for this classroom. Links open external sites; some books are paid.
      Nothing here is sponsored. Use the “Open in the lab” buttons to connect a reading to the simulator.</p>
  </div>;
}
