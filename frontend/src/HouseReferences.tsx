import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './house.css';
import { Icon } from './ui';

export interface Poster {
  id: string;
  kicker: string;
  title: string;
  caption: string;
  alt: string;
  thumb: string;
  full: string;
  width: number;
  height: number;
}

const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;

const POSTERS: Poster[] = [
  {
    id: 'house-prices',
    kicker: 'Poster 1 · the whole run',
    title: 'How a neural network learns house prices',
    caption: 'The 1,000-house run: two features per house, 100 houses per batch, 10 updates per epoch, a 2 → 3 → 1 network with 9 weights and 4 biases, and the hidden-layer question.',
    alt: 'Infographic showing house-price data, a 2 to 3 to 1 network, seed 42 initialization, 1,000 training houses split into 10 batches of 100, the batch-by-batch update chain across one epoch, the inside of a batch, the next epoch, and a comparison of shallow and deeper networks.',
    thumb: asset('reference/house-prices-thumb.webp'),
    full: asset('reference/house-prices.webp'),
    width: 1536,
    height: 1024,
  },
  {
    id: 'pipeline',
    kicker: 'Poster 2 · the project flow',
    title: 'How a neural network learns, step by step',
    caption: 'The complete project as INPUT → PROCESS → OUTPUT: define the task, clean and split, scale, design and initialize, choose settings and batches, the four-step training loop, epochs, validate, and test.',
    alt: 'Tall infographic with nine numbered steps, each showing its input, process, and output: define the task; clean and split data; scale features; design and initialize; choose training settings and batches; the training loop with forward pass, loss, backward pass, and optimizer step; complete epochs; validate and select; test and predict.',
    thumb: asset('reference/pipeline-thumb.webp'),
    full: asset('reference/pipeline.webp'),
    width: 1024,
    height: 1536,
  },
];

/** Button and hint text for the poster viewer, so pages in other languages can pass their own. */
export interface PosterLabels { zoomIn: string; fit: string; open: string; close: string; hintZoomed: string; hintFit: string }
const ENGLISH_LABELS: PosterLabels = {
  zoomIn: 'Zoom in', fit: 'Fit to screen', open: 'Open original', close: 'Close reference poster',
  hintZoomed: 'Scroll to explore the poster. Click the image or Fit to screen to return.',
  hintFit: 'Click the poster to zoom in, or open the original in a new tab.',
};

export function PosterLightbox({ poster, onClose, labels = ENGLISH_LABELS }: { poster: Poster; onClose: () => void; labels?: PosterLabels }) {
  const [zoomed, setZoomed] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey, true);
    };
  }, [onClose]);

  return createPortal(<div className="house-poster-backdrop" onMouseDown={event => {
    if (event.target === event.currentTarget) onClose();
  }}>
    <div className="house-poster-dialog" role="dialog" aria-modal="true" aria-labelledby="house-poster-title"
      onMouseDown={event => event.stopPropagation()}>
      <div className="house-poster-head">
        <div>
          <div className="eyebrow">{poster.kicker}</div>
          <h2 id="house-poster-title">{poster.title}</h2>
        </div>
        <div className="house-poster-actions">
          <button type="button" className="button small" onClick={() => setZoomed(value => !value)}>
            <Icon name="search" size={14}/>{zoomed ? labels.fit : labels.zoomIn}
          </button>
          <a className="button small" href={poster.full} target="_blank" rel="noreferrer">
            <Icon name="next" size={14}/>{labels.open}
          </a>
          <button ref={closeRef} type="button" className="icon-button" aria-label={labels.close} onClick={onClose}>
            <Icon name="close" size={18}/>
          </button>
        </div>
      </div>
      <div className={`house-poster-viewport ${zoomed ? 'zoomed' : ''}`}>
        <img src={poster.full} alt={poster.alt} width={poster.width} height={poster.height}
          onClick={() => setZoomed(value => !value)}/>
      </div>
      <p className="house-poster-hint">{zoomed ? labels.hintZoomed : labels.hintFit}</p>
    </div>
  </div>, document.body);
}

export function HouseReferences({ posters = POSTERS }: { posters?: Poster[] } = {}) {
  const [open, setOpen] = useState<string | null>(null);
  const poster = posters.find(item => item.id === open) ?? null;
  return <>
    <section className="house-refs" aria-label="Reference posters">
      <div className="house-refs-head">
        <div>
          <div className="eyebrow">Keep these beside the steps</div>
          <h2>Reference posters</h2>
        </div>
        <p>Open a poster to zoom in. Use it while you read the ten steps, run the batch lab, or ask the tutor.</p>
      </div>
      <div className="house-ref-grid">
        {posters.map(item => <figure className="house-ref-card" key={item.id}>
          <button type="button" className="house-ref-image" aria-label={`Open reference poster: ${item.title}`}
            onClick={() => setOpen(item.id)}>
            <img src={item.thumb} alt={item.alt} width={item.width} height={item.height} loading="lazy"/>
            <span className="house-ref-zoom"><Icon name="search" size={14}/>Open poster</span>
          </button>
          <figcaption>
            <div className="eyebrow">{item.kicker}</div>
            <h3>{item.title}</h3>
            <p>{item.caption}</p>
            <div className="house-ref-links">
              <button type="button" className="button small" onClick={() => setOpen(item.id)}>Enlarge</button>
              <a className="button small quiet" href={item.full} target="_blank" rel="noreferrer">Open original</a>
            </div>
          </figcaption>
        </figure>)}
      </div>
    </section>
    {poster && <PosterLightbox poster={poster} onClose={() => setOpen(null)}/>}
  </>;
}
