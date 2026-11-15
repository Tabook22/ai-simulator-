import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, FormEvent, KeyboardEvent, ReactNode } from 'react';
import './llm.css';
import { Icon, PanelTitle } from './ui';
import type { IconName } from './ui';
import { llmApi } from './llm';
import type { LlmForward, LlmGradients, LlmTrace } from './llm';

const DEFAULT_PROMPT = 'the cat ran to the';
const EXAMPLES = ['the cat ran to the', 'the dog ran to the', 'the dog sat on the', 'the cat saw the'];

/** The six stages, in the order the numbers travel. Each has its own colour on the page. */
const STAGES: { key: string; label: string; icon: IconName; tone: string; question: string }[] = [
  { key: 'tokens', label: 'Tokens', icon: 'sparkles', tone: '#5ee7ff', question: 'How does text become numbers?' },
  { key: 'embeddings', label: 'Embeddings', icon: 'layers', tone: '#a78bfa', question: 'What does a word look like to the model?' },
  { key: 'attention', label: 'Attention', icon: 'network', tone: '#7aa2ff', question: 'Which earlier words does this word read?' },
  { key: 'mlp', label: 'MLP', icon: 'bolt', tone: '#ffc46b', question: 'What does the model do with what it gathered?' },
  { key: 'softmax', label: 'Softmax', icon: 'target', tone: '#5ef2a0', question: 'How do numbers become the next word?' },
  { key: 'learn', label: 'Learn', icon: 'reset', tone: '#ff8f6b', question: 'How does the model get better?' },
];

/** The weights each part of the model owns, for the “where the error lands” bars. */
const WEIGHT_GROUPS: { name: string; stage: number; keys: string[]; role: string }[] = [
  { name: 'Embeddings', stage: 1, keys: ['E', 'P'], role: 'token and position tables' },
  { name: 'Attention', stage: 2, keys: ['Wq', 'Wk', 'Wv', 'Wo', 'bo'], role: 'query, key, value weights' },
  { name: 'MLP', stage: 3, keys: ['W1', 'b1', 'W2', 'b2'], role: 'two layers of neurons' },
  { name: 'Output', stage: 4, keys: ['Wout', 'bout'], role: 'one score per token' },
];

const sleep = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));
const visible = (token: string) => token === ' ' ? '␣' : token;
const percent = (value: number) => `${(value * 100).toFixed(value < 0.01 ? 1 : 0)}%`;
const joinToken = (text: string, token: string) => {
  const trimmed = text.trimEnd();
  if (!trimmed) return token;
  return token === '.' ? `${trimmed}.` : `${trimmed} ${token}`;
};
const tone = (color: string) => ({ '--tone': color }) as CSSProperties;

function temperatureBars(logits: number[], vocab: string[], temperature: number, count = 9) {
  const scale = Math.max(temperature, 0.05);
  const scaled = logits.map(value => value / scale);
  const top = Math.max(...scaled);
  const exponentials = scaled.map(value => Math.exp(value - top));
  const total = exponentials.reduce((sum, value) => sum + value, 0);
  return exponentials
    .map((value, index) => ({ token: vocab[index] ?? '?', prob: value / total, logit: logits[index] }))
    .sort((left, right) => right.prob - left.prob)
    .slice(0, count);
}

function activate(event: KeyboardEvent<SVGGElement>, action: () => void) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    action();
  }
}

function AttentionGraph({ tokens, position, values, mode, runKey, traced, onSelect, onTrace }: {
  tokens: string[];
  position: number;
  values: number[];
  mode: 'forward' | 'backward';
  runKey: number;
  traced: number | null;
  onSelect: (index: number) => void;
  onTrace: (index: number) => void;
}) {
  const scroll = useRef<HTMLDivElement>(null);
  const margin = 56;
  const base = 198;
  const widthOf = (token: string) => Math.max(36, 20 + token.length * 9);
  // Tokens sit in the middle of the picture; a long prompt widens it and scrolls.
  const content = tokens.reduce((total, token) => total + widthOf(token) + 12, -12);
  const width = Math.max(520, content + margin * 2);
  const centers: number[] = [];
  let cursor = (width - content) / 2;
  tokens.forEach(token => {
    const size = widthOf(token);
    centers.push(cursor + size / 2);
    cursor += size + 12;
  });
  const x = (index: number) => centers[index] ?? margin;
  const maxValue = Math.max(...values.map(value => Math.abs(value)), 0.0001);
  // Short prompts have low arcs, so the empty sky above them is cropped away.
  const tallest = 40 + Math.min(96, position * 9);
  const top = Math.max(0, Math.round(base - 30 - 0.75 * tallest - 50));

  useEffect(() => {
    const viewport = scroll.current;
    const token = viewport?.querySelector<SVGGElement>(`[data-token="${position}"]`);
    if (!viewport || !token) return;
    const box = viewport.getBoundingClientRect();
    const spot = token.getBoundingClientRect();
    if (spot.right > box.right - 16) {
      viewport.scrollBy({ left: spot.right - box.right + 30, behavior: 'smooth' });
    } else if (spot.left < box.left + 16) {
      viewport.scrollBy({ left: spot.left - box.left - 30, behavior: 'smooth' });
    }
  }, [position, tokens.length]);

  return <div className={`llm-graph-scroll ${mode === 'backward' ? 'llm-back' : ''}`} ref={scroll}>
    <svg className="llm-graph" viewBox={`0 ${top} ${width} ${266 - top}`} style={{ minWidth: width }}
      role="group" aria-label="Attention diagram: light flows from earlier tokens toward the selected query token.">
      {tokens.map((token, index) => {
        if (index >= position) return null;
        const value = Math.abs(values[index] ?? 0);
        if (value < 0.002) return null;
        const weight = Math.min(1, value / maxValue);
        const distance = position - index;
        const lift = 40 + Math.min(96, distance * 9);
        const path = `M ${x(index)} ${base - 30} C ${x(index)} ${base - 30 - lift}, ${x(position)} ${base - 30 - lift}, ${x(position)} ${base - 30}`;
        const dots = weight > 0.55 ? 2 : 1;
        const isTraced = traced === index;
        const dimmed = traced !== null && !isTraced;
        return <g key={`arc-${index}`} className={`llm-arc-group ${isTraced ? 'traced' : ''} ${dimmed ? 'dim' : ''}`}>
          <path className="llm-arc" d={path}
            style={{ strokeWidth: (isTraced ? 1.6 : 0.8) + (isTraced ? 6 : 8) * weight,
              opacity: isTraced ? 1 : dimmed ? 0.16 : 0.14 + 0.7 * weight }}/>
          <path className="llm-arc-hit" d={path} role="button" tabIndex={0}
            aria-label={`Trace attention from ${visible(token)}`}
            onClick={() => onTrace(index)}
            onKeyDown={event => activate(event, () => onTrace(index))}/>
          {!dimmed && <g key={`${runKey}-${index}`}>
            {Array.from({ length: dots }, (_, dot) => <circle key={dot} className="llm-dot"
              r={1.3 + 3.6 * weight}
              style={{
                offsetPath: `path("${path}")`,
                '--llm-delay': `${(-(index * 0.137 + dot * 0.5) % 1).toFixed(3)}s`,
              } as CSSProperties}/>)}
          </g>}
        </g>;
      })}
      {tokens.map((token, index) => {
        const query = index === position;
        const future = index > position;
        const next = index === position + 1;
        const source = traced === index;
        return <g key={`token-${index}`} data-token={index}
          className={`llm-token ${query ? 'query' : ''} ${future ? 'future' : ''} ${next ? 'actual' : ''} ${source ? 'traced-source' : ''}`}
          transform={`translate(${x(index)}, ${base})`}
          role="button" tabIndex={0} aria-pressed={query}
          aria-label={`Token ${index + 1}: ${visible(token)}${query ? ', selected query' : ''}`}
          onClick={() => onSelect(index)} onKeyDown={event => activate(event, () => onSelect(index))}>
          <rect x={-widthOf(token) / 2} y="-18" width={widthOf(token)} height="36" rx="10"/>
          <text className="llm-token-char" y="5" data-keep="">{visible(token)}</text>
          <text className="llm-token-index" y="34">{index + 1}</text>
          {query && <text className="llm-query-label" y="-32">query</text>}
          {source && !query && <text className="llm-source-label" y="-32">link</text>}
          {next && !query && <circle className="llm-actual-mark" cy="26" r="2.5"/>}
        </g>;
      })}
      <text className="llm-graph-caption" x={width / 2} y={257} textAnchor="middle">
        {traced !== null
          ? 'Tracing the error from the loss back to this link.'
          : mode === 'backward'
            ? 'The error flows back along the links it used, telling each one how to change.'
            : 'Light moves from the tokens the query reads into the query itself.'}
      </text>
    </svg>
  </div>;
}

/** A list of numbers as coloured cells. Hover a cell to read its value. */
function VectorStrip({ label, values, peak, note }: { label: ReactNode; values: number[]; peak?: number; note?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const scale = peak ?? Math.max(...values.map(value => Math.abs(value)), 0.0001);
  return <div className="llm-strip">
    <div className="llm-strip-head">
      <span className="llm-strip-label">{label}</span>
      <span className="llm-strip-read math">{hover === null
        ? note ?? `${values.length} numbers · hover to read`
        : `number ${hover + 1} = ${values[hover].toFixed(3)}`}</span>
    </div>
    <div className="llm-cells" onMouseLeave={() => setHover(null)}>
      {values.map((value, index) => {
        const strength = Math.min(1, Math.abs(value) / scale);
        const alpha = (0.08 + 0.82 * strength).toFixed(3);
        return <span key={index} className={hover === index ? 'llm-cell hover' : 'llm-cell'}
          style={{ background: value >= 0 ? `rgba(94, 231, 255, ${alpha})` : `rgba(255, 143, 107, ${alpha})` }}
          onMouseEnter={() => setHover(index)}/>;
      })}
    </div>
  </div>;
}

/** The MLP's hidden neurons: bright when switched on, hollow when ReLU has set them to zero. */
function NeuronGrid({ values }: { values: number[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const peak = Math.max(...values, 0.0001);
  const active = values.filter(value => value > 0).length;
  return <div className="llm-neurons-box">
    <div className="llm-strip-head">
      <span className="llm-strip-label">{values.length} hidden neurons · ReLU</span>
      <span className="llm-strip-read math">{hover === null
        ? `${active} on · ${values.length - active} off`
        : `neuron ${hover + 1} = ${values[hover].toFixed(3)}${values[hover] > 0 ? '' : ' (off)'}`}</span>
    </div>
    <div className="llm-neurons" onMouseLeave={() => setHover(null)}>
      {values.map((value, index) => <span key={index} className={value > 0 ? 'llm-neuron on' : 'llm-neuron'}
        style={value > 0 ? { '--glow': (0.25 + 0.75 * value / peak).toFixed(3) } as CSSProperties : undefined}
        onMouseEnter={() => setHover(index)}/>)}
    </div>
  </div>;
}

function LossSpark({ history }: { history: number[] }) {
  if (history.length < 2) return <div className="llm-spark empty">Press a training button to draw the loss curve.</div>;
  const max = Math.max(...history);
  const min = Math.min(...history);
  const spread = Math.max(max - min, 1e-6);
  const points = history.map((loss, index) => [
    10 + 280 * index / (history.length - 1),
    8 + 44 * (1 - (loss - min) / spread),
  ]);
  const last = points[points.length - 1];
  return <svg className="llm-spark" viewBox="0 0 300 60" role="img"
    aria-label={`Loss over ${history.length - 1} steps, from ${history[0].toFixed(3)} to ${history[history.length - 1].toFixed(3)}`}>
    <polyline points={points.map(point => point.join(',')).join(' ')}/>
    <circle cx={last[0]} cy={last[1]} r="3.2"/>
  </svg>;
}

/** The error travelling from the loss back to every group of weights. */
function ErrorPath({ gradients, running, onOpen }: {
  gradients: LlmGradients | null; running: boolean; onOpen: (stage: number) => void;
}) {
  const groups = WEIGHT_GROUPS.map(group => ({
    ...group,
    norm: Math.sqrt(group.keys.reduce((sum, key) => sum + (gradients?.norms[key] ?? 0) ** 2, 0)),
  }));
  const peak = Math.max(...groups.map(group => group.norm), 1e-9);
  return <div className={running ? 'llm-error-path running' : 'llm-error-path'}>
    <div className="llm-error-track" aria-hidden="true"><i/><i/><i/></div>
    <ol>
      {groups.map(group => <li key={group.name} style={tone(STAGES[group.stage].tone)}>
        <button type="button" onClick={() => onOpen(group.stage)} title={`Go to ${STAGES[group.stage].label}`}>
          <strong>{group.name}</strong>
          <small>{group.role}</small>
          <span className="llm-error-bar"><i style={{ width: `${Math.max(3, group.norm / peak * 100)}%` }}/></span>
          <span className="math">{gradients ? group.norm.toFixed(4) : '—'}</span>
        </button>
      </li>)}
      <li className="llm-error-loss"><div><strong>Loss</strong><small>the error starts here</small>
        <span className="math">{gradients ? gradients.loss.toFixed(3) : '—'}</span></div></li>
    </ol>
    <p>The error starts at the loss on the right and travels left. Each bar is the size of the gradient for that group of
      weights: how strongly this one token wants them to change.</p>
  </div>;
}

function Stage({ index, summary, what, why, tryIt, flow, backward, children }: {
  index: number; summary: ReactNode; what: ReactNode; why: ReactNode; tryIt: ReactNode;
  /** What this stage hands to the next one. */
  flow?: string; backward: boolean; children: ReactNode;
}) {
  const stage = STAGES[index];
  return <>
    <section className="llm-stage" id={`llm-${stage.key}`} data-stage={index} style={tone(stage.tone)}
      aria-labelledby={`llm-${stage.key}-title`}>
      <header className="llm-stage-top">
        <span className="llm-stage-number"><Icon name={stage.icon} size={20}/></span>
        <div className="llm-stage-title">
          <span className="llm-stage-eyebrow">Stage {index + 1} of {STAGES.length}</span>
          <h3 id={`llm-${stage.key}-title`}>{stage.label}</h3>
          <p>{stage.question}</p>
        </div>
        <span className="llm-stage-out">{summary}</span>
      </header>
      <div className="llm-stage-body">
        <div className="llm-stage-visual">{children}</div>
        <aside className="llm-notes">
          <h4>What happens</h4>
          <p>{what}</p>
          <h4>Why it matters</h4>
          <p>{why}</p>
          <p className="llm-try"><Icon name="bulb" size={15}/><span><strong>Try it.</strong> {tryIt}</span></p>
        </aside>
      </div>
    </section>
    {flow && <div className={backward ? 'llm-flow back' : 'llm-flow'} aria-hidden="true">
      <i/><span>{backward ? 'error flows back up' : flow}</span>
    </div>}
  </>;
}

export function LlmLab() {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [forward, setForward] = useState<LlmForward | null>(null);
  const [gradients, setGradients] = useState<LlmGradients | null>(null);
  const [mode, setMode] = useState<'forward' | 'backward'>('forward');
  const [temperature, setTemperature] = useState(1);
  const [history, setHistory] = useState<number[]>([]);
  const [runKey, setRunKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [trace, setTrace] = useState<LlmTrace | null>(null);
  const [traceStep, setTraceStep] = useState(0);
  const [activeStage, setActiveStage] = useState(0);
  const chain = useRef<HTMLDivElement>(null);
  const lab = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!trace) return;
    if (traceStep >= trace.steps.length) { setTraceStep(trace.steps.length - 1); return; }
    const card = chain.current?.querySelector<HTMLElement>(`[data-step="${traceStep}"]`);
    card?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [trace, traceStep]);

  // A finished message steps aside by itself; the one shown while the error is flowing stays.
  useEffect(() => {
    if (!status || busy) return;
    const timer = window.setTimeout(() => setStatus(''), 9000);
    return () => window.clearTimeout(timer);
  }, [status, busy]);

  /** Run the model and, unless told otherwise, also measure the gradients for the same token. */
  async function show(text: string, position: number | null, withGradients = true) {
    const data = await llmApi.forward(text, position);
    setForward(data);
    setPrompt(data.prompt);
    setRunKey(key => key + 1);
    if (withGradients) setGradients(await llmApi.gradients(data.prompt, data.position, data.target));
    return data;
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const first = await llmApi.forward(DEFAULT_PROMPT, null);
        const gradient = await llmApi.gradients(first.prompt, first.position, first.target);
        if (!alive) return;
        setForward(first);
        setGradients(gradient);
        setPrompt(first.prompt);
        setHistory([first.model_loss]);
      } catch (cause) {
        if (alive) setError(cause instanceof Error ? cause.message : 'Could not reach the model.');
      }
    })();
    return () => { alive = false; };
  }, []);

  // The rail follows whichever stage is in the middle of the window.
  const ready = forward !== null;
  useEffect(() => {
    if (!ready || !lab.current) return;
    const observer = new IntersectionObserver(entries => {
      const seen = entries.filter(entry => entry.isIntersecting)
        .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
      if (seen) setActiveStage(Number((seen.target as HTMLElement).dataset.stage));
    }, { rootMargin: '-25% 0px -55% 0px', threshold: [0, 0.2, 0.6] });
    lab.current.querySelectorAll('.llm-stage').forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, [ready]);

  function goTo(stage: number) {
    document.getElementById(`llm-${STAGES[stage].key}`)?.scrollIntoView({
      block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
    setActiveStage(stage);
  }

  async function guard(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  /** A fresh forward pass: leaves the backward view and closes the tracer. */
  async function loadForward(text: string, position: number | null) {
    setMode('forward');
    setTrace(null);
    setTraceStep(0);
    return show(text, position);
  }

  function predict(event?: FormEvent) {
    event?.preventDefault();
    void guard(async () => { await loadForward(prompt, null); setStatus(''); });
  }

  function chooseExample(text: string) {
    setPrompt(text);
    void guard(async () => { await loadForward(text, null); setStatus(''); });
  }

  function selectToken(index: number) {
    if (!forward) return;
    void guard(async () => { await loadForward(forward.prompt, index); setStatus(''); });
  }

  function traceLink(index: number) {
    const start = forward;
    if (!start) return;
    void guard(async () => {
      const result = await llmApi.trace(start.prompt, start.position, start.target, index);
      setMode('forward');
      setTrace(result);
      setTraceStep(0);
      setStatus('');
    });
  }

  function traceTop() {
    const start = forward;
    if (!start) return;
    const earlier = start.attention.slice(0, start.position);
    traceLink(earlier.length ? earlier.indexOf(Math.max(...earlier)) : 0);
  }

  function moveTrace(delta: number) {
    if (!trace) return;
    setTraceStep(current => Math.max(0, Math.min(trace.steps.length - 1, current + delta)));
  }

  function backprop() {
    const start = forward;
    if (!start) return;
    void guard(async () => {
      setTrace(null);
      setTraceStep(0);
      setGradients(await llmApi.gradients(start.prompt, start.position, start.target));
      setMode('backward');
      setRunKey(key => key + 1);
      setStatus('The error is flowing backward through the attention links…');
      await sleep(1500);
      const trained = await llmApi.train(1);
      await show(start.prompt, null);
      setMode('forward');
      setHistory(previous => [...previous, trained.loss].slice(-60));
      setStatus(`One gradient step: loss is now ${trained.loss.toFixed(3)}.`);
    });
  }

  function train(steps: number) {
    const start = forward;
    if (!start) return;
    void guard(async () => {
      setTrace(null);
      const trained = await llmApi.train(steps);
      await show(start.prompt, null);
      setMode('forward');
      setHistory(previous => [...previous, ...trained.history.slice(1)].slice(-60));
      setStatus(`Trained ${steps} step${steps === 1 ? '' : 's'}: ${trained.history[0].toFixed(3)} → ${trained.loss.toFixed(3)}.`);
    });
  }

  function reset() {
    void guard(async () => {
      setTrace(null);
      const result = await llmApi.reset();
      await show(forward?.prompt ?? prompt, null);
      setHistory([result.loss]);
      setMode('forward');
      setStatus('The model is back to its saved classroom weights.');
    });
  }

  function generate() {
    const start = forward?.prompt ?? prompt;
    void guard(async () => {
      setTrace(null);
      setMode('forward');
      const generated = await llmApi.generate(start, 8, temperature);
      for (const [index, step] of generated.steps.entries()) {
        await show(step.text, null, index === generated.steps.length - 1);
        await sleep(330);
      }
      setStatus(`Generated “${generated.text.slice(start.length)}” one token at a time.`);
    });
  }

  function appendTop() {
    const token = bars[0]?.token ?? forward?.predicted ?? '';
    const text = joinToken(forward?.prompt ?? prompt, token);
    void guard(async () => { await loadForward(text, null); setStatus('Appended the most likely token.'); });
  }

  function sample() {
    const start = forward?.prompt ?? prompt;
    void guard(async () => {
      const generated = await llmApi.generate(start, 1, temperature);
      await loadForward(generated.text, null);
      setStatus(`Sampled “${generated.text.slice(start.length)}” at temperature ${temperature.toFixed(1)}.`);
    });
  }

  const backward = mode === 'backward';
  const bars = forward ? temperatureBars(forward.logits, forward.vocab, temperature) : [];
  const topToken = bars[0]?.token ?? forward?.predicted ?? '';
  const atEnd = forward ? forward.position === forward.tokens.length - 1 : false;
  const attentionValues = backward && gradients
    ? gradients.dattention.map(value => Math.abs(value))
    : forward?.attention ?? [];
  const tableRows = forward
    ? forward.tokens.slice(0, forward.position + 1).map((token, index) => ({
      token,
      index,
      score: backward && gradients ? gradients.dscores[index] : forward.scores[index],
      weight: backward && gradients ? gradients.dattention[index] : forward.attention[index],
    }))
    : [];
  const strongest = [...tableRows].sort((left, right) =>
    Math.abs(right.weight ?? 0) - Math.abs(left.weight ?? 0))[0];

  const hero = <header className="llm-hero">
    <div className="llm-hero-copy">
      <div className="eyebrow">Transformer playground</div>
      <h2>How a language model guesses the next token</h2>
      <p>Type a few words. Then follow them down the page through the six stages every language model uses, from
        plain text to a prediction, and watch the model learn from its mistake. Every number on this page is
        calculated live by a real, tiny transformer.</p>
    </div>
    <form className="llm-prompt" onSubmit={predict}>
      <label className="field-label" htmlFor="llm-prompt">Prompt</label>
      <div className="llm-prompt-row">
        <input id="llm-prompt" dir="ltr" value={prompt} maxLength={80} spellCheck={false}
          onChange={event => setPrompt(event.target.value)} disabled={busy}/>
        <button type="submit" className="button primary" disabled={busy}>Predict next</button>
        <button type="button" className="button" disabled={busy} onClick={generate}
          title="Write eight tokens, one after another">Generate 8</button>
      </div>
      <div className="llm-examples">
        <span>Try:</span>
        {EXAMPLES.map(example => <button key={example} type="button" disabled={busy}
          onClick={() => chooseExample(example)} data-keep="">“{example.trim()}”</button>)}
      </div>
      {forward && <button type="button" className="llm-answer" onClick={() => goTo(4)}
        aria-label={`The model's answer: ${visible(topToken)}. Go to the Softmax stage`}>
        <span className="llm-answer-prompt" data-keep="">{forward.prompt}</span>
        <Icon name="arrow" size={18}/>
        <strong data-keep="">{visible(topToken)}</strong>
        <small>{bars[0] ? percent(bars[0].prob) : ''} sure</small>
      </button>}
    </form>
  </header>;

  if (!forward) return <div className="llm-lab" ref={lab}>
    {hero}
    {error
      ? <div className="message error" role="alert">{error}</div>
      : <div className="llm-graph-loading" role="status">Loading the tiny transformer…</div>}
  </div>;

  const query = forward.tokens[forward.position];
  const dimension = forward.embedding.length;
  const topLink = [...tableRows].sort((left, right) => (forward.attention[right.index] ?? 0) - (forward.attention[left.index] ?? 0))[0];
  const neuronsOn = forward.mlp.filter(value => value > 0).length;
  const embeddingPeak = Math.max(...forward.token_embedding.map(Math.abs), ...forward.embedding.map(Math.abs), 0.0001);
  const scorePeak = Math.max(...bars.map(item => Math.abs(item.logit)), 0.0001);
  const live = [
    `${forward.tokens.length} tokens`,
    `${dimension} numbers each`,
    topLink ? `reads “${visible(topLink.token)}” ${percent(forward.attention[topLink.index])}` : '—',
    `${neuronsOn} of ${forward.mlp.length} neurons on`,
    `“${visible(topToken)}” ${bars[0] ? percent(bars[0].prob) : ''}`,
    `loss ${forward.loss.toFixed(3)}`,
  ];

  return <div className={backward ? 'llm-lab backward' : 'llm-lab'} ref={lab}>
    {hero}

    <div className="llm-layout">
      <nav className="llm-rail" aria-label="Stages of the model">
        <span className="llm-rail-title">{backward ? 'Error flowing back' : 'The journey of your prompt'}</span>
        <ol>
          {STAGES.map((stage, index) => <li key={stage.key} style={tone(stage.tone)}>
            <button type="button" className={activeStage === index ? 'current' : ''}
              aria-label={`Stage ${index + 1}: ${stage.label}`} aria-current={activeStage === index ? 'step' : undefined}
              onClick={() => goTo(index)}>
              <span className="llm-rail-dot">{index + 1}</span>
              <span className="llm-rail-text"><strong>{stage.label}</strong><small>{live[index]}</small></span>
            </button>
          </li>)}
        </ol>
        <dl className="llm-model-card">
          <dt>This model</dt>
          <div><dd>{forward.parameters.toLocaleString()}</dd><dt>weights</dt></div>
          <div><dd>{forward.vocab.length}</dd><dt>tokens known</dt></div>
          <div><dd>{forward.context_window}</dd><dt>tokens of memory</dt></div>
        </dl>
      </nav>

      <div className="llm-stages">
        <Stage index={0} backward={backward} flow={`${forward.tokens.length} token numbers`}
          summary={<>{forward.tokens.length} tokens</>}
          what={<>A model cannot read letters. Your text is cut into pieces called <strong>tokens</strong>, and each token is
            replaced by its number in the model’s vocabulary. From here on, the model only ever sees numbers.</>}
          why={<>This tiny model knows just the {forward.vocab.length} tokens of its story, so every other word is invisible to it.
            Real language models use tens of thousands of word pieces, which lets them spell any word.</>}
          tryIt={<>Type a word that is not in the story, such as <em>zebra</em>, and press Predict next. See what the model does with it.</>}>
          <div className="llm-token-row">
            {forward.tokens.map((token, index) => <div className="llm-token-chip" key={index}>
              <strong data-keep="">{visible(token)}</strong>
              <Icon name="down" size={13}/>
              <span className="math">{forward.ids[index]}</span>
            </div>)}
          </div>
          {forward.unknown.length > 0 && <div className="llm-unknown" role="status">
            <Icon name="help" size={15}/>
            <span>Skipped, because they are not in the vocabulary: <strong data-keep="">{forward.unknown.join(', ')}</strong>. The model
              never saw these words, so it has no number for them.</span>
          </div>}
          <h4 className="llm-sub">The whole vocabulary: every token this model knows</h4>
          <div className="llm-vocab">
            {forward.vocab.map((token, id) => <span key={token} data-keep="" className={forward.ids.includes(id) ? 'used' : ''}>
              <small>{id}</small>{visible(token)}</span>)}
          </div>
          <h4 className="llm-sub">The story it learned them from</h4>
          <p className="llm-story math" data-keep="">{forward.corpus.trim()}</p>
        </Stage>

        <Stage index={1} backward={backward} flow={`${forward.tokens.length} vectors of ${dimension} numbers`}
          summary={<>{dimension} numbers per token</>}
          what={<>Each token number picks one row from a table of learned numbers: its <strong>embedding</strong>. A second row
            for its <strong>position</strong> in the sentence is added. The sum, a list of {dimension} numbers, is what the model
            works with.</>}
          why={<>These numbers begin random and are learned by backpropagation, exactly like the weights of a neuron. Tokens
            that are used in similar ways end up with similar rows, and that is how meaning gets stored as numbers.</>}
          tryIt={<>The prompt contains “the” more than once. Select each one: the token row is identical, only the small
            position row changes.</>}>
          <div className="llm-pick" role="group" aria-label="Choose which token to inspect">
            <span>Looking at</span>
            {forward.tokens.map((token, index) => <button key={index} type="button" disabled={busy}
              className={index === forward.position ? 'current' : ''} aria-pressed={index === forward.position}
              aria-label={`Inspect position ${index + 1}: ${visible(token)}`}
              onClick={() => selectToken(index)} data-keep="">{visible(token)}<small>{index + 1}</small></button>)}
          </div>
          <div className="llm-sum">
            <VectorStrip peak={embeddingPeak} values={forward.token_embedding}
              label={<>Token row for “{visible(query)}” <em>(row {forward.ids[forward.position]} of the token table)</em></>}/>
            <span className="llm-operator">+</span>
            <VectorStrip peak={embeddingPeak} values={forward.position_embedding}
              label={<>Position row <em>(place {forward.position + 1} in the sentence)</em></>}/>
            <span className="llm-operator">=</span>
            <VectorStrip peak={embeddingPeak} values={forward.embedding}
              label={<>x, the vector the model reads for “{visible(query)}”</>}/>
          </div>
          <div className="llm-strip-legend"><span><i className="cyan"/>positive number</span><span><i className="coral"/>negative number</span>
            <span>brighter = larger</span></div>
        </Stage>

        <Stage index={2} backward={backward} flow="1 context vector"
          summary={topLink ? <>reads “{visible(topLink.token)}” {percent(forward.attention[topLink.index])}</> : '—'}
          what={<>The token “{visible(query)}” looks back at the tokens before it. It gives each one a <strong>score</strong>,
            and softmax turns the scores into <strong>weights that add up to 1</strong>. It then collects a weighted sum of what
            those tokens offer: the <strong>context</strong>.</>}
          why={<>Attention is how a word uses the rest of its sentence. It is a weighted sum, the same operation as inside a
            neuron, but the weights are calculated fresh from the tokens themselves instead of being fixed.</>}
          tryIt={<>Click “cat” in the picture. The tokens to its right fade, because a model may never look ahead at words it
            has not written yet.</>}>
          <AttentionGraph tokens={forward.tokens} position={forward.position} values={attentionValues}
            mode={mode} runKey={runKey} traced={trace?.link.index ?? null}
            onSelect={selectToken} onTrace={traceLink}/>
          <div className="llm-legend">
            <span><i className={backward ? 'coral' : 'cyan'}/>{backward
              ? 'Gradient flowing back to the links' : 'Values flowing into the query'}</span>
            <span>Arc width = {backward ? '|∂L/∂weight|' : 'attention weight'}</span>
            <span className="llm-legend-note">Last {forward.context_window} tokens</span>
          </div>
          <div className="llm-formula">
            <span>q = x·Wq</span><span>k = x·Wk</span><span>v = x·Wv</span>
            <span>score = q·k / √{dimension}</span><span>a = softmax(score)</span><span>c = Σ a·v</span>
          </div>
          <div className="llm-attention-head">
            <h4 className="llm-sub">{backward ? 'Where the error wants change' : `What “${visible(query)}” reads`}</h4>
            <button className="button small" disabled={busy} onClick={traceTop}>
              <Icon name="bolt" size={13}/>Trace top link
            </button>
          </div>
          <div className="table-scroll llm-table-scroll">
            <table className="llm-attention-table">
              <thead><tr>
                <th>#</th><th>Token</th>
                <th>{backward ? '∂L/∂score' : 'score (q · k)'}</th>
                <th>{backward ? '∂L/∂a' : 'weight'}</th>
                <th><span className="sr-only">Share</span></th>
                <th><span className="sr-only">Trace</span></th>
              </tr></thead>
              <tbody>{tableRows.map(row => <tr key={row.index}
                className={strongest?.index === row.index ? 'strongest' : ''}>
                <td>{row.index + 1}</td>
                <th scope="row" data-keep="">{visible(row.token)}</th>
                <td>{(row.score ?? 0).toFixed(2)}</td>
                <td>{(row.weight ?? 0).toFixed(3)}</td>
                <td className="llm-share"><i style={{ width: `${Math.min(100, Math.abs(row.weight ?? 0) * 100)}%` }}/></td>
                <td><button className="icon-button llm-trace-button" disabled={busy}
                  aria-label={`Trace link from ${visible(row.token)}`}
                  onClick={() => traceLink(row.index)}><Icon name="bolt" size={13}/></button></td>
              </tr>)}</tbody>
            </table>
          </div>
          <VectorStrip values={forward.context_vector} label="context c, the weighted sum this token collected"/>
          <p className="llm-panel-note">
            {backward
              ? <>The softmax sends the error back to the scores. Positive values push a link up; negative values push it down.</>
              : <>Click a token to make it the query. Click a bolt or an arc to trace the loss back through every stage.</>}
          </p>
          {trace && <section className="panel llm-tracer" aria-label="Chain-rule tracer">
            <PanelTitle icon="bolt" aside={<button className="icon-button" aria-label="Close tracer"
              onClick={() => setTrace(null)}><Icon name="close" size={16}/></button>}>
              Chain-rule tracer
            </PanelTitle>
            <div className="llm-tracer-head">
              <p>Tracing the loss back to the link <strong data-keep="">{visible(trace.link.token)} → {visible(trace.query)}</strong>.
                Target: <strong data-keep="">{visible(trace.target)}</strong>. Each hop multiplies the error arriving by the local slope.</p>
              <div className="llm-tracer-nav">
                <button className="icon-button" aria-label="Previous chain step" disabled={traceStep === 0}
                  onClick={() => moveTrace(-1)}><Icon name="previous" size={15}/></button>
                <span>{traceStep + 1} / {trace.steps.length}</span>
                <button className="icon-button" aria-label="Next chain step" disabled={traceStep >= trace.steps.length - 1}
                  onClick={() => moveTrace(1)}><Icon name="next" size={15}/></button>
              </div>
            </div>
            <div className="llm-chain" ref={chain}>
              {trace.steps.map((step, index) => <button key={step.key} type="button" data-step={index}
                className={`llm-chain-card ${index === traceStep ? 'active' : ''} ${step.key === 'link' ? 'key' : ''}`}
                aria-pressed={index === traceStep} onClick={() => setTraceStep(index)}>
                <span className="llm-chain-top"><span className="llm-chain-index">{index + 1}</span><strong>{step.title}</strong></span>
                <span className="llm-chain-equation math">{step.equation}</span>
                <span className="llm-chain-row"><i>local</i>{step.local}</span>
                <span className="llm-chain-row"><i>in</i>{step.incoming}</span>
                <span className="llm-chain-row"><i>out</i>{step.outgoing}</span>
                <span className="llm-chain-bar"><i style={{ width: step.seed ? '100%'
                  : `${Math.max(2, Math.min(100, (step.norm / (trace.max_norm || 1)) * 100))}%` }}/></span>
                <span className="llm-chain-note">{step.note}</span>
              </button>)}
            </div>
          </section>}
        </Stage>

        <Stage index={3} backward={backward} flow={`1 finished vector of ${dimension} numbers`}
          summary={<>{neuronsOn} of {forward.mlp.length} neurons on</>}
          what={<>What attention gathered is added to the token’s own vector, then passed through a small network of ordinary
            neurons: multiply by weights, add a bias, apply ReLU. Its result is added back on top. Right now
            <strong> {neuronsOn} of its {forward.mlp.length} neurons</strong> are switched on.</>}
          why={<>This is the network from lesson 1, unchanged. Attention <em>gathers</em> information from other words; the
            MLP <em>decides</em> what to do with it. A large model simply repeats this pair of steps dozens of times.</>}
          tryIt={<>Switch between the “cat” and “dog” examples and watch which neurons light up. Different neurons respond to
            different situations.</>}>
          <VectorStrip values={forward.mlp_input} label="Input: token vector + what attention gathered"/>
          <span className="llm-operator down"><Icon name="down" size={16}/>× weights, + bias, ReLU</span>
          <NeuronGrid values={forward.mlp}/>
          <span className="llm-operator down"><Icon name="down" size={16}/>× weights, + bias, then added to the input</span>
          <VectorStrip values={forward.final_vector} label="Finished vector: everything the model knows at this position"/>
          <div className="llm-formula">
            <span>h = x + attention</span><span>n = ReLU(h·W1 + b1)</span><span>out = h + n·W2 + b2</span>
          </div>
        </Stage>

        <Stage index={4} backward={backward} flow="compare with the correct token"
          summary={<>“{visible(topToken)}” {bars[0] ? percent(bars[0].prob) : ''}</>}
          what={<>A final layer turns the finished vector into one <strong>score</strong> for every token in the vocabulary.
            Softmax converts the {forward.vocab.length} scores into <strong>probabilities</strong> that add up to 100%. The next token is
            then picked from that list.</>}
          why={<>A language model never outputs a word. It outputs a probability for every token it knows, and choosing from
            that list, one token at a time, is how it writes whole sentences.</>}
          tryIt={<>Slide the temperature up and watch the bars flatten: unlikely tokens get a real chance. Then press
            Sample one a few times.</>}>
          <div className="llm-softmax">
            <div className="llm-softmax-answer">
              <div className="llm-prediction">
                <span className="llm-predicted-char" aria-live="polite" data-keep="">{visible(topToken)}</span>
                <div>
                  <strong>most likely next token</strong>
                  <p>{bars[0] ? percent(bars[0].prob) : '—'} of the probability</p>
                </div>
              </div>
              <div className="llm-target-box">
                <span>In the story</span>
                <strong data-keep="">{visible(forward.target)}</strong>
                <span className={forward.matched ? 'chip ok' : 'chip'}>{forward.matched ? 'matched' : 'model guess'}</span>
              </div>
              <p className="llm-target-note">
                {forward.matched
                  ? <>The real next token got {percent(forward.target_prob)}. Its loss is
                    <strong> {forward.loss.toFixed(3)}</strong>.</>
                  : <>This prompt is not in the training story, so there is no correct answer to compare with. The model is
                    extending its own guess.</>}
              </p>
              <label className="llm-temp">
                <span>Temperature <b>{temperature.toFixed(1)}</b></span>
                <input type="range" min="0.3" max="1.6" step="0.1" value={temperature}
                  aria-label="Sampling temperature"
                  onChange={event => setTemperature(Number(event.target.value))}/>
                <small>Low = careful and repetitive. High = surprising.</small>
              </label>
              <div className="button-row llm-next-buttons">
                <button className="button primary" disabled={busy || !atEnd} onClick={appendTop}>
                  <Icon name="next" size={15}/>Append top token
                </button>
                <button className="button" disabled={busy || !atEnd} onClick={sample}>Sample one</button>
              </div>
              {!atEnd && <p className="llm-next-hint">You are reading an earlier token. Select the last token to continue the text.</p>}
            </div>
            <div className="llm-bars" aria-label="Next token probabilities">
              <div className="llm-bar llm-bar-head"><span>token</span><span>score</span><span>probability</span><span/></div>
              {bars.map(item => <div className="llm-bar" key={item.token}>
                <span className="llm-bar-token" data-keep="">{visible(item.token)}</span>
                <span className={item.logit < 0 ? 'llm-score negative' : 'llm-score'}>
                  <i style={{ width: `${Math.abs(item.logit) / scorePeak * 100}%` }}/><b>{item.logit.toFixed(1)}</b></span>
                <span className="llm-bar-track"><i style={{ width: `${Math.max(1, item.prob * 100)}%` }}/></span>
                <span className="llm-bar-value">{percent(item.prob)}</span>
              </div>)}
            </div>
          </div>
          <div className="llm-formula"><span>probability = e^(score ÷ temperature) ÷ sum of all e^(score ÷ temperature)</span></div>
        </Stage>

        <Stage index={5} backward={backward}
          summary={<>loss {forward.loss.toFixed(3)}</>}
          what={<>The model’s probability for the correct token is turned into a <strong>loss</strong>: −ln(probability).
            Certain and right gives almost 0; certain and wrong gives a large number. Backpropagation then carries that
            error back through every stage above and nudges every weight.</>}
          why={<>This loop is all that “training a language model” means: predict the next token, measure the loss, send the
            error back, adjust {forward.parameters.toLocaleString()} weights a little. Real models repeat it over billions of words.</>}
          tryIt={<>Choose “the dog ran to the”. The model is confidently wrong, so the loss and the error bars are large.
            Then press Train 10 steps and watch them shrink.</>}>
          <div className="llm-loss">
            <div><span>This token</span><strong>{forward.loss.toFixed(3)}</strong></div>
            <div><span>Whole story</span><strong>{forward.model_loss.toFixed(3)}</strong></div>
            <p className="math">loss = −ln( p of “{visible(forward.target)}” ) = −ln({forward.target_prob.toFixed(3)}) = {forward.loss.toFixed(3)}</p>
          </div>
          <ErrorPath gradients={gradients} running={backward} onOpen={goTo}/>
          <div className="llm-train-buttons">
            <button className="button primary" disabled={busy} onClick={backprop}>
              <Icon name="reset" size={15}/>Backprop one step
            </button>
            <button className="button" disabled={busy} onClick={() => train(10)}>Train 10 steps</button>
            <button className="button quiet" disabled={busy} onClick={reset}>Reset model</button>
          </div>
          <h4 className="llm-sub">Loss of the whole story after each training step</h4>
          <LossSpark history={history}/>
          <p className="llm-panel-note">One step is one round of gradient descent over the whole story. Lower is better; Reset
            model brings back the saved classroom weights.</p>
        </Stage>
      </div>
    </div>

    <div className="llm-toasts">
      {error && <div className="message error" role="alert">{error}</div>}
      {status && <div className="llm-status" role="status"><Icon name="check" size={14}/>{status}</div>}
    </div>
  </div>;
}
