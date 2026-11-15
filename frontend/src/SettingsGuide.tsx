import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './ui';

export type GuideTopic = 'preset' | 'architecture' | 'inputs' | 'hidden' | 'outputs'
  | 'input-values' | 'activation' | 'starting-weights' | 'seed' | 'initialize';

export interface GuideContext {
  presetLabel: string;
  shape: string;
  inputs: number;
  hidden: number;
  outputs: number;
  inputValues: string[];
  activationList: { layer: string; name: string; equation: string }[];
  seed: string;
}

interface Guide {
  title: string;
  subtitle: string;
  lead: string;
  simple: string;
  why: string[];
  effect: string;
  where: string;
  whatIf: string;
  remember: string;
  current: string;
}

function guideFor(topic: GuideTopic, context: GuideContext): Guide {
  const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;
  if (topic === 'preset') return {
    title: 'Classroom preset',
    subtitle: 'A ready-made example you can load in one click.',
    lead: 'A preset fills in the whole network for you, so you can start with a known example.',
    simple: 'Instead of typing every input, weight and bias, you choose a preset. It sets the inputs, the shape, the weights, the biases and the activation all at once. You can still change anything afterwards.',
    why: [
      'Everyone starts from the same numbers, so comparing two runs is fair.',
      'Each preset shows a different idea: one neuron, a hidden layer, activation rules, or training with examples.',
      'It gives you a known starting point, so you can see what your change did.',
    ],
    effect: 'A preset replaces the numbers used by the forward pass. If the number of inputs or layers changes, the shape and every multiplication change too. The next run uses the new network.',
    where: 'The whole pipeline: inputs → weights → sum → bias → activation → output.',
    whatIf: 'Loading “One neuron by hand” gives the output 3 for inputs 2 and 3. Loading “Two layers” sends the same inputs through a hidden layer first, so the output is different.',
    remember: 'A preset is a starting point, not a rule. Change one thing at a time to see its effect.',
    current: `Loaded: ${context.presetLabel}.`,
  };

  if (topic === 'architecture') return {
    title: 'Architecture',
    subtitle: 'The shape of the network: inputs, hidden layers and outputs.',
    lead: 'Architecture is the map of the network: how many numbers go in, how many helper teams sit in the middle, and how many answers come out.',
    simple: 'Picture a team. The inputs are the information coming in. Hidden layers are helpers who turn that information into new ideas. The outputs are the final answers.',
    why: [
      'The shape decides how many calculations happen and how many weights the network needs.',
      'More inputs give the network more evidence. More hidden layers let it combine simple clues into bigger ideas. More outputs let it give more answers.',
      'A bigger shape can learn richer patterns, but it also needs more data and more training.',
    ],
    effect: `Every connection has a weight. With ${plural(context.inputs, 'input')} and ${plural(context.outputs, 'output')}, each output neuron multiplies every input by its own weight. A hidden layer adds another round of weights between the inputs and the answer.`,
    where: 'The map of the pipeline: how many x values enter, how many teams sit in the middle, and how many a values come out.',
    whatIf: 'Change 2 → 1 into 2 → 2 → 1: a hidden layer of two neurons first makes two new numbers, and the output neuron combines those instead of the raw inputs.',
    remember: 'The shape is the map; the weights are the directions.',
    current: `Shape: ${context.shape} · ${plural(context.inputs, 'input')}, ${plural(context.hidden, 'hidden layer')}, ${plural(context.outputs, 'output')}.`,
  };

  if (topic === 'inputs') return {
    title: 'Inputs',
    subtitle: 'The numbers the network receives.',
    lead: 'Inputs are the evidence the network gets to work with.',
    simple: 'Each input is one piece of evidence, like a symptom or a pixel. Every input gets its own weight, which says how much it matters.',
    why: [
      'More inputs give the network more evidence to use.',
      'Each input adds one weight and one multiplication for every neuron that receives it.',
      'If a piece of evidence is missing or wrong, the network cannot use information it never receives.',
    ],
    effect: `Each input x is multiplied by its weight w, then all the products are added. With ${plural(context.inputs, 'input')}, every receiving neuron does ${context.inputs} multiplications before the sum.`,
    where: 'The x values at the very start of the pipeline.',
    whatIf: 'Going from 2 inputs to 4 adds two more products and two new weights in every neuron that receives them.',
    remember: 'Inputs are the evidence; weights decide how much each piece counts.',
    current: `${plural(context.inputs, 'input')}.`,
  };

  if (topic === 'hidden') return {
    title: 'Hidden layers',
    subtitle: 'Extra teams between the inputs and the final answer.',
    lead: 'A hidden layer turns the previous numbers into new numbers before the answer is made.',
    simple: 'A hidden neuron takes the numbers from the previous layer, multiplies each by a weight, adds a bias, and passes the total through an activation. Its output is a new number that the next layer can use.',
    why: [
      'With no hidden layer, the network can only make a simple straight-line decision.',
      'Hidden layers let it combine simple clues into more useful features.',
      'Each hidden layer adds more calculations and more weights, so the network can learn richer patterns, but it needs more data.',
    ],
    effect: 'Every hidden neuron adds a full mini-calculation: products → sum → bias → activation. The next layer then treats those outputs as its inputs.',
    where: 'The middle teams; their outputs become the inputs to the next layer.',
    whatIf: `With 0 hidden layers, the ${plural(context.outputs, 'output neuron')} ${context.outputs === 1 ? 'sees' : 'see'} the ${plural(context.inputs, 'input')} directly. With 1 hidden layer, it sees hidden features instead. More layers make a longer chain.`,
    remember: 'Hidden layers build new ideas from old numbers.',
    current: `${plural(context.hidden, 'hidden layer')}.`,
  };

  if (topic === 'outputs') return {
    title: 'Outputs',
    subtitle: 'The final answers the network gives.',
    lead: 'Outputs are the numbers the network hands back to you.',
    simple: 'Each output neuron has its own weights and bias. One output means one answer; several outputs mean several answers.',
    why: [
      'The number of outputs should match the question you are asking.',
      'Each output is calculated independently, so two outputs can learn two different targets.',
      'More outputs mean more calculations, but they all share the same inputs.',
    ],
    effect: 'Each output neuron does its own weighted sum, adds its bias and applies its activation. One output gives one final number; two outputs give two.',
    where: 'The final a values at the end of the pipeline.',
    whatIf: 'One output gives one prediction. Two outputs give two predictions; changing one output’s weights does not directly change the other output.',
    remember: 'One output, one answer; more outputs, more answers.',
    current: `${plural(context.outputs, 'output')}.`,
  };

  if (topic === 'input-values') return {
    title: 'Input values',
    subtitle: 'The actual data for this forward pass.',
    lead: 'These are the numbers you feed in. The network uses exactly what you type.',
    simple: 'Inputs are the evidence. The weights decide how much each piece counts, but the values themselves are the data for this run.',
    why: [
      'Different data should produce different predictions.',
      'A wrong input makes every later step work from wrong evidence.',
      'The same network can be tested on many inputs without changing its weights.',
    ],
    effect: 'Input 1 is multiplied by its weight, Input 2 by its weight, and so on. Change an input and its product changes by (change × weight); that can change the sum, z, the activation and the output.',
    where: 'The x values at the start of the calculation.',
    whatIf: 'If Input 1 grows by 1, the first product grows by 1 × its weight. If that weight is 0.5, the product grows by 0.5, so the sum and the output can change too.',
    remember: 'Inputs are the evidence; the calculation is only as good as the evidence.',
    current: context.inputValues.join(' · ') + '.',
  };

  if (topic === 'activation') return {
    title: 'Activation functions',
    subtitle: 'The gate at the end of each neuron.',
    lead: 'An activation decides what shape of signal leaves a neuron.',
    simple: 'After the weighted sum and the bias, the activation changes the total into the neuron’s output. Linear passes everything; ReLU blocks negatives; Sigmoid squashes to 0–1; Tanh squashes to −1 to 1.',
    why: [
      'Without a bend, stacking layers is like one big multiplication: the network can only learn straight lines.',
      'ReLU is simple: keep positive totals, turn negative totals into zero.',
      'Sigmoid is useful for yes/no scores. Tanh gives values from −1 to 1. Linear adds no bend.',
    ],
    effect: 'It turns z into the output a. For ReLU: a = max(0, z). A negative z becomes 0, so the next layer receives 0 and the training signal can also become 0.',
    where: 'The f(z) gate just before the output.',
    whatIf: 'If z = −3: Linear outputs −3, ReLU outputs 0, Sigmoid outputs about 0.05, and Tanh outputs about −0.995. The next layer sees very different numbers.',
    remember: 'The activation decides whether a neuron speaks, and how loudly.',
    current: context.activationList.map(item => `${item.layer}: ${item.name} · ${item.equation}`).join(' · ') + '.',
  };

  if (topic === 'starting-weights') return {
    title: 'Starting weights',
    subtitle: 'The weight and bias values before training begins.',
    lead: 'Weights are the volume knobs for the inputs; the bias is the starting offset. Initialization chooses the first values.',
    simple: 'A weight says how strongly one input matters. A bias is a number added after the sum. Initialization picks the first weights and sets the biases to zero.',
    why: [
      'Training has to start somewhere; the starting point affects the first predictions and the first loss.',
      'A sensible starting scale helps learning; zero biases are a simple default.',
      'The same seed gives the same starting weights, so experiments are repeatable.',
    ],
    effect: 'Every weight changes a product; the bias changes z. The first forward pass uses these exact values, and backpropagation uses them to work out the first updates.',
    where: 'The w and b values in z = Σ(x · w) + b.',
    whatIf: 'Two different seeds can start with different outputs and losses. Training may then follow a different path, even with the same data and learning rate.',
    remember: 'Weights are learned; initialization is where learning starts.',
    current: `Seed ${context.seed}. He for ReLU, Xavier for Linear/Sigmoid/Tanh; biases start at 0.`,
  };

  if (topic === 'seed') return {
    title: 'Seed',
    subtitle: 'The recipe number for the random starting weights.',
    lead: 'Same seed, same starting weights. Different seed, different starting weights.',
    simple: 'The computer’s “random” numbers come from a recipe. The seed chooses the recipe. It is like starting the same board game with the same shuffled cards.',
    why: [
      'Reproducibility: you can rerun an experiment and get the same starting point.',
      'It lets you compare two runs fairly: change one thing, keep the seed the same.',
      'It does not change the rules of the calculation, only the starting numbers.',
    ],
    effect: 'The seed changes the initial weights and biases. The forward pass, loss, and training formulas stay exactly the same.',
    where: 'The starting w and b values only.',
    whatIf: 'Seed 42 gives one set of starting weights; seed 43 gives another. The first loss may look different even before training does anything.',
    remember: 'Same seed, same starting line.',
    current: `Seed ${context.seed}.`,
  };

  return {
    title: 'Initialize weights',
    subtitle: 'Roll a fresh set of starting weights and biases.',
    lead: 'Initialize starts the model. It does not train it.',
    simple: 'It uses the seed and a recipe suited to the activation: He for ReLU, Xavier for Linear/Sigmoid/Tanh. Every bias starts at zero.',
    why: [
      'You need starting numbers before a forward pass or training.',
      'Reinitializing gives you a clean model without earlier edits or training changes.',
      'Using the same seed reproduces the same starting network.',
    ],
    effect: 'It replaces the current weights and biases. The next forward pass uses the new numbers, and any previous training progress is reset.',
    where: 'The w and b values in the calculation.',
    whatIf: 'Initialize with seed 42 twice → the same weights. Change the seed to 7 and initialize → a new starting network. Initializing does not train the model.',
    remember: 'Initialize starts the model; training changes it.',
    current: `Seed ${context.seed}; He/Xavier recipe; biases 0.`,
  };
}

export function SettingsGuide({ topic, context, onClose }: {
  topic: GuideTopic; context: GuideContext; onClose: () => void;
}) {
  const guide = guideFor(topic, context);
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

  return createPortal(<div className="calc-modal-backdrop" onMouseDown={event => {
    if (event.target === event.currentTarget) onClose();
  }}>
    <div className="calc-modal guide-modal" role="dialog" aria-modal="true" aria-labelledby="settings-guide-title"
      onMouseDown={event => event.stopPropagation()}>
      <div className="calc-modal-head">
        <div>
          <div className="eyebrow">Settings guide</div>
          <h2 id="settings-guide-title">{guide.title}</h2>
          <p>{guide.subtitle}</p>
        </div>
        <button ref={closeRef} type="button" className="icon-button" aria-label="Close explanation" onClick={onClose}>
          <Icon name="close" size={18}/>
        </button>
      </div>

      <p className="guide-lead">{guide.lead}</p>

      <section className="guide-section">
        <h3>The simple idea</h3>
        <p>{guide.simple}</p>
      </section>

      <section className="guide-section">
        <h3>Why it matters</h3>
        <ul>{guide.why.map((item, index) => <li key={index}>{item}</li>)}</ul>
      </section>

      <section className="guide-section">
        <h3>What it changes in the calculation</h3>
        <p>{guide.effect}</p>
        <p className="guide-where"><strong>Where it sits:</strong> {guide.where}</p>
      </section>

      <section className="guide-section">
        <h3>What if ...?</h3>
        <p>{guide.whatIf}</p>
      </section>

      <p className="guide-current">Right now: {guide.current}</p>
      <p className="guide-remember"><strong>Remember:</strong> {guide.remember}</p>
    </div>
  </div>, document.body);
}
