import { readStored, writeStored } from './libraryStorage';
import type { IconName } from './ui';

export type WorkshopTab = 'explore' | 'train' | 'examples' | 'playground' | 'house' | 'exam' | 'advisor' | 'python' | 'tokenizer' | 'llm' | 'finetune';

export interface Lesson {
  tab: WorkshopTab;
  icon: IconName;
  /** The name on the tab. */
  label: string;
  /** The question this lesson answers. */
  question: string;
  /** One sentence: what the student can do after this lesson. */
  goal: string;
  learn: string[];
  tryIt: string[];
  /** The lab fills the page and brings its own heading, so the home hero is hidden. */
  fullBleed: boolean;
}

/** The labs, in the order a newcomer should take them: one neuron first, a language model last. */
export const LESSONS: Lesson[] = [
  {
    tab: 'explore', icon: 'network', label: 'Explore the network', fullBleed: false,
    question: 'What does one neuron actually calculate?',
    goal: 'Follow a number through a neuron: multiply by the weights, add them up, add the bias, apply the activation.',
    learn: [
      'A neuron is a small calculator: output = activation(Σ input × weight + bias).',
      'A weight says how strongly one input matters; its sign says whether it pushes the total up or down.',
      'The bias shifts the total; the activation decides what leaves the neuron.',
      'A forward pass is the same calculation repeated layer by layer, left to right.',
    ],
    tryIt: [
      'Press Run forward pass and watch the six stages: Move, Multiply, Sum, Bias, Activate, Pass.',
      'Click the output neuron to open its math, then change a weight and predict the new output before you run it.',
      'Set a target and press Run backward pass to see how the error turns into a correction for every weight.',
    ],
  },
  {
    tab: 'train', icon: 'flask', label: 'Teach the network', fullBleed: false,
    question: 'How does a network learn from examples?',
    goal: 'Train on a small table of examples and watch the loss fall as the weights are corrected step by step.',
    learn: [
      'Training repeats four moves: forward pass, measure the loss, backpropagate, update the weights.',
      'The loss (mean squared error) is one number that says how wrong all the predictions are.',
      'The learning rate is the size of each correction: too large overshoots, too small crawls.',
      'One example can be memorised; a set of examples teaches a rule.',
    ],
    tryIt: [
      'Press Load AND gate, then One training step. Compare the predictions before and after.',
      'Follow one weight: read old value − learning rate × gradient = new value.',
      'Train for 120 steps, then try a learning rate of 10 and see what a too-large step does to the loss chart.',
    ],
  },
  {
    tab: 'examples', icon: 'target', label: 'Worked examples', fullBleed: true,
    question: 'Where do the gradients come from?',
    goal: 'Work a full forward and backward pass by hand on five tiny networks, one number at a time.',
    learn: [
      'Backpropagation is the chain rule: multiply the slopes along the path from the loss back to a weight.',
      'δ (delta) is a neuron’s share of the error: the error arriving × the activation’s slope.',
      'A weight’s gradient is δ × the input that weight carried.',
      'A ReLU that is switched off has slope 0, so no error passes and nothing behind it learns.',
    ],
    tryIt: [
      'Start with “One weight, one bias” and press Next through every card.',
      'Compare “ReLU that passes the error” with “ReLU that blocks the error”.',
      'Open “Two layers, hidden error” and follow the error into the hidden layer.',
    ],
  },
  {
    tab: 'playground', icon: 'grid', label: 'Playground', fullBleed: true,
    question: 'What can many neurons do together?',
    goal: 'Train a network on 2D patterns and see how hidden layers bend a straight boundary into a curved one.',
    learn: [
      'One neuron can only draw a straight line; hidden layers combine lines into curves.',
      'Each hidden neuron learns its own small feature; the output mixes them.',
      'More neurons can fit harder patterns, but they can also memorise noise (overfitting).',
      'Training loss and test loss tell you whether the network learned the rule or the examples.',
    ],
    tryIt: [
      'Press Play on the Circle data. Then remove every hidden layer and try again: why does it fail?',
      'Pick XOR and find the smallest network that solves it.',
      'Turn the noise up, then watch the gap between training loss and test loss.',
    ],
  },
  {
    tab: 'house', icon: 'home', label: 'House case', fullBleed: true,
    question: 'What does a real project look like?',
    goal: 'Follow a house-price model through all ten steps, from the question to the final test.',
    learn: [
      'Data is split three ways: train to learn, validation to tune, test to judge once at the end.',
      'Features are scaled so that no input dominates only because its numbers are larger.',
      'A batch is a handful of examples per update; an epoch is one pass over all the training data.',
      'The test error, not the training error, is the honest measure of a model.',
    ],
    tryIt: [
      'Read the ten steps in order and answer each student check.',
      'Run the live lab and compare the error before and after training.',
      'Change the batch size or the learning rate and see how the batch losses change.',
    ],
  },
  {
    tab: 'exam', icon: 'book', label: 'Exam case', fullBleed: true,
    question: 'How can study habits predict an exam score?',
    goal: 'Follow an exam-score model through ten steps: 2 → 3 → 1, 1,000 students, 10 batches of 100, seed 42, and 9 weights plus 4 biases.',
    learn: [
      'Each student row has two inputs and one target; the target is compared with the prediction, not fed in.',
      'The input count follows features, not rows: 2 features means 2 input nodes even with 1,000 students.',
      'A batch of 100 students produces one average loss, one set of gradients, and one parameter update.',
      'Ten batches complete one epoch; validation and test students never update the weights.',
    ],
    tryIt: [
      'Read the ten steps and answer each student check.',
      'Run the live exam lab and compare the error before and after training.',
      'Open both posters and trace the same 2 → 3 → 1 network in English and Arabic.',
    ],
  },
  {
    tab: 'advisor', icon: 'chip', label: 'Advisor', fullBleed: true,
    question: 'How big is a network, and what does it cost to train?',
    goal: 'Count the parameters of a network and estimate the memory and hardware it needs.',
    learn: [
      'Parameters = every weight plus every bias. A 2 → 3 → 1 network has 9 + 4 = 13.',
      'Updates = batches per epoch × epochs.',
      'Small networks train comfortably on a CPU; a GPU pays off only at scale.',
      'A language model is the same arithmetic with billions of parameters.',
    ],
    tryIt: [
      'Load the 2 → 3 → 1 house setup and check the count by hand.',
      'Add a hidden layer in Explore, come back, and see how the count grows.',
      'Change the precision from float32 to float16 and watch the storage halve.',
    ],
  },
  {
    tab: 'python', icon: 'code', label: 'Python guide', fullBleed: true,
    question: 'How do I write this in real code?',
    goal: 'Turn the network on screen into a complete, runnable PyTorch training script.',
    learn: [
      'nn.Linear(inputs, outputs) is exactly one layer of weights and biases.',
      'loss.backward() is the backward pass; optimizer.step() is the update.',
      'The training loop is the same four moves you did by hand.',
      'Validation picks the best checkpoint; the test set is used once.',
    ],
    tryIt: [
      'Read the 15 steps in order; each one shows its purpose, input, code, and output.',
      'Download the .py file and run it on your own computer.',
      'Change the architecture in Explore and watch the generated layers change.',
    ],
  },
  {
    tab: 'tokenizer', icon: 'tokens', label: 'Tokenizer', fullBleed: true,
    question: 'How does a language model see my text?',
    goal: 'Type any text and watch a real tokenizer cut it into tokens, each with its position and ID number.',
    learn: [
      'A model reads tokens, not letters or words: a token can be a whole word, part of a word, or punctuation.',
      'Every token has a fixed ID number; the model only ever sees these numbers.',
      'Token count and word count differ: Arabic, rare words, and emoji often need more tokens per word.',
      'Spaces count too: the space before a word usually belongs to that word’s token.',
    ],
    tryIt: [
      'Load “The ship reached the port.” and compare its tokens with its words.',
      'Load the Arabic example and find a word that is split into more than one token.',
      'Add a sentence of your own, then an emoji, and watch the count change as you type.',
    ],
  },
  {
    tab: 'llm', icon: 'sparkles', label: 'LLM playground', fullBleed: true,
    question: 'How does a language model choose the next word?',
    goal: 'Watch a tiny transformer turn words into numbers, look back with attention, and predict the next token.',
    learn: [
      'Text is cut into tokens, and every token becomes a vector of numbers (an embedding).',
      'Attention is a weighted sum: the current token decides how much to read from each earlier token.',
      'A small network of the neurons you already know (the MLP) transforms the result.',
      'Softmax turns scores into probabilities; training lowers the cross-entropy loss of the correct next token.',
    ],
    tryIt: [
      'Click each stage button (Tokens, Embeddings, Attention, MLP, Softmax, Backprop) and read what it does to this prompt.',
      'Click an earlier token and see which words it attends to.',
      'Press Backprop one step, then Trace top link to follow one error value back through the chain rule.',
    ],
  },
  {
    tab: 'finetune', icon: 'sliders', label: 'Fine-tuning lab', fullBleed: true,
    question: 'How do you teach a ready-made model your own subject?',
    goal: 'See how fine-tuning adds a small set of new weights beside frozen ones, and how quantization, QLoRA and Unsloth make it fit on an ordinary GPU.',
    learn: [
      'Fine-tuning continues the training of a foundation model on your own examples.',
      'LoRA freezes the original weights and trains two small matrices, A and B, beside them.',
      'Quantization stores each weight in fewer bits, so a large model fits in a small memory.',
      'QLoRA is both together: a frozen 4-bit base with trainable adapters. Unsloth is the library that runs it.',
    ],
    tryIt: [
      'In the LoRA part, train with rank 1, then rank 2, and watch the frozen weights stay unchanged.',
      'In the quantization part, go from 8 bits to 2, then compare even spacing with NF4 at 4 bits.',
      'In the QLoRA part, find the largest model that fits on a 16 GB GPU.',
    ],
  },
];

export const FULL_BLEED_TABS = new Set<WorkshopTab>(LESSONS.filter(lesson => lesson.fullBleed).map(lesson => lesson.tab));

const GUIDE_STORAGE = 'neuron-lab-lesson-guide';

export const loadGuideOpen = () => readStored(GUIDE_STORAGE) !== 'closed';
export const saveGuideOpen = (open: boolean) => writeStored(GUIDE_STORAGE, open ? 'open' : 'closed');
