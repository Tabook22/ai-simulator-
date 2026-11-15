import { useEffect, useMemo, useRef, useState } from 'react';
import type { SyntheticEvent } from 'react';
import './video.css';
import {
  compactCount, FRESH_PICKS, VIDEO_PICKS, videoTopicLabels, videoTopicOrder,
} from './videos';
import type { VideoTopic } from './videos';
import { levelLabels } from './library';
import type { LabTarget, Level } from './library';
import { Icon } from './ui';
import { readIds, toggleId, writeIds } from './libraryStorage';

const SAVED_KEY = 'neuron-lab-video-saved';
const WATCHED_KEY = 'neuron-lab-video-watched';

type LevelFilter = 'all' | Level;
type Sort = 'score' | 'newest' | 'views';

const stageThumb = (id: string) => `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
const cardThumb = (id: string) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
const fallbackThumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
const watchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;
const scoreClass = (score: number) => score >= 9.7 ? 'gold' : score >= 9.4 ? 'high' : 'good';

function fallbackImage(event: SyntheticEvent<HTMLImageElement>, id: string) {
  const image = event.currentTarget;
  if (image.dataset.fallback !== 'true') {
    image.dataset.fallback = 'true';
    image.src = fallbackThumb(id);
  }
}

export function VideoLibrary({ onClose, onOpenLibrary, onOpenLab }: {
  onClose: () => void;
  onOpenLibrary: () => void;
  onOpenLab: (tab: LabTarget) => void;
}) {
  const [activeId, setActiveId] = useState('7xTGNNLPyMI');
  const [playing, setPlaying] = useState(false);
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState<'all' | VideoTopic>('all');
  const [level, setLevel] = useState<LevelFilter>('all');
  const [freshOnly, setFreshOnly] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
  const [sort, setSort] = useState<Sort>('score');
  const [saved, setSaved] = useState<string[]>(() => readIds(SAVED_KEY));
  const [watched, setWatched] = useState<string[]>(() => readIds(WATCHED_KEY));
  const stageRef = useRef<HTMLElement>(null);

  useEffect(() => { writeIds(SAVED_KEY, saved); }, [saved]);
  useEffect(() => { writeIds(WATCHED_KEY, watched); }, [watched]);

  const active = VIDEO_PICKS.find(pick => pick.id === activeId) ?? VIDEO_PICKS[0];
  const freshCount = VIDEO_PICKS.filter(pick => pick.fresh).length;
  const average = (VIDEO_PICKS.reduce((sum, pick) => sum + pick.score, 0) / VIDEO_PICKS.length).toFixed(1);
  const hasFilters = Boolean(query || topic !== 'all' || level !== 'all' || freshOnly || savedOnly);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = VIDEO_PICKS.filter(pick => {
      if (topic !== 'all' && !pick.topics.includes(topic)) return false;
      if (level !== 'all' && pick.level !== level) return false;
      if (freshOnly && !pick.fresh) return false;
      if (savedOnly && !saved.includes(pick.id)) return false;
      if (needle) {
        const haystack = `${pick.title} ${pick.channel} ${pick.why} ${pick.topics.map(item => videoTopicLabels[item]).join(' ')}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
    return list.slice().sort((a, b) => {
      if (sort === 'newest') return b.year - a.year || b.score - a.score;
      if (sort === 'views') return (b.views ?? 0) - (a.views ?? 0) || b.score - a.score;
      return b.score - a.score || b.year - a.year;
    });
  }, [freshOnly, level, query, saved, savedOnly, sort, topic]);

  function select(id: string) {
    setActiveId(id);
    setPlaying(false);
    window.requestAnimationFrame(() => stageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  function clearFilters() {
    setQuery('');
    setTopic('all');
    setLevel('all');
    setFreshOnly(false);
    setSavedOnly(false);
  }

  return <div className="video-page">
    <header className="video-head">
      <div className="video-head-copy">
        <div className="eyebrow">The screening room</div>
        <h1>The best LLM lectures, <em>curated</em></h1>
        <p>Only <strong>9.0+ picks</strong>. Every talk is checked for clarity, accuracy, depth, and freshness,
          with the newest 2025–26 lectures marked. Start with the primer, then follow the path that fits your class.</p>
        <div className="video-head-actions">
          <button type="button" className="button primary" onClick={() => select('7xTGNNLPyMI')}>
            <Icon name="play" size={14}/>Start with the 3-hour primer
          </button>
          <button type="button" className="button" onClick={onOpenLibrary}>
            <Icon name="library" size={15}/>Reading room
          </button>
          <button type="button" className="button quiet" onClick={onClose}>
            <Icon name="previous" size={15}/>Back to the lab
          </button>
        </div>
      </div>
      <div className="video-stats" aria-label="Video library at a glance">
        <div><strong>{VIDEO_PICKS.length}</strong><span>picks</span></div>
        <div><strong>{freshCount}</strong><span>from 2025–26</span></div>
        <div><strong>{average}</strong><span>avg score</span></div>
        <div><strong>{watched.length}</strong><span>watched</span></div>
      </div>
    </header>

    <section className="video-stage" ref={stageRef} aria-label="Selected video">
      <div className="video-player">
        {playing ? <iframe
          src={`https://www.youtube-nocookie.com/embed/${active.id}?rel=0&modestbranding=1&autoplay=1`}
          title={active.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen/> : <button type="button" className="video-poster" onClick={() => setPlaying(true)}
          aria-label={`Play ${active.title}`}>
          <img src={stageThumb(active.id)} alt="" onError={event => fallbackImage(event, active.id)}/>
          <span className="video-poster-shade" aria-hidden="true"/>
          <span className="video-play" aria-hidden="true"><Icon name="play" size={26}/></span>
          <span className="video-duration-pill">{active.duration}</span>
          <span className="video-poster-label">Play here · streams from YouTube</span>
        </button>}
      </div>
      <div className="video-stage-info">
        <div className="video-stage-top">
          <span className={`video-score ${scoreClass(active.score)}`}>{active.score.toFixed(1)}<small>/10</small></span>
          <span className="badge neutral-badge">{levelLabels[active.level]}</span>
          {active.fresh && <span className="badge ready-badge">2025–26</span>}
        </div>
        <h2>{active.title}</h2>
        <p className="video-byline">{active.channel} · {active.year} · {active.duration}
          {active.views ? ` · ${compactCount(active.views)} views` : ''}
          {active.likes ? ` · ${compactCount(active.likes)} likes` : ''}</p>
        <p className="video-why">{active.why}</p>
        <div className="video-topics">
          {active.topics.map(item => <span key={item} className="video-topic">{videoTopicLabels[item]}</span>)}
        </div>
        <div className="video-actions">
          <a className="button primary" href={watchUrl(active.id)} target="_blank" rel="noreferrer">
            <Icon name="play" size={14}/>Watch on YouTube
          </a>
          <button type="button" className="button" aria-pressed={saved.includes(active.id)}
            onClick={() => setSaved(ids => toggleId(ids, active.id))}>
            <Icon name="bookmark" size={15}/>{saved.includes(active.id) ? 'Saved' : 'Save'}
          </button>
          <button type="button" className="button" aria-pressed={watched.includes(active.id)}
            onClick={() => setWatched(ids => toggleId(ids, active.id))}>
            <Icon name="check" size={15}/>{watched.includes(active.id) ? 'Watched' : 'Mark watched'}
          </button>
          {active.lab && <button type="button" className="button quiet" onClick={() => onOpenLab(active.lab!)}>
            <Icon name="flask" size={15}/>{active.labLabel ?? 'Open in the lab'}
          </button>}
        </div>
        {active.chapters && <details className="video-chapters">
          <summary>Chapters <span>{active.chapters.length}</span></summary>
          <ol>{active.chapters.map(chapter => <li key={chapter.time}>
            <span>{chapter.time}</span>{chapter.label}
          </li>)}</ol>
        </details>}
      </div>
    </section>

    {!hasFilters && <section className="video-fresh" aria-label="New picks">
      <div className="video-section-head">
        <div><h2>New in 2025–26</h2><span>The latest lectures worth your class time.</span></div>
      </div>
      <div className="fresh-row">
        {FRESH_PICKS.map(pick => <button key={pick.id} type="button"
          className={`fresh-card ${activeId === pick.id ? 'active' : ''}`} onClick={() => select(pick.id)}>
          <span className="fresh-thumb">
            <img src={cardThumb(pick.id)} alt="" onError={event => fallbackImage(event, pick.id)}/>
            <span className="fresh-play" aria-hidden="true"><Icon name="play" size={14}/></span>
            <span className={`fresh-score ${scoreClass(pick.score)}`}>{pick.score.toFixed(1)}</span>
          </span>
          <span className="fresh-title">{pick.title}</span>
          <span className="fresh-meta">{pick.channel} · {pick.duration}</span>
        </button>)}
      </div>
    </section>}

    <section className="video-toolbar" aria-label="Filter the video library">
      <div className="library-search">
        <Icon name="search" size={18}/>
        <input type="search" value={query} placeholder="Search titles, channels, topics…"
          aria-label="Search the video library" onChange={event => setQuery(event.target.value)}/>
      </div>
      <div className="video-filters" role="group" aria-label="Video topic">
        <button type="button" className={`filter-chip ${topic === 'all' ? 'active' : ''}`}
          aria-pressed={topic === 'all'} onClick={() => setTopic('all')}>All</button>
        {videoTopicOrder.map(item => <button key={item} type="button"
          className={`filter-chip ${topic === item ? 'active' : ''}`}
          aria-pressed={topic === item} onClick={() => setTopic(item)}>{videoTopicLabels[item]}</button>)}
      </div>
      <div className="video-filter-row">
        <label className="library-select"><span>Level</span>
          <select value={level} onChange={event => setLevel(event.target.value as LevelFilter)}>
            <option value="all">All levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </label>
        <button type="button" className={`filter-chip ${freshOnly ? 'active' : ''}`}
          aria-pressed={freshOnly} onClick={() => setFreshOnly(value => !value)}>New 2025–26</button>
        <button type="button" className={`filter-chip saved-chip ${savedOnly ? 'active' : ''}`}
          aria-pressed={savedOnly} onClick={() => setSavedOnly(value => !value)}>
          <Icon name="bookmark" size={13}/>Saved {saved.length > 0 && <em>{saved.length}</em>}
        </button>
        <label className="library-select"><span>Sort</span>
          <select value={sort} onChange={event => setSort(event.target.value as Sort)}>
            <option value="score">Top score</option>
            <option value="newest">Newest</option>
            <option value="views">Most viewed</option>
          </select>
        </label>
        {hasFilters && <button type="button" className="button quiet small" onClick={clearFilters}>
          <Icon name="reset" size={13}/>Clear filters
        </button>}
        <span className="library-count" aria-live="polite">{filtered.length} of {VIDEO_PICKS.length}</span>
      </div>
    </section>

    <section className="video-grid" aria-label="Video picks">
      {filtered.map(pick => <article key={pick.id}
        className={`video-card ${activeId === pick.id ? 'active' : ''} ${watched.includes(pick.id) ? 'watched' : ''}`}>
        <button type="button" className="video-card-thumb" onClick={() => select(pick.id)}
          aria-label={`Select ${pick.title}`}>
          <img src={cardThumb(pick.id)} alt="" onError={event => fallbackImage(event, pick.id)}/>
          <span className={`video-score small ${scoreClass(pick.score)}`}>{pick.score.toFixed(1)}</span>
          {pick.fresh && <span className="video-new">NEW</span>}
          <span className="video-card-duration">{pick.duration}</span>
          {watched.includes(pick.id) && <span className="video-watched"><Icon name="check" size={12}/>watched</span>}
          <span className="video-card-play" aria-hidden="true"><Icon name="play" size={18}/></span>
        </button>
        <div className="video-card-body">
          <h3>{pick.title}</h3>
          <p className="video-byline">{pick.channel} · {pick.year}{pick.views ? ` · ${compactCount(pick.views)} views` : ''}</p>
          <p className="video-card-why">{pick.why}</p>
          <div className="video-topics">
            {pick.topics.slice(0, 3).map(item => <span key={item} className="video-topic">{videoTopicLabels[item]}</span>)}
          </div>
          <div className="video-card-actions">
            <button type="button" className="button small primary" onClick={() => select(pick.id)}>
              <Icon name="play" size={12}/>Watch
            </button>
            <a className="button small quiet" href={watchUrl(pick.id)} target="_blank" rel="noreferrer">
              YouTube<Icon name="external" size={12}/>
            </a>
            <button type="button" className="video-icon-button" aria-pressed={saved.includes(pick.id)}
              aria-label={saved.includes(pick.id) ? 'Remove from watch later' : 'Save for later'}
              title={saved.includes(pick.id) ? 'Remove from watch later' : 'Save for later'}
              onClick={() => setSaved(ids => toggleId(ids, pick.id))}>
              <Icon name="bookmark" size={15}/>
            </button>
            <button type="button" className="video-icon-button" aria-pressed={watched.includes(pick.id)}
              aria-label={watched.includes(pick.id) ? 'Mark as not watched' : 'Mark as watched'}
              title={watched.includes(pick.id) ? 'Mark as not watched' : 'Mark as watched'}
              onClick={() => setWatched(ids => toggleId(ids, pick.id))}>
              <Icon name="check" size={15}/>
            </button>
          </div>
        </div>
      </article>)}
    </section>

    <details className="video-method">
      <summary>How these picks are scored</summary>
      <p>Every score is editorial, out of 10, based on clarity, accuracy, depth, production, and freshness.
        Only 9.0+ makes the shelf. YouTube view and like counts are shown when verified; they are a signal,
        not the score. Videos stream from YouTube, so the player needs an internet connection; the rest of
        Neuron Lab works offline.</p>
    </details>
  </div>;
}
