import { useState } from 'react';
import type { WorkshopTab } from './lessons';
import { LESSONS } from './lessons';
import { translate } from './translate';
import { Icon } from './ui';

interface Term {
  term: string;
  /** Other words a student might search for. */
  also?: string;
  meaning: string;
  example?: string;
  /** The lab where the idea can be seen. */
  lab?: WorkshopTab;
}

const GROUPS: { title: string; terms: Term[] }[] = [
  {
    title: 'Inside one neuron',
    terms: [
      { term: 'Neuron', also: 'unit node perceptron', lab: 'explore',
        meaning: 'A small calculator. It multiplies each input by a weight, adds the results, adds a bias, and passes the total through an activation rule.',
        example: 'output = activation(2 × 0.5 + 3 × 1 + (−1)) = activation(3)' },
      { term: 'Input', also: 'feature x', lab: 'explore',
        meaning: 'A number that enters the network, or a value that arrives from the previous layer.',
        example: 'The area of a house, a pixel’s brightness, or another neuron’s output.' },
      { term: 'Weight', also: 'w connection strength parameter', lab: 'explore',
        meaning: 'The strength and direction of one connection. A large weight makes its input matter more; a negative weight makes the input push the total down.',
        example: 'Input 3 with weight 0.5 contributes 1.5. With weight −0.5 it contributes −1.5.' },
      { term: 'Weighted sum', also: 'sigma Σ total product sum dot product', lab: 'explore',
        meaning: 'Every input multiplied by its weight, then all of those products added together. Written Σ (sigma).',
        example: '2 × 0.5 + 3 × 1 = 1 + 3 = 4' },
      { term: 'Bias', also: 'b offset threshold', lab: 'explore',
        meaning: 'One extra number the neuron adds after the weighted sum. It shifts the total up or down, which decides how easily the neuron switches on.',
        example: 'Sum 4 with bias −1 gives z = 3. With bias −5 it gives z = −1.' },
      { term: 'Pre-activation (z)', also: 'z total logit net input', lab: 'explore',
        meaning: 'The neuron’s total before the activation: weighted sum + bias.',
        example: 'z = 4 + (−1) = 3' },
      { term: 'Activation function', also: 'relu sigmoid tanh linear nonlinearity', lab: 'explore',
        meaning: 'The rule that turns z into the neuron’s output. Without a non-linear activation, many layers would collapse into one straight-line calculation.',
        example: 'ReLU(−3) = 0, ReLU(3) = 3. Sigmoid(0) = 0.5.' },
      { term: 'ReLU', also: 'rectified linear unit', lab: 'explore',
        meaning: 'The most common activation: negative totals become 0, positive totals pass through unchanged.',
        example: 'max(0, z)' },
      { term: 'Sigmoid', also: 'logistic', lab: 'explore',
        meaning: 'An activation that squashes any number into the range 0 to 1, useful as a “how strongly yes” score.',
        example: 'sigmoid(−0.2) ≈ 0.45' },
      { term: 'Output (a)', also: 'activation a prediction', lab: 'explore',
        meaning: 'The value a neuron passes on. The outputs of the last layer are the network’s prediction.' },
    ],
  },
  {
    title: 'Building a network',
    terms: [
      { term: 'Layer', also: 'input hidden output layer', lab: 'explore',
        meaning: 'A group of neurons that all read the same inputs and work side by side.' },
      { term: 'Hidden layer', also: 'feature', lab: 'playground',
        meaning: 'A layer between the inputs and the outputs. Its neurons learn intermediate features that the next layer combines.' },
      { term: 'Forward pass', also: 'inference prediction feedforward', lab: 'explore',
        meaning: 'Calculating the output from the inputs, one layer after another, using the current weights and biases.' },
      { term: 'Parameter', also: 'weights biases count size', lab: 'advisor',
        meaning: 'Any number the network learns: every weight and every bias. “A model with 7 billion parameters” has 7 billion of these numbers.',
        example: 'A 2 → 3 → 1 network has 2×3 + 3×1 = 9 weights and 3 + 1 = 4 biases: 13 parameters.' },
      { term: 'Initialization', also: 'seed random xavier he starting weights', lab: 'explore',
        meaning: 'Choosing the starting weights, usually small random numbers. The seed makes the same “random” numbers appear every time.' },
      { term: 'Deep learning', also: 'deep neural network',
        meaning: 'Machine learning with networks that have many layers, so that each layer can build on the features found by the one before.' },
    ],
  },
  {
    title: 'Learning',
    terms: [
      { term: 'Target', also: 'label answer ground truth y', lab: 'train',
        meaning: 'The correct answer for one example: what we want the network to output.' },
      { term: 'Loss', also: 'error cost mse mean squared error', lab: 'train',
        meaning: 'One number that measures how wrong the predictions are. Training tries to make it as small as possible.',
        example: 'Mean squared error: prediction 3, target 1 → (3 − 1)² = 4.' },
      { term: 'Gradient', also: 'slope derivative ∂L/∂w', lab: 'examples',
        meaning: 'For one weight: how much the loss would change if that weight grew a little. Its sign says which way to move; its size says how much it matters.',
        example: 'Gradient +2 means “raising this weight raises the loss”, so training lowers it.' },
      { term: 'Backpropagation', also: 'backward pass backprop chain rule', lab: 'examples',
        meaning: 'The method that finds every gradient. It starts at the loss and works backward, layer by layer, multiplying the slopes along the way.' },
      { term: 'Chain rule', also: 'derivative multiply slopes', lab: 'examples',
        meaning: 'If A changes B and B changes C, the effect of A on C is the two slopes multiplied. Backpropagation is this rule applied again and again.',
        example: '∂L/∂w = ∂L/∂a × ∂a/∂z × ∂z/∂w' },
      { term: 'Delta (δ)', also: 'error signal dL/dz', lab: 'examples',
        meaning: 'A neuron’s share of the error: the error arriving at its output × the slope of its activation.',
        example: 'δ = ∂L/∂a × f′(z)' },
      { term: 'Gradient descent', also: 'update optimizer sgd step', lab: 'train',
        meaning: 'The update rule: move every parameter a small step against its gradient.',
        example: 'new weight = old weight − learning rate × gradient' },
      { term: 'Learning rate', also: 'step size lr alpha eta', lab: 'train',
        meaning: 'How big each update step is. Too large and the loss jumps around or grows; too small and learning is very slow.' },
      { term: 'Epoch', also: 'pass iteration', lab: 'house',
        meaning: 'One full pass over all the training examples.' },
      { term: 'Batch', also: 'mini-batch batch size', lab: 'house',
        meaning: 'A small group of examples used for one update. 1,000 examples in batches of 100 give 10 updates per epoch.' },
      { term: 'Overfitting', also: 'memorise generalise', lab: 'playground',
        meaning: 'When a network memorises its training examples instead of learning the rule. Training loss keeps falling while test loss rises.' },
      { term: 'Training, validation, and test sets', also: 'split', lab: 'house',
        meaning: 'Three separate parts of the data: train to learn, validation to tune choices, test to judge once at the end.' },
      { term: 'Dead ReLU', also: 'vanishing gradient stuck', lab: 'examples',
        meaning: 'A ReLU neuron whose total is always negative. Its output and its slope are both 0, so no error reaches it and it stops learning.' },
      { term: 'Regularization', also: 'l1 l2 weight decay', lab: 'playground',
        meaning: 'A small penalty on large weights that pushes the network toward simpler rules and reduces overfitting.' },
    ],
  },
  {
    title: 'Language models',
    terms: [
      { term: 'Large language model (LLM)', also: 'gpt chatbot', lab: 'llm',
        meaning: 'A very large neural network trained to predict the next token of text. Everything it writes is produced one token at a time.' },
      { term: 'Token', also: 'word piece tokenizer', lab: 'tokenizer',
        meaning: 'A piece of text the model works with: a word, part of a word, or punctuation. Each token has a number (its id).' },
      { term: 'Vocabulary', also: 'vocab', lab: 'llm',
        meaning: 'The full list of tokens a model knows. The model’s output is one probability for every entry.' },
      { term: 'Embedding', also: 'vector representation', lab: 'llm',
        meaning: 'A list of numbers that stands for a token. The numbers are learned, so tokens used in similar ways end up with similar vectors.' },
      { term: 'Position', also: 'positional encoding embedding order', lab: 'llm',
        meaning: 'Extra numbers added to each embedding so the model knows where in the sentence a token sits.' },
      { term: 'Attention', also: 'self-attention query key value', lab: 'llm',
        meaning: 'How a token gathers information from earlier tokens. It scores each earlier token, turns the scores into weights that add to 1, and takes a weighted sum of their values.',
        example: 'In “the cat ran to the”, the last “the” reads mostly from “to” and “cat”.' },
      { term: 'Query, key, and value', also: 'q k v', lab: 'llm',
        meaning: 'Three vectors made from each token. The query asks “what am I looking for?”, a key answers “what do I offer?”, and the value is what gets passed on.' },
      { term: 'Transformer', also: 'architecture block', lab: 'llm',
        meaning: 'The network design behind modern LLMs: attention to mix information between tokens, followed by an MLP, repeated in many layers.' },
      { term: 'MLP', also: 'multi-layer perceptron feed-forward', lab: 'llm',
        meaning: 'A small stack of ordinary neuron layers. Inside a transformer it processes each token’s vector after attention.' },
      { term: 'Logit', also: 'score raw', lab: 'llm',
        meaning: 'The raw score the model gives each possible next token, before it is turned into a probability.' },
      { term: 'Softmax', also: 'probability distribution', lab: 'llm',
        meaning: 'The rule that turns a list of scores into probabilities that are all positive and add up to 1.',
        example: 'Scores 2, 1, 0 → probabilities 0.67, 0.24, 0.09.' },
      { term: 'Cross-entropy', also: 'loss negative log likelihood', lab: 'llm',
        meaning: 'The loss for next-token prediction: −log(probability the model gave the correct token). Confident and right is near 0; confident and wrong is large.',
        example: 'Correct token given 90% → 0.105. Given 1% → 4.6.' },
      { term: 'Temperature', also: 'sampling randomness', lab: 'llm',
        meaning: 'A setting that sharpens or flattens the probabilities before a token is picked. Low is careful and repetitive; high is surprising.' },
      { term: 'Context window', also: 'context length', lab: 'llm',
        meaning: 'The number of most recent tokens the model can see at once.' },
      { term: 'Autoregressive', also: 'generation one token at a time', lab: 'llm',
        meaning: 'Writing one token, adding it to the input, and predicting again. This loop is how an LLM produces whole sentences.' },
    ],
  },
];

const labName = (tab: WorkshopTab) => LESSONS.find(lesson => lesson.tab === tab)?.label ?? tab;

export function Glossary({ onOpenLab }: { onOpenLab: (tab: WorkshopTab) => void }) {
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const groups = GROUPS.map(group => ({
    ...group,
    terms: group.terms.filter(item => !needle
      // A student may search in either language.
      || `${item.term} ${item.also ?? ''} ${item.meaning} ${translate(item.term)} ${translate(item.meaning)}`
        .toLowerCase().includes(needle)),
  })).filter(group => group.terms.length > 0);
  const total = groups.reduce((count, group) => count + group.terms.length, 0);
  return <div className="glossary">
    <p>Every word used in the labs, in plain language. A neuron combines its weighted inputs and its bias, then applies an activation rule; everything else builds on that.</p>
    <label className="glossary-search">
      <Icon name="search" size={15}/>
      <input type="search" value={query} placeholder="Search: weight, gradient, attention…" aria-label="Search the glossary"
        onChange={event => setQuery(event.target.value)}/>
      <span role="status">{total} {total === 1 ? 'term' : 'terms'}</span>
    </label>
    {groups.length === 0 && <p className="muted">No term matches “{query}”. Try a shorter word.</p>}
    {groups.map(group => <section key={group.title}>
      <h3>{group.title}</h3>
      <dl>{group.terms.map(item => <div key={item.term}>
        <dt>{item.term}</dt>
        <dd>
          {item.meaning}
          {item.example && <span className="glossary-example math">{item.example}</span>}
          {item.lab && <button type="button" className="glossary-lab" onClick={() => onOpenLab(item.lab!)}>
            See it in {labName(item.lab)}<Icon name="arrow" size={12}/></button>}
        </dd>
      </div>)}</dl>
    </section>)}
  </div>;
}
