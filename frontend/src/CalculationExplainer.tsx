import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { activations, addend, applyActivation, format, layerName, neuronName, substitution } from './model';
import type { Forward } from './model';
import { forwardStages } from './ForwardPlayback';
import { Icon } from './ui';

function subscript(index: number) {
  return String(index + 1);
}

export function CalculationExplainer({ result, layer, neuron, focusStep, onClose, onShowAll }: {
  result: Forward;
  layer: number;
  neuron: number;
  focusStep: number | null;
  onClose: () => void;
  onShowAll?: () => void;
}) {
  const count = result.layers.length;
  const computed = result.layers[layer];
  const trace = computed.neurons[neuron];
  const activation = computed.activation;
  const activationName = activations[activation].name;
  const name = neuronName(layer, neuron, count);
  const closeRef = useRef<HTMLButtonElement>(null);
  const focusRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (focusStep === null) return;
    focusRef.current?.scrollIntoView({ block: 'center' });
  }, [focusStep]);

  const products = trace.products;
  const inputSymbol = (index: number) => `x${subscript(index)}`;
  const weightSymbol = (index: number) => `w${subscript(index)}`;
  const productSymbol = (index: number) => `p${subscript(index)}`;
  const terms = trace.inputs.map((input, index) => `${format(input)} × ${addend(trace.weights[index])}`).join(' + ');

  const variableRows: { symbol: string; meaning: string; value: string }[] = [
    ...trace.inputs.flatMap((input, index) => [
      { symbol: inputSymbol(index), meaning: `input from ${neuronName(layer - 1, index, count)}`, value: format(input) },
      { symbol: weightSymbol(index), meaning: `weight from ${neuronName(layer - 1, index, count)} into ${name}`, value: format(trace.weights[index]) },
      { symbol: productSymbol(index), meaning: `${inputSymbol(index)} × ${weightSymbol(index)} (this input's contribution)`, value: format(products[index]) },
    ]),
    { symbol: 'b', meaning: 'bias: the neuron’s own offset', value: format(trace.bias) },
    { symbol: 's', meaning: 'sum of the products, before the bias', value: format(trace.sum) },
    { symbol: 'z', meaning: 'pre-activation total: s + b', value: format(trace.z) },
    { symbol: 'a', meaning: 'output after the activation', value: format(trace.output) },
  ];

  const productLines = trace.inputs.map((input, index) => {
    return `${productSymbol(index)} = ${inputSymbol(index)} × ${weightSymbol(index)} = ${format(input)} × ${addend(trace.weights[index])} = ${format(products[index])}`;
  });
  const sumLine = `s = ${products.map((_, index) => productSymbol(index)).join(' + ')} = ${trace.products.map(addend).join(' + ')} = ${format(trace.sum)}`;
  const biasLine = `z = s + b = ${format(trace.sum)} + ${addend(trace.bias)} = ${format(trace.z)}`;
  const activationLine = `a = ${activationName}(z) = ${substitution(activation, format(trace.z))} = ${format(trace.output)}`;
  const passLine = `next layer's input = a = ${format(trace.output)}`;
  const nextLayer = layer === count - 1 ? 'the network output' : layerName(layer + 1, count);

  const steps = [
    {
      title: forwardStages[0].title,
      symbolic: trace.inputs.map((_, index) => `${inputSymbol(index)} = ${format(trace.inputs[index])}`).join(', '),
      substituted: `inputs = ${trace.inputs.map(value => format(value)).join(', ')}`,
      plain: `These numbers arrive from ${layerName(layer - 1, count)}. They are the raw inputs to this neuron.`,
    },
    {
      title: forwardStages[1].title,
      symbolic: productLines.join('; '),
      substituted: `sum of products = ${format(trace.sum)} (before the bias)`,
      plain: 'Each input is scaled by its weight. The p numbers are contributions, not the final output. A larger weight makes that input matter more.',
    },
    {
      title: forwardStages[2].title,
      symbolic: `s = ${products.map((_, index) => productSymbol(index)).join(' + ')}`,
      substituted: sumLine,
      plain: 'The contributions are added into one running total. This is the sum before the bias.',
    },
    {
      title: forwardStages[3].title,
      symbolic: 'z = s + b',
      substituted: biasLine,
      plain: 'The bias is added once. z is the pre-activation total; it is not the output yet.',
    },
    {
      title: forwardStages[4].title,
      symbolic: `a = f(z)`,
      substituted: activationLine,
      plain: `The activation rule is ${activationName}. It turns z into the neuron's output a.`,
    },
    {
      title: forwardStages[5].title,
      symbolic: `next input = a`,
      substituted: passLine,
      plain: `a is the signal this neuron sends to ${nextLayer}.`,
    },
  ];

  const firstWeight = trace.weights[0] ?? 0;
  const bumpedZ = trace.z + firstWeight;
  const bumpedOutput = applyActivation(activation, bumpedZ);
  const lowerBiasZ = trace.z - 2;
  const lowerBiasOutput = applyActivation(activation, lowerBiasZ);

  return createPortal(<div className="calc-modal-backdrop" onMouseDown={event => {
    if (event.target === event.currentTarget) onClose();
  }}>
    <div className="calc-modal" role="dialog" aria-modal="true" aria-labelledby="calc-explainer-title"
      onMouseDown={event => event.stopPropagation()}>
      <div className="calc-modal-head">
        <div>
          <div className="eyebrow">Full calculation</div>
          <h2 id="calc-explainer-title">Inside {name}</h2>
          <p>{layerName(layer, count)} · {activationName} activation · every number has a name.</p>
        </div>
        <div className="calc-modal-actions">
          {focusStep !== null && onShowAll && <button type="button" className="button small" onClick={onShowAll}>Show all steps</button>}
          <button ref={closeRef} type="button" className="icon-button" aria-label="Close explanation" onClick={onClose}>
            <Icon name="close" size={18}/>
          </button>
        </div>
      </div>

      <section className="calc-equation-box" aria-label="The whole equation">
        <div className="calc-equation-label">The whole calculation</div>
        <div className="calc-equation-main math">a = f( Σᵢ xᵢ × wᵢ + b )</div>
        <div className="calc-equation-sub math">a = {activationName}( {terms} + {addend(trace.bias)} ) = {format(trace.output)}</div>
        <p>Read it as: multiply every input by its weight, add them, add the bias, then apply {activationName}.</p>
      </section>

      <section className="calc-section" aria-label="Variable names">
        <h3>What each name means</h3>
        <div className="calc-var-wrap">
          <table className="calc-var-table">
            <thead><tr><th>Symbol</th><th>What it is</th><th>Value here</th></tr></thead>
            <tbody>{variableRows.map(row => <tr key={row.symbol}>
              <th scope="row">{row.symbol}</th><td>{row.meaning}</td><td>{row.value}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </section>

      <section className="calc-section" aria-label="Step-by-step explanation">
        <h3>Step by step</h3>
        <div className="calc-steps">
          {steps.map((step, index) => <div key={index}
            ref={index === focusStep ? focusRef : undefined}
            className={`calc-step ${index === focusStep ? 'focused' : ''}`}>
            <div className="calc-step-head">
              <span className="calc-step-number">{index + 1}</span>
              <h4>{step.title}</h4>
              {index === focusStep && <span className="badge accent-badge">opened from the card</span>}
            </div>
            <div className="calc-step-symbolic math">{step.symbolic}</div>
            <div className="calc-step-sub math">{step.substituted}</div>
            <p className="calc-step-plain">{step.plain}</p>
          </div>)}
        </div>
      </section>

      <section className="calc-whatif" aria-label="What if">
        <h3>What if ...?</h3>
        <p>If input 1 were <strong>1 larger</strong>, the total z would be {format(trace.z)} + {format(firstWeight)} = <strong>{format(bumpedZ)}</strong>,
          and the output would be <strong>{format(bumpedOutput)}</strong>.</p>
        <p>If the bias were <strong>2 smaller</strong>, z would be {format(trace.z)} − 2 = <strong>{format(lowerBiasZ)}</strong>,
          and the output would be <strong>{format(lowerBiasOutput)}</strong>.</p>
        <p className="calc-whatif-note">The weights scale individual inputs; the bias shifts the whole total. The activation then decides what leaves the neuron.</p>
      </section>
    </div>
  </div>, document.body);
}
