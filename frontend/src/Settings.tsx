import { useState } from 'react';
import { activations, layerName } from './model';
import type { Activation, Network } from './model';
import { SettingsGuide } from './SettingsGuide';
import type { GuideContext, GuideTopic } from './SettingsGuide';
import { Icon, NumberField, PanelTitle, Stepper } from './ui';

export type PresetKey = 'one-neuron' | 'two-layers' | 'activation' | 'and';
export type Shape = { inputs: number; hidden: number[]; outputs: number };

export function shapeOf(network: Network): Shape {
  return {
    inputs: network.inputs.length,
    hidden: network.layers.slice(0, -1).map(layer => layer.weights.length),
    outputs: network.layers.at(-1)!.weights.length,
  };
}

const presetNotes: Record<PresetKey, string> = {
  'one-neuron': 'Start here: one neuron, two inputs, nothing hidden.',
  'two-layers': 'A hidden layer turns raw inputs into new features.',
  activation: 'Same total, two rules — see why non-linearity matters.',
  and: 'Four examples teach the network the AND rule.',
};

const presetLabels: Record<PresetKey, string> = {
  'one-neuron': 'One neuron by hand',
  'two-layers': 'Two layers working together',
  activation: 'Why activation matters',
  and: 'AND gate',
};

function ExplainButton({ topic, label, onExplain }: {
  topic: GuideTopic; label: string; onExplain: (topic: GuideTopic) => void;
}) {
  return <button type="button" className="guide-explain" aria-label={`Explain ${label}`}
    onClick={() => onExplain(topic)}>!</button>;
}

export function Settings({ network, preset, disabled, onPreset, onResize, onInput, onSeed, onActivation, onInitialize }: {
  network: Network; preset: PresetKey | ''; disabled: boolean;
  onPreset: (preset: PresetKey) => void; onResize: (shape: Shape) => void;
  onInput: (index: number, value: string) => void; onSeed: (value: string) => void;
  onActivation: (index: number, value: Activation) => void; onInitialize: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [guide, setGuide] = useState<GuideTopic | null>(null);
  const shape = shapeOf(network);
  const context: GuideContext = {
    presetLabel: preset ? presetLabels[preset] : 'Custom / saved lesson',
    shape: [shape.inputs, ...shape.hidden, shape.outputs].join(' → '),
    inputs: shape.inputs,
    hidden: shape.hidden.length,
    outputs: shape.outputs,
    inputValues: network.inputs.map((value, index) => `Input ${index + 1} = ${value}`),
    activationList: network.layers.map((layer, index) => ({
      layer: layerName(index, network.layers.length),
      name: activations[layer.activation].name,
      equation: activations[layer.activation].equation,
    })),
    seed: String(network.seed),
  };
  const openGuide = (topic: GuideTopic) => setGuide(topic);
  return <aside className={`panel settings ${expanded ? 'expanded' : ''}`}>
    <PanelTitle icon="sliders" aside={<button className="button small settings-toggle"
      aria-expanded={expanded} aria-controls="network-architecture network-input-values network-activations network-starting-weights"
      onClick={() => setExpanded(!expanded)}>
      {expanded ? 'Hide settings' : 'Show settings'}<Icon name="down" size={14}/>
    </button>}>Network settings</PanelTitle>
    <div className="settings-section">
      <div className="field-head">
        <ExplainButton topic="preset" label="the preset" onExplain={openGuide}/>
        <label className="field-label" htmlFor="preset">Classroom preset</label>
      </div>
      <select id="preset" value={preset} disabled={disabled}
        onChange={event => onPreset(event.target.value as PresetKey)}>
        <option value="" disabled>Saved or custom lesson</option>
        <option value="one-neuron">One neuron by hand</option>
        <option value="two-layers">Two layers working together</option>
        <option value="activation">Why activation matters</option>
        <option value="and">AND gate</option>
      </select>
      {preset && <p className="preset-note">{presetNotes[preset]}</p>}
    </div>
    <div className="settings-section architecture settings-detail" id="network-architecture">
      <h3><ExplainButton topic="architecture" label="the architecture" onExplain={openGuide}/><Icon name="layers" size={15}/>Architecture</h3>
      <div className="shape math" aria-label="Network shape">{[shape.inputs, ...shape.hidden, shape.outputs].join(' → ')}</div>
      <Stepper label="Inputs" value={shape.inputs} min={1} max={8} disabled={disabled}
        aside={<ExplainButton topic="inputs" label="the number of inputs" onExplain={openGuide}/>}
        onChange={inputs => onResize({ ...shape, inputs })}/>
      <Stepper label="Hidden layers" value={shape.hidden.length} min={0} max={4} disabled={disabled}
        aside={<ExplainButton topic="hidden" label="the number of hidden layers" onExplain={openGuide}/>}
        onChange={length => onResize({ ...shape, hidden: length > shape.hidden.length
          ? [...shape.hidden, 2] : shape.hidden.slice(0, length) })}/>
      {shape.hidden.map((value, index) => <div className="nested-stepper" key={index}>
        <Stepper label={`Layer ${index + 1} neurons`} value={value} min={1} max={8} disabled={disabled}
          onChange={size => onResize({ ...shape, hidden: shape.hidden.map((old, position) => index === position ? size : old) })}/>
      </div>)}
      <Stepper label="Outputs" value={shape.outputs} min={1} max={4} disabled={disabled}
        aside={<ExplainButton topic="outputs" label="the number of outputs" onExplain={openGuide}/>}
        onChange={outputs => onResize({ ...shape, outputs })}/>
    </div>
    <div className="settings-section settings-detail" id="network-input-values">
      <h3><ExplainButton topic="input-values" label="the input values" onExplain={openGuide}/><Icon name="arrow" size={15}/>Input values</h3>
      <div className="inputs-grid">{network.inputs.map((value, index) => <label className="input-cell" key={index}>
        <span>Input {index + 1}</span>
        <NumberField label={`Input ${index + 1}`} value={value} disabled={disabled}
          onChange={next => onInput(index, next)}/>
      </label>)}</div>
    </div>
    <div className="settings-section settings-detail" id="network-activations">
      <h3><ExplainButton topic="activation" label="the activation functions" onExplain={openGuide}/><Icon name="bolt" size={15}/>Activation functions</h3>
      {network.layers.map((layer, index) => <div className="activation-field" key={index}>
        <label className="field-label" htmlFor={`activation-${index}`}>{layerName(index, network.layers.length)}</label>
        <select id={`activation-${index}`} value={layer.activation} disabled={disabled}
          onChange={event => onActivation(index, event.target.value as Activation)}>
          {Object.entries(activations).map(([key, item]) => <option value={key} key={key}>{item.name}</option>)}
        </select>
        <div className="math equation-caption">{activations[layer.activation].equation}</div>
      </div>)}
    </div>
    <div className="settings-section settings-detail" id="network-starting-weights">
      <h3><ExplainButton topic="starting-weights" label="the starting weights" onExplain={openGuide}/><Icon name="dice" size={15}/>Starting weights</h3>
      <div className="seed-row">
        <span className="seed-label"><ExplainButton topic="seed" label="the starting recipe" onExplain={openGuide}/>Seed</span>
        <NumberField label="Seed" value={network.seed} disabled={disabled} onChange={onSeed}/>
      </div>
      <div className="initialize-row">
        <ExplainButton topic="initialize" label="initializing the weights" onExplain={openGuide}/>
        <button className="button full" disabled={disabled} onClick={onInitialize}><Icon name="dice" size={16}/>Initialize weights</button>
      </div>
      <p className="muted micro">He for ReLU. Xavier for Linear, Sigmoid, and Tanh. Biases start at zero.</p>
    </div>
    {guide && <SettingsGuide topic={guide} context={context} onClose={() => setGuide(null)}/>}
  </aside>;
}
