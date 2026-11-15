import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import {
  FEATURE_OPTIONS, featureValue, featureVector, forward,
} from './playgroundModel';
import type {
  FeatureKey, PlaygroundNetwork, ProblemType,
} from './playgroundModel';
import { useI18n } from './i18n';

const W = 1040;
const H = 430;
const FEATURE_X = 74;
const FEATURE_SIZE = 34;
const FEATURE_GAP = 50;
const NODE_SIZE = 34;
const OUTPUT_SIZE = 38;
const DOMAIN = 6;

export interface StageSelection {
  kind: 'node' | 'edge';
  layer: number;
  neuron: number;
  source?: number;
}

interface StageProps {
  network: PlaygroundNetwork | null;
  features: FeatureKey[];
  version: number;
  problem: ProblemType;
  active: boolean;
  selected: StageSelection | null;
  onSelect: (selection: StageSelection) => void;
  onToggleFeature: (key: FeatureKey) => void;
  onFocusNode: (layer: number | null, neuron: number | null) => void;
}

interface NodeHit {
  kind: 'node';
  layer: number;
  neuron: number;
  x: number;
  y: number;
  size: number;
}

interface FeatureHit {
  kind: 'feature';
  feature: FeatureKey;
  x: number;
  y: number;
  size: number;
}

interface EdgeHit {
  kind: 'edge';
  layer: number;
  neuron: number;
  source: number;
  weight: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

type Hit = NodeHit | FeatureHit | EdgeHit;

function label(key: FeatureKey) {
  return FEATURE_OPTIONS.find(option => option.key === key)?.label ?? key;
}

function colorScale(value: number, maxAbs: number) {
  const t = Math.max(-1, Math.min(1, value / Math.max(1e-6, maxAbs)));
  const base = t >= 0 ? [8, 119, 189] : [245, 147, 34];
  const strength = Math.abs(t);
  const mix = 0.08 + strength * 0.78;
  const light = [247, 245, 241];
  return [
    Math.round(light[0] * (1 - mix) + base[0] * mix),
    Math.round(light[1] * (1 - mix) + base[1] * mix),
    Math.round(light[2] * (1 - mix) + base[2] * mix),
  ];
}

function drawTile(
  context: CanvasRenderingContext2D,
  values: number[],
  x: number,
  y: number,
  size: number,
  border: string,
) {
  const grid = Math.round(Math.sqrt(values.length));
  const maxAbs = Math.max(1e-6, ...values.map(value => Math.abs(value)));
  const off = document.createElement('canvas');
  off.width = grid;
  off.height = grid;
  const offContext = off.getContext('2d');
  if (!offContext) return;
  const image = offContext.createImageData(grid, grid);
  for (let index = 0; index < values.length; index += 1) {
    const color = colorScale(values[index], maxAbs);
    image.data[index * 4] = color[0];
    image.data[index * 4 + 1] = color[1];
    image.data[index * 4 + 2] = color[2];
    image.data[index * 4 + 3] = 255;
  }
  offContext.putImageData(image, 0, 0);
  context.drawImage(off, 0, 0, grid, grid, x, y, size, size);
  context.strokeStyle = border;
  context.lineWidth = 1.5;
  context.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
}

export function NetworkStage({
  network, features, version, problem, active, selected, onSelect, onToggleFeature, onFocusNode,
}: StageProps) {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const flowRef = useRef<HTMLCanvasElement>(null);
  const hits = useRef<Hit[]>([]);
  const phaseRef = useRef(0);
  const [hover, setHover] = useState<Hit | null>(null);
  const hoverKey = useRef('');

  const paintFlow = useCallback(() => {
    const canvas = flowRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const phase = phaseRef.current;
    context.clearRect(0, 0, W, H);
    context.globalCompositeOperation = 'source-over';
    for (const item of hits.current) {
      if (item.kind !== 'edge') continue;
      const magnitude = Math.min(1, Math.abs(item.weight));
      if (magnitude < 0.035) continue;
      const color = item.weight >= 0 ? '8, 119, 189' : '245, 147, 34';
      const offset = ((item.layer * 13 + item.neuron * 7 + item.source * 3) % 10) / 10;

      context.save();
      context.setLineDash([3, 9]);
      context.lineDashOffset = -(phase * 28 + offset * 17);
      context.strokeStyle = `rgba(${color}, ${0.08 + magnitude * 0.25})`;
      context.lineWidth = 1.2;
      context.beginPath();
      context.moveTo(item.x1, item.y1);
      context.lineTo(item.x2, item.y2);
      context.stroke();
      context.restore();

      const count = magnitude > 0.8 ? 3 : magnitude > 0.3 ? 2 : 1;
      for (let dot = 0; dot < count; dot += 1) {
        const t = (phase * 0.55 + offset + dot / count) % 1;
        const x = item.x1 + (item.x2 - item.x1) * t;
        const y = item.y1 + (item.y2 - item.y1) * t;
        context.beginPath();
        context.arc(x, y, 1.6 + magnitude * 2.5, 0, Math.PI * 2);
        context.fillStyle = `rgba(${color}, ${0.4 + magnitude * 0.6})`;
        context.fill();
      }
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, W, H);
    context.fillStyle = '#f7f5f1';
    context.fillRect(0, 0, W, H);
    context.font = '600 11px Inter, sans-serif';
    context.fillStyle = '#6f6a61';
    context.fillText(t('FEATURES'), 20, 20);

    const networkHits: Hit[] = [];
    const featurePositions = FEATURE_OPTIONS.map((option, index) => ({
      key: option.key,
      x: FEATURE_X,
      y: 38 + index * FEATURE_GAP,
      size: FEATURE_SIZE,
    }));

    const layerPositions: { x: number; nodes: { y: number }[] }[] = [];
    if (network) {
      const hiddenLayers = network.layers.length - 1;
      const start = 280;
      const end = 790;
      for (let layer = 0; layer < network.layers.length; layer += 1) {
        const isOutput = layer === hiddenLayers;
        const size = isOutput ? OUTPUT_SIZE : NODE_SIZE;
        const nodes = network.layers[layer].weights.length;
        const total = nodes * size + Math.max(0, nodes - 1) * 10;
        const first = (H - total) / 2 + size / 2;
        const x = isOutput
          ? 940
          : hiddenLayers === 1
            ? 500
            : start + (layer / Math.max(1, hiddenLayers - 1)) * (end - start);
        layerPositions.push({
          x,
          nodes: Array.from({ length: nodes }, (_, index) => ({ y: first + index * (size + 10) - size / 2 })),
        });
        context.fillStyle = '#6f6a61';
        context.font = '600 10px Inter, sans-serif';
        context.textAlign = 'center';
        context.fillText(isOutput ? t('OUTPUT') : `${nodes} ${t(nodes === 1 ? 'neuron' : 'neurons')}`,
          x + size / 2, 20);
        context.textAlign = 'left';
      }
    }

    const edges: EdgeHit[] = [];
    if (network) {
      const drawEdges = (layer: number, sourceX: number, sourceY: number, sourceIndex: number) => {
        const target = layerPositions[layer];
        const size = layer === network.layers.length - 1 ? OUTPUT_SIZE : NODE_SIZE;
        for (let neuron = 0; neuron < target.nodes.length; neuron += 1) {
          const weight = network.layers[layer].weights[neuron][sourceIndex];
          if (weight === undefined) continue;
          const x2 = target.x;
          const y2 = target.nodes[neuron].y + size / 2;
          const positive = weight >= 0;
          context.strokeStyle = positive
            ? `rgba(8,119,189,${0.2 + Math.min(0.65, Math.abs(weight) / 3)})`
            : `rgba(245,147,34,${0.2 + Math.min(0.65, Math.abs(weight) / 3)})`;
          context.lineWidth = 1 + Math.min(5, Math.abs(weight) * 2);
          context.beginPath();
          context.moveTo(sourceX, sourceY);
          context.lineTo(x2, y2);
          context.stroke();
          edges.push({ kind: 'edge', layer, neuron, source: sourceIndex, weight, x1: sourceX, y1: sourceY, x2, y2 });
        }
      };
      for (const feature of featurePositions) {
        if (!features.includes(feature.key)) continue;
        const sourceIndex = features.indexOf(feature.key);
        drawEdges(0, feature.x + feature.size, feature.y + feature.size / 2, sourceIndex);
      }
      for (let layer = 1; layer < network.layers.length; layer += 1) {
        const previous = layerPositions[layer - 1];
        const previousSize = NODE_SIZE;
        for (let source = 0; source < previous.nodes.length; source += 1) {
          drawEdges(layer, previous.x + previousSize, previous.nodes[source].y + previousSize / 2, source);
        }
      }
    }

    for (const feature of featurePositions) {
      const active = features.includes(feature.key);
      const values: number[] = [];
      for (let row = 0; row < 20; row += 1) {
        for (let column = 0; column < 20; column += 1) {
          values.push(featureValue({
            x: -DOMAIN + (column + 0.5) / 20 * DOMAIN * 2,
            y: DOMAIN - (row + 0.5) / 20 * DOMAIN * 2,
          }, feature.key));
        }
      }
      context.globalAlpha = active ? 1 : 0.3;
      drawTile(context, values, feature.x, feature.y, feature.size,
        active ? '#b9b2a5' : '#ddd8ce');
      context.globalAlpha = 1;
      context.fillStyle = active ? '#39342d' : '#a39c90';
      context.font = '600 11px Inter, sans-serif';
      context.textAlign = 'right';
      context.fillText(label(feature.key), feature.x - 8, feature.y + feature.size / 2 + 4);
      context.textAlign = 'left';
      networkHits.push({ kind: 'feature', feature: feature.key, x: feature.x, y: feature.y, size: feature.size });
    }

    if (network) {
      const grid = 18;
      const maps: number[][][] = network.layers.map(layer => layer.biases.map(() => []));
      for (let row = 0; row < grid; row += 1) {
        for (let column = 0; column < grid; column += 1) {
          const result = forward(network, featureVector({
            x: -DOMAIN + (column + 0.5) / grid * DOMAIN * 2,
            y: DOMAIN - (row + 0.5) / grid * DOMAIN * 2,
          }, features));
          for (let layer = 0; layer < network.layers.length; layer += 1) {
            for (let neuron = 0; neuron < network.layers[layer].weights.length; neuron += 1) {
              maps[layer][neuron].push(result.activations[layer + 1][neuron]);
            }
          }
        }
      }
      for (let layer = 0; layer < network.layers.length; layer += 1) {
        const isOutput = layer === network.layers.length - 1;
        const size = isOutput ? OUTPUT_SIZE : NODE_SIZE;
        const position = layerPositions[layer];
        for (let neuron = 0; neuron < position.nodes.length; neuron += 1) {
          const y = position.nodes[neuron].y;
          const isSelected = selected?.kind === 'node' && selected.layer === layer && selected.neuron === neuron;
          const isHovered = hover?.kind === 'node' && hover.layer === layer && hover.neuron === neuron;
          drawTile(context, maps[layer][neuron], position.x, y, size,
            isSelected ? '#d4851a' : isHovered ? '#0877bd' : '#c9c2b6');
          networkHits.push({ kind: 'node', layer, neuron, x: position.x, y, size });
        }
      }
    }

    hits.current = [...networkHits, ...edges];
  }, [network, features, version, problem, selected, hover]);

  useEffect(() => {
    if (!active) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const speed = 2.2 * (reduceMotion ? 0.55 : 1);
    let frame = 0;
    let previous = performance.now();
    const draw = (now: number) => {
      const delta = Math.min(0.08, (now - previous) / 1000);
      previous = now;
      phaseRef.current += delta * speed;
      paintFlow();
      frame = window.requestAnimationFrame(draw);
    };
    frame = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(frame);
  }, [active, paintFlow]);

  useEffect(() => {
    if (!active) paintFlow();
  }, [active, version, paintFlow]);

  function point(event: MouseEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / rect.width * W,
      y: (event.clientY - rect.top) / rect.height * H,
    };
  }

  function hitTest(position: { x: number; y: number }): Hit | null {
    for (const item of hits.current) {
      if (item.kind === 'edge') continue;
      if (position.x >= item.x && position.x <= item.x + item.size
        && position.y >= item.y && position.y <= item.y + item.size) return item;
    }
    let best: { edge: EdgeHit; distance: number } | null = null;
    for (const item of hits.current) {
      if (item.kind !== 'edge') continue;
      const dx = item.x2 - item.x1;
      const dy = item.y2 - item.y1;
      const length = dx * dx + dy * dy;
      const t = length === 0 ? 0 : Math.max(0, Math.min(1,
        ((position.x - item.x1) * dx + (position.y - item.y1) * dy) / length));
      const distance = Math.hypot(position.x - (item.x1 + t * dx), position.y - (item.y1 + t * dy));
      if (distance < 5 && (!best || distance < best.distance)) best = { edge: item, distance };
    }
    return best?.edge ?? null;
  }

  function onMove(event: MouseEvent<HTMLCanvasElement>) {
    const position = point(event);
    const hit = hitTest(position);
    const key = hit?.kind === 'feature' ? `f${hit.feature}`
      : hit?.kind === 'node' ? `n${hit.layer}.${hit.neuron}`
        : hit?.kind === 'edge' ? `e${hit.layer}.${hit.neuron}.${hit.source}` : '';
    if (hoverKey.current !== key) {
      hoverKey.current = key;
      setHover(hit);
      if (hit?.kind === 'node') onFocusNode(hit.layer, hit.neuron);
      else if (!hit) onFocusNode(null, null);
    }
    event.currentTarget.style.cursor = hit ? 'pointer' : 'default';
  }

  function onClick(event: MouseEvent<HTMLCanvasElement>) {
    const hit = hitTest(point(event));
    if (!hit) return;
    if (hit.kind === 'feature') {
      onToggleFeature(hit.feature);
      return;
    }
    onSelect({ kind: hit.kind, layer: hit.layer, neuron: hit.neuron, source: hit.kind === 'edge' ? hit.source : undefined });
    if (hit.kind === 'node') onFocusNode(hit.layer, hit.neuron);
  }

  return <div className="tf-network-wrap">
    <canvas ref={canvasRef} width={W} height={H} className="tf-network-canvas"
      onMouseMove={onMove} onMouseLeave={() => { hoverKey.current = ''; setHover(null); onFocusNode(null, null); }}
      onClick={onClick}
      aria-label={t('Live network')} />
    <canvas ref={flowRef} width={W} height={H} className="tf-flow" aria-hidden="true"/>
  </div>;
}
