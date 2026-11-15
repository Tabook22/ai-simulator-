import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { format, layerName, neuronName } from './model';
import type { BackwardLayer, Connection, Forward, Network } from './model';
import { ForwardStep, neuronEquations, forwardStages } from './ForwardPlayback';
import type { PlaybackFrame } from './ForwardPlayback';
import type { BackwardKind } from './BackpropPlayback';
import { Icon } from './ui';
import { CalculationExplainer } from './CalculationExplainer';

export interface Selection { layer: number; neuron: number }

function layerRows(size: number, focus: number, calculationHeight: number) {
  const spacing = size <= 2 ? 108 : size === 3 ? 87 : 59;
  const halfHeight = calculationHeight / 2;
  const extraGap = focus < 0 ? 0 : Math.max(0, halfHeight + 56 - spacing);
  const positions = Array.from({ length: size }, (_, node) => node * spacing
    + (node > focus ? extraGap : 0) + (focus > 0 && node >= focus ? extraGap : 0));
  const top = focus === 0 ? halfHeight : 34;
  const bottom = focus === size - 1 ? halfHeight : 52;
  return { positions, top, span: positions[size - 1] + top + bottom };
}

function activateOnKey(event: ReactKeyboardEvent<SVGGElement>, action: () => void) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    action();
  }
}

export function Diagram({ network, result, stale, selected, openedNode, connection, active, frame, backward, gradients, onNode, onEdge }: {
  network: Network;
  result: Forward | null;
  stale: boolean;
  selected: Selection;
  openedNode: Selection | null;
  connection: Connection | null;
  active: number | null;
  frame: PlaybackFrame | null;
  backward?: { kind: BackwardKind; layer: number | null } | null;
  gradients?: BackwardLayer[];
  onNode: (selection: Selection) => void;
  onEdge: (connection: Connection) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const panStart = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);
  const dragged = useRef(false);
  const suppressClick = useRef(false);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<{ x: number; y: number } | null>(null);
  const [panning, setPanning] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [explainOpen, setExplainOpen] = useState(false);
  const [explainStep, setExplainStep] = useState<number | null>(null);
  const [panelPos, setPanelPos] = useState<{ left: number; top: number } | null>(null);
  const [cardMoving, setCardMoving] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const cardDrag = useRef<{
    pointerId: number; startX: number; startY: number; left: number; top: number;
    width: number; height: number; boundsWidth: number; boundsHeight: number;
  } | null>(null);
  const focusLayer = openedNode?.layer ?? frame?.layer;
  const hasOpenNode = openedNode !== null;
  useEffect(() => {
    const scroll = scrollRef.current;
    if (focusLayer === undefined || !scroll || scroll.scrollWidth <= scroll.clientWidth) return;
    const source = scroll.querySelector(`[data-column="${focusLayer}"]`)?.getBoundingClientRect();
    const target = scroll.querySelector(`[data-column="${focusLayer + 1}"]`)?.getBoundingClientRect();
    if (!source || !target) return;
    const viewport = scroll.getBoundingClientRect();
    const offset = target.right > viewport.right ? target.right - viewport.right + 10
      : Math.min(0, Math.max(source.left, target.right - viewport.width + 20) - viewport.left - 10);
    if (offset !== 0) scroll.scrollBy({
      left: offset, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  }, [focusLayer, hasOpenNode, openedNode?.neuron]);

  const count = network.layers.length;
  const sizes = [network.inputs.length, ...network.layers.map(layer => layer.weights.length)];
  const inputCount = openedNode ? sizes[openedNode.layer] : 0;
  const calculationHeight = inputCount <= 2 ? 172 : 120 + 41 * Math.ceil(inputCount / 2);
  const rows = sizes.map((size, column) => layerRows(size,
    openedNode?.layer === column - 1 ? openedNode.neuron : -1, calculationHeight));
  const wide = Boolean(frame || openedNode);
  const padding = wide ? 134 : 112;
  const width = Math.max(510, count * (wide ? 224 : 145) + padding * 2);
  const height = openedNode ? Math.max(335, 72 + Math.max(...rows.map(row => row.span)))
    : Math.max(335, Math.max(...sizes) * 60 + 80);
  const gap = (width - padding * 2) / count;
  const x = (column: number) => padding + column * gap;
  const y = (column: number, node: number) => {
    const row = rows[column];
    if (openedNode) return 56 + (height - 72 - row.span) / 2 + row.top + row.positions[node];
    const spacing = sizes[column] <= 2 ? 108 : sizes[column] === 3 ? 87 : 59;
    return (height + 20) / 2 + (node - (sizes[column] - 1) / 2) * spacing;
  };
  function edgeGeometry(layer: number, neuron: number, source: number) {
    const x1 = x(layer) + 30;
    const x2 = x(layer + 1) - 30;
    const y1 = y(layer, source);
    const y2 = y(layer + 1, neuron);
    const bend = (x2 - x1) * 0.46;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const span = Math.hypot(dx, dy) || 1;
    const nx = -dy / span;
    const ny = dx / span;
    const lane = 18;
    const arrowPath = `M ${x1 + nx * lane} ${y1 + ny * lane} C ${x1 + bend + nx * lane} ${y1 + ny * lane}, ${x2 - bend + nx * lane} ${y2 + ny * lane}, ${x2 + nx * lane} ${y2 + ny * lane}`;
    return {
      path: `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`,
      arrowPath,
      labelX: (x1 + x2) / 2,
      labelY: (y1 + y2) / 2,
    };
  }

  const halfW = width / (2 * zoom);
  const halfH = height / (2 * zoom);
  const viewCX = Math.min(width - halfW, Math.max(halfW, center?.x ?? width / 2));
  const viewCY = Math.min(height - halfH, Math.max(halfH, center?.y ?? height / 2));
  const viewX = viewCX - halfW;
  const viewY = viewCY - halfH;
  const viewBox = `${viewX} ${viewY} ${width / zoom} ${height / zoom}`;

  useEffect(() => {
    if (!openedNode || openedNode.layer < 0) return;
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return;
    const point = svg.createSVGPoint();
    point.x = x(openedNode.layer + 1);
    point.y = y(openedNode.layer + 1, openedNode.neuron);
    const screen = point.matrixTransform(matrix);
    const panelWidth = Math.min(380, window.innerWidth - 24);
    const panelHeight = Math.min(360, window.innerHeight - 24);
    const gap = 34;
    const scrollRect = scrollRef.current?.getBoundingClientRect();
    const boundary = scrollRect ? scrollRect.right : window.innerWidth - 12;
    const rightSide = screen.x + panelWidth + gap <= boundary;
    const left = Math.max(12, Math.min(rightSide ? screen.x + gap : screen.x - panelWidth - gap,
      window.innerWidth - panelWidth - 12));
    const top = Math.max(12, Math.min(screen.y - panelHeight / 2, window.innerHeight - panelHeight - 12));
    setPanelPos({ left, top });
  }, [openedNode?.layer, openedNode?.neuron, expanded]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const fit = () => {
      const rect = panel.getBoundingClientRect();
      setPanelPos(current => {
        if (!current) return current;
        const left = Math.max(0, Math.min(current.left, window.innerWidth - rect.width));
        const top = Math.max(0, Math.min(current.top, window.innerHeight - rect.height));
        return left === current.left && top === current.top ? current : { left, top };
      });
    };
    const observer = new ResizeObserver(fit);
    observer.observe(panel);
    window.addEventListener('resize', fit);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', fit);
    };
  }, [openedNode?.layer, openedNode?.neuron]);

  function clampViewCenter(x: number, y: number, z: number) {
    const hw = width / (2 * z);
    const hh = height / (2 * z);
    return {
      x: Math.min(width - hw, Math.max(hw, x)),
      y: Math.min(height - hh, Math.max(hh, y)),
    };
  }

  function zoomTo(nextZoom: number, clientX?: number, clientY?: number) {
    const next = Math.min(3.5, Math.max(1, nextZoom));
    if (Math.abs(next - zoom) < 0.001) return;
    const rect = svgRef.current?.getBoundingClientRect();
    const anchorX = rect && clientX !== undefined
      ? Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) : 0.5;
    const anchorY = rect && clientY !== undefined
      ? Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)) : 0.5;
    const currentW = width / zoom;
    const currentH = height / zoom;
    const currentX = viewCX - currentW / 2;
    const currentY = viewCY - currentH / 2;
    const worldX = currentX + anchorX * currentW;
    const worldY = currentY + anchorY * currentH;
    const nextW = width / next;
    const nextH = height / next;
    const nextX = worldX - anchorX * nextW;
    const nextY = worldY - anchorY * nextH;
    setCenter(clampViewCenter(nextX + nextW / 2, nextY + nextH / 2, next));
    setZoom(next);
  }

  function resetView() {
    setZoom(1);
    setCenter(null);
  }

  function startPan(event: ReactPointerEvent<HTMLDivElement>) {
    if (zoom <= 1 || event.button !== 0) return;
    panStart.current = { x: event.clientX, y: event.clientY, cx: viewCX, cy: viewCY };
    dragged.current = false;
  }

  function movePan(event: ReactPointerEvent<HTMLDivElement>) {
    const start = panStart.current;
    if (!start) return;
    const dxPx = event.clientX - start.x;
    const dyPx = event.clientY - start.y;
    if (!dragged.current && Math.hypot(dxPx, dyPx) < 4) return;
    if (!dragged.current) {
      dragged.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setPanning(true);
    }
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dx = dxPx / rect.width * (width / zoom);
    const dy = dyPx / rect.height * (height / zoom);
    setCenter(clampViewCenter(start.cx - dx, start.cy - dy, zoom));
  }

  function endPan(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragged.current) {
      suppressClick.current = true;
      window.setTimeout(() => { suppressClick.current = false; }, 60);
    }
    dragged.current = false;
    panStart.current = null;
    setPanning(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  useEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll) return;
    const onWheel = (event: WheelEvent) => {
      // A plain wheel belongs to the page. Zooming needs Ctrl/⌘ unless the diagram fills the screen.
      if (!expanded && !event.ctrlKey && !event.metaKey) return;
      const next = Math.min(3.5, Math.max(1, zoom * Math.exp(-event.deltaY * 0.0012)));
      event.preventDefault();
      if (Math.abs(next - zoom) < 0.001) return;
      zoomTo(next, event.clientX, event.clientY);
    };
    scroll.addEventListener('wheel', onWheel, { passive: false });
    return () => scroll.removeEventListener('wheel', onWheel);
  }, [zoom, center, width, height, expanded]);

  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [expanded]);

  useEffect(() => {
    setExplainOpen(false);
  }, [openedNode?.layer, openedNode?.neuron]);

  function openExplain(step: number | null) {
    setExplainStep(step);
    setExplainOpen(true);
  }

  function startCardDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest('button')) return;
    const panel = (event.currentTarget as HTMLElement).closest('.calc-panel') as HTMLElement | null;
    if (!panel) return;
    const panelRect = panel.getBoundingClientRect();
    cardDrag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      left: panelRect.left,
      top: panelRect.top,
      width: panelRect.width,
      height: panelRect.height,
      boundsWidth: window.innerWidth,
      boundsHeight: window.innerHeight,
    };
    setPanelPos({ left: panelRect.left, top: panelRect.top });
    event.currentTarget.setPointerCapture(event.pointerId);
    setCardMoving(true);
    event.preventDefault();
  }

  function moveCard(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = cardDrag.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const left = Math.max(0, Math.min(drag.left + event.clientX - drag.startX, drag.boundsWidth - drag.width));
    const top = Math.max(0, Math.min(drag.top + event.clientY - drag.startY, drag.boundsHeight - drag.height));
    setPanelPos({ left, top });
  }

  function endCardDrag() {
    cardDrag.current = null;
    setCardMoving(false);
  }

  const values = [network.inputs, ...(result?.layers.map(layer => layer.neurons.map(neuron => neuron.output)) ?? [])];
  // Data keeps flowing along the same connections for the whole layer, then
  // hands over to the next layer during the pass stage.
  const weighted = frame ? frame.step >= ForwardStep.Multiply && frame.step !== ForwardStep.Pass : false;
  const flowLayer = frame
    ? frame.step === ForwardStep.Pass && frame.layer + 1 < count ? frame.layer + 1 : frame.layer
    : null;
  // Large layers stay light: only the packets themselves, without trails or labels.
  const flowEdges = flowLayer === null ? 0
    : network.layers[flowLayer].weights.reduce((total, row) => total + row.length, 0);
  const errorLayers = backward
    ? backward.kind === 'layer' && backward.layer !== null ? [backward.layer]
      : backward.kind === 'gradients' || backward.kind === 'update' ? network.layers.map((_, index) => index)
        : []
    : [];
  const errorNodes = backward
    ? backward.kind === 'compare' || backward.kind === 'error' ? [network.layers.length - 1] : errorLayers
    : [];
  const showDetails = flowEdges <= 24;
  const showTags = flowEdges <= 16;
  const inspectedStep = openedNode?.layer === frame?.layer ? frame?.step : undefined;
  const waiting = openedNode && frame && openedNode.layer > frame.layer;
  const calculation = openedNode && result && !stale && !waiting
    ? neuronEquations(result, openedNode.layer, openedNode.neuron) : null;
  const equations = calculation
    ? inspectedStep === undefined ? calculation.slice(ForwardStep.Multiply, ForwardStep.Pass) : [calculation[inspectedStep]]
    : [[waiting ? 'Waiting for this layer.' : 'Run the forward pass to see the calculation.']];
  const calculationLabel = inspectedStep === undefined ? 'Calculation' : forwardStages[inspectedStep].label;
  const cardOpen = Boolean(openedNode && openedNode.layer >= 0);
  const openedName = openedNode ? neuronName(openedNode.layer, openedNode.neuron, count) : '';

  const zoomHint = expanded ? 'Scroll to zoom' : 'Ctrl + scroll to zoom';
  const canvas = <div className={`diagram-canvas ${expanded ? 'expanded' : ''}`}>
    {expanded && <div className="diagram-expanded-head">
      <span className="diagram-expanded-title"><Icon name="network" size={16}/>Network diagram</span>
      <button type="button" className="button small" onClick={() => setExpanded(false)}>
        <Icon name="compress" size={14}/>Exit full screen
      </button>
    </div>}
    <div className={`diagram-scroll ${zoom > 1 ? 'zoomed' : ''} ${panning ? 'panning' : ''}`} ref={scrollRef}
      onPointerDown={startPan} onPointerMove={movePan} onPointerUp={endPan} onPointerCancel={endPan}
      onClickCapture={event => {
        if (suppressClick.current) {
          event.preventDefault();
          event.stopPropagation();
          suppressClick.current = false;
        }
      }}>
    <svg ref={svgRef} className="network-svg" viewBox={viewBox}
      style={{ minWidth: zoom > 1 ? 0 : wide ? width - 55 : count === 1 ? 0 : width - 90, height: height - 26 }}
      aria-label="Network diagram. Use the zoom controls, or hold Control and scroll, to zoom. Drag to pan when zoomed. Use Tab to reach nodes and Enter to show or hide calculations.">
      <defs>
        <radialGradient id="neuron-input" cx="36%" cy="28%" r="78%">
          <stop offset="0%" stopColor="#c8f8ff"/>
          <stop offset="46%" stopColor="#39c9f5"/>
          <stop offset="100%" stopColor="#1769b8"/>
        </radialGradient>
        <radialGradient id="neuron-hidden" cx="36%" cy="28%" r="78%">
          <stop offset="0%" stopColor="#e4d8ff"/>
          <stop offset="46%" stopColor="#9e7bff"/>
          <stop offset="100%" stopColor="#5739c4"/>
        </radialGradient>
        <radialGradient id="neuron-output" cx="36%" cy="28%" r="78%">
          <stop offset="0%" stopColor="#fff0cf"/>
          <stop offset="46%" stopColor="#ffbf5e"/>
          <stop offset="100%" stopColor="#c46a1a"/>
        </radialGradient>
        <radialGradient id="neuron-revealed" cx="36%" cy="28%" r="78%">
          <stop offset="0%" stopColor="#ffffff"/>
          <stop offset="42%" stopColor="#ffe0a8"/>
          <stop offset="100%" stopColor="#ff9b4d"/>
        </radialGradient>
        <linearGradient id="column-plate" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#16224a"/>
          <stop offset="100%" stopColor="#0a1026"/>
        </linearGradient>
        <radialGradient id="flow-glow">
          <stop offset="0%" stopColor="#9beeff" stopOpacity=".42"/>
          <stop offset="45%" stopColor="#5ee7ff" stopOpacity=".18"/>
          <stop offset="100%" stopColor="#5ee7ff" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="flow-glow-warm">
          <stop offset="0%" stopColor="#ffd79a" stopOpacity=".42"/>
          <stop offset="45%" stopColor="#ffc46b" stopOpacity=".18"/>
          <stop offset="100%" stopColor="#ffc46b" stopOpacity="0"/>
        </radialGradient>
        <filter id="soft-glow" x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur stdDeviation="5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {sizes.map((_, column) => {
        const layer = column - 1;
        const highlighted = active === layer || (active !== null && active - 1 === layer);
        return <g key={column} data-column={column} className={highlighted ? 'column highlighted' : 'column'}>
          <rect x={x(column) - 68} y="12" width="136" height="32" rx="16"/>
          <text x={x(column)} y="33">{layerName(layer, count)}</text>
        </g>;
      })}
      {network.layers.flatMap((layer, index) => layer.weights.flatMap((row, neuron) => row.map((weight, source) => {
        const edge = { layer: index, neuron, source };
        const chosen = connection?.layer === index && connection.neuron === neuron && connection.source === source;
        const incoming = selected.layer === index && selected.neuron === neuron;
        const outgoing = selected.layer === index - 1 && selected.neuron === source;
        const lit = frame ? index === flowLayer || (index === frame.layer && incoming)
          : incoming || outgoing || index === active;
        const value = String(weight).trim() === '' ? NaN : Number(weight);
        const sign = value > 0 ? 'positive' : value < 0 ? 'negative' : 'zero';
        const { path } = edgeGeometry(index, neuron, source);
        const name = `Weight from ${neuronName(index - 1, source, count)} to ${neuronName(index, neuron, count)}`;
        const errorEdge = errorLayers.includes(index);
        return <g key={`${index}-${neuron}-${source}`} className={`edge ${sign} ${lit ? 'lit' : ''} ${chosen ? 'chosen' : ''} ${errorEdge ? 'backward' : ''}`}
          role="button" aria-label={`${name}: ${weight}`} aria-pressed={chosen}
          aria-disabled={Boolean(frame) || Boolean(backward)} tabIndex={incoming && !frame ? 0 : -1}
          onClick={() => onEdge(edge)} onKeyDown={event => activateOnKey(event, () => onEdge(edge))}>
          <title>{`${name}: ${weight}`}</title>
          <path className="edge-line" d={path}/>
          <path className="edge-hit" d={path}/>
        </g>;
      })))}
      {network.layers.flatMap((layer, index) => layer.weights.flatMap((row, neuron) => row.map((weight, source) => {
        const chosen = connection?.layer === index && connection.neuron === neuron && connection.source === source;
        const incoming = selected.layer === index && selected.neuron === neuron;
        if (frame || backward || openedNode || (!chosen && (!incoming || row.length > 4))) return null;
        const { labelX, labelY } = edgeGeometry(index, neuron, source);
        const value = String(weight).trim() === '' ? NaN : Number(weight);
        const label = Number.isFinite(value) ? format(value) : '…';
        const labelWidth = Math.max(34, label.length * 7 + 14);
        return <g key={`label-${index}-${neuron}-${source}`} className={`edge-label ${chosen ? 'chosen' : ''}`}
          aria-hidden="true"
          transform={`translate(${labelX}, ${labelY})`}
          onClick={() => onEdge({ layer: index, neuron, source })}>
          <rect x={-labelWidth / 2} y="-11" width={labelWidth} height="22" rx="8"/>
          <text y="4">{label}</text>
        </g>;
      })))}
      {backward && errorLayers.length > 0 && <g className="backward-labels" aria-hidden="true">
        {errorLayers.flatMap(layer => network.layers[layer].weights.flatMap((row, neuron) => row.map((_, source) => {
          const gradient = gradients?.[layer]?.weight_gradients[neuron]?.[source];
          if (gradient === undefined) return null;
          const { labelX, labelY } = edgeGeometry(layer, neuron, source);
          const label = `∇ ${format(gradient)}`;
          const labelWidth = Math.max(44, label.length * 7 + 12);
          return <g key={`gradient-${layer}-${neuron}-${source}`} className="backward-label"
            transform={`translate(${labelX}, ${labelY})`}>
            <rect x={-labelWidth / 2} y="-11" width={labelWidth} height="22" rx="8"/>
            <text y="4">{label}</text>
          </g>;
        })))}
      </g>}
      {frame && flowLayer !== null && <g key={`flow-${flowLayer}`} aria-hidden="true"
        className={weighted ? 'flow-packets products' : 'flow-packets'}>
        {network.layers[flowLayer].weights.flatMap((weights, neuron) => weights.map((weight, source) => {
          const { path, arrowPath } = edgeGeometry(flowLayer, neuron, source);
          const phase = (weights.length * neuron + source) * 0.37 % 1;
          const position = { offsetPath: `path("${path}")`, '--flow-phase': phase.toFixed(3) } as CSSProperties;
          const trail = { offsetPath: `path("${path}")`,
            '--flow-phase': ((phase - 0.045 + 1) % 1).toFixed(3) } as CSSProperties;
          const mote = { offsetPath: `path("${path}")`,
            '--flow-phase': ((phase + 0.5) % 1).toFixed(3) } as CSSProperties;
          const arrow = { offsetPath: `path("${arrowPath}")`,
            '--flow-phase': phase.toFixed(3) } as CSSProperties;
          const sign = Number(weight) < 0 ? ' negative' : Number(weight) === 0 ? ' zero' : '';
          const tag = weighted
            ? (result?.layers[flowLayer]?.neurons[neuron]?.products[source] ?? NaN)
            : Number(values[flowLayer]?.[source] ?? NaN);
          return <g key={`${neuron}-${source}`} className="packet-group">
            {showDetails && <circle className="flow-trail" r="12" style={trail}/>}
            {showDetails && <circle className="flow-mote" r="2.4" style={mote}/>}
            <circle className={`flow-packet${sign}`} r="3.6" style={position}/>
            <path className="flow-arrow" d="M -8 0 H 3 M 0 -5 L 6 0 L 0 5 Z" style={arrow}/>
            {showTags && Number.isFinite(tag) && <text className="flow-tag" style={position} dy="-9">{format(tag)}</text>}
          </g>;
        }))}
      </g>}
      {backward && errorLayers.length > 0 && <g className="backward-flow" aria-hidden="true">
        {errorLayers.flatMap(layer => network.layers[layer].weights.flatMap((weights, neuron) => weights.map((_weight, source) => {
          const { path } = edgeGeometry(layer, neuron, source);
          const phase = (weights.length * neuron + source) * 0.37 % 1;
          const position = { offsetPath: `path("${path}")`, '--flow-phase': phase.toFixed(3) } as CSSProperties;
          const trail = { offsetPath: `path("${path}")`,
            '--flow-phase': ((phase - 0.045 + 1) % 1).toFixed(3) } as CSSProperties;
          return <g key={`back-${layer}-${neuron}-${source}`} className="backward-packet-group">
            <circle className="backward-trail" r="13" style={trail}/>
            <circle className="backward-packet" r="4.3" style={position}/>
            <path className="backward-arrow" d="M -8 0 H 3 M 0 -5 L 6 0 L 0 5 Z" style={position}/>
          </g>;
        })))}
      </g>}
      {sizes.flatMap((size, column) => Array.from({ length: size }, (_, neuron) => {
        const layer = column - 1;
        const isSelected = selected.layer === layer && selected.neuron === neuron;
        const isOpen = openedNode?.layer === layer && openedNode.neuron === neuron;
        const receiving = layer === selected.layer + 1 && selected.layer >= 0 && (!frame || frame.step === ForwardStep.Pass);
        const arriving = active !== null && layer === active - 1;
        const pending = frame && (layer > frame.layer || (layer === frame.layer && frame.step < ForwardStep.Activate));
        const revealed = frame?.layer === layer && frame.step >= ForwardStep.Activate;
        const computing = frame?.layer === layer && frame.step >= ForwardStep.Sum && frame.step < ForwardStep.Activate;
        const raw = pending ? undefined : values[column]?.[neuron];
        const value = raw === undefined || String(raw).trim() === '' ? NaN : Number(raw);
        const name = neuronName(layer, neuron, count);
        const label = Number.isFinite(value) ? format(value) : '—';
        const node = { layer, neuron };
        const kind = column === 0 ? 'input-node' : column === count ? 'output-node' : 'hidden-node';
        const errorNode = errorNodes.includes(layer);
        return <g key={`node-${layer}-${neuron}`} className={`neuron ${kind} ${isSelected ? 'selected' : ''} ${arriving || receiving ? 'receiving' : ''} ${computing ? 'node-computing' : ''} ${revealed ? 'node-revealed' : ''} ${errorNode ? 'error-node' : ''}`}
          role="button" tabIndex={0} aria-label={`${name}, value ${label}`} aria-pressed={isSelected}
          aria-expanded={layer >= 0 ? isOpen : undefined}
          transform={`translate(${x(column)}, ${y(column, neuron)})`}
          onClick={() => onNode(node)} onKeyDown={event => activateOnKey(event, () => onNode(node))}>
          {revealed && <circle key={`burst-${layer}`} className="node-burst" r="27"/>}
          <circle className="node-ring" r="35"/>
          <circle className="node-body" r="27"/>
          <text className="node-value" y="5"
            style={label.length > 5 ? { fontSize: 11 } : label.length > 3 ? { fontSize: 13.5 } : undefined}>{label}</text>
          {sizes[column] <= 4 && <text className="node-caption" y="48">
            {column === 0 ? `x${neuron + 1}` : column === count ? `y${neuron + 1}` : `h${layer + 1}.${neuron + 1}`}
          </text>}
        </g>;
      }))}
    </svg>
    </div>
    <div className="diagram-zoom" role="group" aria-label="Diagram zoom" title={`${zoomHint} · drag to pan`}>
      <button type="button" onClick={() => zoomTo(zoom / 1.25)} disabled={zoom <= 1.001}
        aria-label="Zoom out"><Icon name="minus" size={15}/></button>
      <span aria-live="polite">{Math.round(zoom * 100)}%</span>
      <button type="button" onClick={() => zoomTo(zoom * 1.25)} disabled={zoom >= 3.499}
        aria-label="Zoom in"><Icon name="plus" size={15}/></button>
      <button type="button" className="zoom-fit" onClick={resetView} aria-label="Fit diagram">Fit</button>
      <span className="diagram-zoom-divider" aria-hidden="true"/>
      <button type="button" className="zoom-expand" onClick={() => setExpanded(value => !value)}
        aria-label={expanded ? 'Shrink diagram' : 'Expand diagram'}
        title={expanded ? 'Shrink diagram' : 'Expand diagram'}>
        <Icon name={expanded ? 'compress' : 'expand'} size={15}/>
      </button>
    </div>
    <div className="diagram-zoom-hint">{zoom > 1 ? `${zoomHint} · drag to pan` : zoomHint}</div>
  </div>;
  return <>
    {expanded ? createPortal(canvas, document.body) : canvas}
    {cardOpen && openedNode && createPortal(<div
      ref={panelRef}
      className={`calc-panel ${panelPos ? 'moved' : ''} ${cardMoving ? 'dragging' : ''}`}
      style={panelPos ?? undefined}
      role="region" aria-label={`Calculation for ${openedName}`}>
      <div className="calc-panel-head"
        onPointerDown={startCardDrag} onPointerMove={moveCard} onPointerUp={endCardDrag} onPointerCancel={endCardDrag}>
        <span className="calc-grip" aria-hidden="true"><Icon name="grip" size={14}/></span>
        <span className="calc-panel-name">{openedName}</span>
        <div className="calc-panel-tools">
          <span className="calc-panel-chip">{calculationLabel}</span>
          {calculation && <button type="button" className="equation-explain header-explain"
            aria-label={`Explain the calculation for ${openedName}`}
            onClick={() => openExplain(null)}>
            <Icon name="help" size={12}/>
          </button>}
          <button type="button" className="icon-button calc-panel-close" aria-label="Close calculation"
            onClick={() => onNode(openedNode)}><Icon name="close" size={14}/></button>
        </div>
      </div>
      <div className="calc-panel-body" key={calculationLabel}>
        {calculation ? equations.map((group, index) => {
          const cardStep = inspectedStep !== undefined ? inspectedStep : index + ForwardStep.Multiply;
          return <div className="neuron-equation-row" key={index}>
            <button type="button" className="equation-explain"
              aria-label={`Explain ${forwardStages[cardStep].label}`}
              onClick={() => openExplain(cardStep)}>!</button>
            <div className="neuron-equations math">
              {group.map((equation, row) => <div key={row}>{equation}</div>)}
            </div>
          </div>;
        }) : <p className="calc-panel-empty">{equations[0]?.[0] ?? 'Run the forward pass to see the calculation.'}</p>}
        {inspectedStep !== undefined && <p className="neuron-work-note">{forwardStages[inspectedStep].detail}</p>}
      </div>
      <div className="calc-panel-foot">Drag the header to move · drag the corner to resize</div>
    </div>, document.body)}
    {explainOpen && openedNode && result && <CalculationExplainer
      result={result}
      layer={openedNode.layer}
      neuron={openedNode.neuron}
      focusStep={explainStep}
      onClose={() => setExplainOpen(false)}
      onShowAll={() => setExplainStep(null)}/>}
  </>;
}
