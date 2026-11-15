import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { activations, applyActivation, format } from './model';
import type { Activation, AutoBackpropResult, Forward, Network } from './model';
import { Icon } from './ui';

export interface TutorContext {
  network: Network | null;
  result: Forward | null;
  targets: number[];
  learningRate: string;
  steps: string;
  autoResult: AutoBackpropResult | null;
}

interface Snapshot {
  activation: Activation;
  prediction: number;
  target: number;
  loss: number | null;
  trace: NonNullable<Forward['layers'][number]>['neurons'][number] | null;
  autoResult: AutoBackpropResult | null;
}

interface TutorAction { label: string; target: number; }
interface TutorReply { text: string; actions?: TutorAction[]; }
interface ChatMessage { id: number; role: 'bot' | 'user'; text: string; actions?: TutorAction[]; }

function snapshot(context: TutorContext): Snapshot | null {
  if (!context.network || !context.result) return null;
  const last = context.network.layers.length - 1;
  const trace = context.result.layers[last]?.neurons[0] ?? null;
  const prediction = context.result.outputs[0];
  const target = context.targets[0];
  if (prediction === undefined) return null;
  return {
    activation: context.network.layers[last]?.activation ?? 'linear',
    prediction,
    target: Number.isFinite(target) ? target : 0,
    loss: Number.isFinite(target) ? (prediction - target) ** 2 : null,
    trace,
    autoResult: context.autoResult,
  };
}

function activationRange(kind: Activation): [number, number] {
  if (kind === 'relu') return [0, Infinity];
  if (kind === 'sigmoid') return [0, 1];
  if (kind === 'tanh') return [-1, 1];
  return [-Infinity, Infinity];
}

function activationSentence(kind: Activation, z: number, output: number) {
  if (kind === 'relu') {
    return z < 0
      ? `ReLU only lets positive numbers through. z is ${format(z)}, which is negative, so ReLU returns 0. The neuron is off.`
      : `ReLU passes ${format(z)} because it is positive, so the output is ${format(output)}.`;
  }
  if (kind === 'linear') return `Linear passes z unchanged, so the output is ${format(output)}.`;
  if (kind === 'sigmoid') return `Sigmoid squashes z into a number between 0 and 1; here it gives ${format(output)}.`;
  return `Tanh squashes z into a number between −1 and 1; here it gives ${format(output)}.`;
}

function welcome(context: TutorContext) {
  const snap = snapshot(context);
  if (!snap) return 'Hi! I’m your neuron tutor. Run a forward pass first, then I can explain the result and help you reach a target.';
  const trace = snap.trace;
  return `Hi! I’m your neuron tutor. I can read this network.

Prediction: ${format(snap.prediction)} · Target: ${format(snap.target)} · Loss: ${snap.loss === null ? '—' : format(snap.loss)}
${trace ? `The output neuron’s z is ${format(trace.z)}; ${activations[snap.activation].name} turns it into ${format(snap.prediction)}.` : ''}

Ask me “Why is the output ${format(snap.prediction)}?” or “How can I reach ${format(snap.target)}?”`;
}

function whyReply(snap: Snapshot) {
  const trace = snap.trace;
  if (!trace) return 'I do not have the output neuron’s trace yet. Run a forward pass first.';
  const products = trace.inputs.map((input, index) =>
    `• ${format(input)} × ${format(trace.weights[index])} = ${format(trace.products[index])}`).join('\n');
  const lossText = snap.loss === null ? '' : `\nWith target ${format(snap.target)}, the loss is (${format(snap.prediction)} − ${format(snap.target)})² = ${format(snap.loss)}.`;
  return `Your output is ${format(snap.prediction)}.

The output neuron multiplies each incoming value by its weight:
${products}

Those products add to ${format(trace.sum)}. Then the bias ${format(trace.bias)} gives z = ${format(trace.z)}.

${activationSentence(snap.activation, trace.z, trace.output)}${lossText}

That is why it comes out like this. The next question is usually: how do I move it toward a target?`;
}

function improveReply(snap: Snapshot, target: number) {
  const trace = snap.trace;
  const kind = snap.activation;
  const [low, high] = activationRange(kind);
  const name = activations[kind].name;
  if (!trace) return { text: 'Run a forward pass first so I can see the numbers.' };
  if (target < low || target > high) {
    return { text: `Your target is ${format(target)}, but the output activation is ${name}, which can only produce values ${kind === 'sigmoid' ? 'between 0 and 1' : kind === 'tanh' ? 'between −1 and 1' : 'from 0 upward'}.

No weight can change that range. To reach ${format(target)}, switch the output activation to Linear (which can produce any number${target < 0 ? ', including negatives' : ''}) or choose a target inside the range. You can change the activation in Network settings.` };
  }
  const gap = target - snap.prediction;
  const off = kind === 'relu' && trace.z < 0;
  const linearLike = kind === 'relu' || kind === 'linear';
  const biasForTarget = linearLike ? target - trace.sum : null;
  const parts = [
    `Your prediction is ${format(snap.prediction)} and your target is ${format(target)}, so the gap is ${format(gap)}. The loss is ${snap.loss === null ? '—' : format(snap.loss)}.`,
  ];
  if (off) {
    parts.push(`Right now ReLU is off: z is ${format(trace.z)}, so the output is 0 and its slope is 0. The neuron cannot start moving until z becomes positive.`);
  } else if (gap > 0) {
    parts.push('The output needs to rise. Backprop will find which weights and bias to increase.');
  } else if (gap < 0) {
    parts.push('The output needs to fall. Backprop will find which weights and bias to decrease.');
  } else {
    parts.push('Your prediction is already exactly on target. The loss is 0.');
  }
  if (biasForTarget !== null) {
    parts.push(`With the current weights, the bias would need to be about ${format(biasForTarget)} to make z = ${format(target)} exactly — a change of ${format(biasForTarget - trace.bias)}. Training can share that change across all the weights, not just the bias.`);
  }
  parts.push(`The easiest experiment is Auto-train with target ${format(target)}. It runs the forward pass, repeats the backward step, keeps the step with the lowest loss, and applies it. Try learning rate 0.1–0.5 and 50 steps.`);
  if (off) parts.push('If the loss stops improving while the output stays 0, the ReLU is still off: switch to Linear/Tanh or let the weights grow enough to cross zero.');
  if (snap.autoResult) {
    parts.push(`Your last Auto-train kept step ${snap.autoResult.best.step} with prediction ${snap.autoResult.best.prediction.map(value => format(value)).join(', ')} and loss ${format(snap.autoResult.best.loss)}. If that is not close enough, try more steps, a smaller learning rate, or a different activation.`);
  }
  parts.push('If you have a real dataset, use Teach the network: one target alone can be fit, but a dataset teaches a pattern.');
  return { text: parts.join('\n\n'), actions: [{ label: `Auto-train toward ${format(target)}`, target }] };
}

function whatIfReply(snap: Snapshot, question: string) {
  const trace = snap.trace;
  if (!trace) return 'Run a forward pass first so I can calculate the what-if.';
  const kind = snap.activation;
  const q = question.toLowerCase();
  if (q.includes('bias') || q.includes('انحياز')) {
    const match = question.match(/(?:bias|انحياز)\D{0,12}?(-?\d+(?:\.\d+)?)/i);
    const newBias = match ? Number(match[1]) : trace.bias + 1;
    const newZ = trace.sum + newBias;
    const newOutput = applyActivation(kind, newZ);
    const stillOff = kind === 'relu' && newZ < 0;
    return `The sum before the bias is ${format(trace.sum)}. The current bias is ${format(trace.bias)}, so z is ${format(trace.z)}.

If you set the bias to ${format(newBias)}, z becomes ${format(newZ)} and the output becomes ${format(newOutput)} (${activations[kind].name}).${stillOff ? ' It is still negative, so ReLU still outputs 0 — the weights would also need to change.' : ''}

To make z exactly 0, the bias would need to be ${format(-trace.sum)}. With the weights fixed, each +1 of bias shifts z by +1.`;
  }
  if (q.includes('weight') || q.includes('وزن')) {
    const input = trace.inputs[0] ?? 0;
    const original = trace.weights[0] ?? 0;
    const delta = 0.1;
    const newZ = trace.z + delta * input;
    return `The first weight is ${format(original)} and its input is ${format(input)}, so it contributes ${format(original * input)} to z.

Changing that weight by +0.1 changes z by +0.1 × ${format(input)} = ${format(delta * input)}. With z = ${format(trace.z)}, the new z would be ${format(newZ)} and the output ${format(applyActivation(kind, newZ))}.

A weight only changes the part of z that comes from its own input. To make a big move, training changes many weights together.`;
  }
  if (/linear|activation|relu|sigmoid|tanh|تنشيط|خطية/.test(q)) {
    return `Right now the output activation is ${activations[kind].name}. That is what turns z = ${format(trace.z)} into ${format(trace.output)}.

• Linear would output ${format(applyActivation('linear', trace.z))} directly. Useful if you need negative outputs, but it removes the bend.
• ReLU would output ${format(applyActivation('relu', trace.z))}. It turns negative totals into 0.
• Sigmoid would output ${format(applyActivation('sigmoid', trace.z))} (between 0 and 1).
• Tanh would output ${format(applyActivation('tanh', trace.z))} (between −1 and 1).

The activation is the gate. If the gate is blocking your target, change the gate or change the target.`;
  }
  if (q.includes('input') || q.includes('مدخل')) {
    const weight = trace.weights[0] ?? 0;
    return `Changing the first input by +1 changes the first product by ${format(weight)} (the weight). z changes by the same amount if the other inputs stay fixed.

With the current weight ${format(weight)} and input ${format(trace.inputs[0] ?? 0)}, the first product is ${format((trace.inputs[0] ?? 0) * weight)}. The output also depends on every other input and the bias.`;
  }
  return 'I can help with a bias, a weight, an input, or an activation. For example: “What if the bias is 0?” or “What if I use Linear?”';
}

function lossReply(snap: Snapshot) {
  const loss = snap.loss === null ? '—' : format(snap.loss);
  return `The loss is the squared gap between the prediction and the target:

loss = (prediction − target)²
     = (${format(snap.prediction)} − ${format(snap.target)})²
     = ${loss}

Zero means a perfect prediction. The backward pass measures this gap and turns it into gradients: directions for each weight and bias. A smaller loss means the network is closer to what you want.`;
}

function trainReply(context: TutorContext) {
  return `There are three ways to train, depending on what you want:

• **Auto-train** runs the forward pass, repeats the backward step, keeps the lowest loss, and applies the best result. Set the target, learning rate, and steps, then press Auto-train.
• **Run backward pass** walks one step slowly: compare, error slope, each layer, gradients, update. Use it to see the math.
• **Teach the network** trains on a whole dataset of examples, not just one target.

Current settings: target ${context.targets[0] ?? '—'}, learning rate ${context.learningRate}, steps ${context.steps}.`;
}

function activationReply(snap: Snapshot) {
  const kind = snap.activation;
  const trace = snap.trace;
  return `The output layer uses ${activations[kind].name}.

${trace ? activationSentence(kind, trace.z, trace.output) : ''}

ReLU is fast and simple, but a negative z becomes 0 and its slope is 0, so the neuron can get stuck off. Linear can output any number but adds no bend. Sigmoid is for 0–1 scores; Tanh is for −1 to 1. If your target is outside the activation’s range, no weight can reach it — change the activation or the target.`;
}

function hiddenReply(context: TutorContext) {
  if (!context.network) return 'Load a network first.';
  const hidden = context.network.layers.length - 1;
  return hidden > 0
    ? `This network has ${hidden} hidden layer${hidden === 1 ? '' : 's'}. Hidden neurons turn the raw inputs into new features before the output layer makes the final guess. More hidden layers can learn richer patterns, but they also add more weights to train.`
    : `This network has no hidden layers: the output neuron sees the inputs directly. That makes it a single weighted sum plus an activation. For a simple target that is fine; for a pattern with bends, add a hidden layer in Network settings.`;
}

function makeReply(question: string, context: TutorContext): TutorReply {
  const snap = snapshot(context);
  const q = question.toLowerCase().trim();
  if (!snap) return { text: 'Run a forward pass first, then I can explain the result and help you reach a target.' };
  const numberMatch = question.match(/-?\d+(?:\.\d+)?/);
  const mentioned = numberMatch ? Number(numberMatch[0]) : null;
  const targetQuestion = /target|reach|close|toward|make|improve|better|result|prediction|هدف|أصل|اصل|نتيجة|تنبؤ|أقترب|اقترب/.test(q);
  if (/^(hi|hello|hey|salam|thanks|thank you|مرحبا|مرحبًا|السلام|أهلا|اهلا|شكرا|شكرًا)/.test(q)) {
    return { text: `Hi! I can see prediction ${format(snap.prediction)}, target ${format(snap.target)}, loss ${snap.loss === null ? '—' : format(snap.loss)}. Ask me why, what-if, or how to get closer.` };
  }
  if (/why|how come|explain|mean|zero|negative|لماذا|ليش|اشرح|فسّر|فسر/.test(q) && !/what if|ماذا لو/.test(q) && !/خسارة|loss/.test(q)) {
    return { text: whyReply(snap) };
  }
  if (/reach|improv|better|close|how.*(get|make)|what if.*(result|target|value)|كيف أصل|كيف اصل|أقترب|اقترب|أحسّن|احسن|تحسين/.test(q) || (targetQuestion && mentioned !== null)) {
    return improveReply(snap, mentioned ?? snap.target);
  }
  if (/what if|change|bias|weight|activation|relu|linear|sigmoid|tanh|input|ماذا لو|غيّر|غير|انحياز|وزن|تنشيط|خطية|مدخل/.test(q)) {
    return { text: whatIfReply(snap, question) };
  }
  if (/loss|error|wrong|خسارة|خطأ|خطا/.test(q)) {
    return { text: lossReply(snap) };
  }
  if (/train|backward|gradient|learn|auto|درّب|درب|تدريب|خلفي|تدرّج|تدرج|تعلّم|تعلم|تلقائي/.test(q)) {
    return { text: trainReply(context) };
  }
  if (/activation|relu|linear|sigmoid|tanh/.test(q)) {
    return { text: activationReply(snap) };
  }
  if (/hidden|layer|architecture|network|مخفي|طبقة|طبقات|بنية|شبكة/.test(q)) {
    return { text: hiddenReply(context) };
  }
  if (mentioned !== null) {
    return improveReply(snap, mentioned);
  }
  return {
    text: `I can explain this result, calculate a what-if, or suggest how to get closer.

Right now: prediction ${format(snap.prediction)}, target ${format(snap.target)}, loss ${snap.loss === null ? '—' : format(snap.loss)}. Try “Why is the output ${format(snap.prediction)}?”, “What if I change the bias?”, or “How can I reach ${format(snap.target)}?”`,
  };
}

function autoSummary(data: AutoBackpropResult) {
  const improved = data.best.loss < data.before.loss;
  return `Auto-train finished. I kept the best step and applied it.

• Before: prediction ${data.before.prediction.map(value => format(value)).join(', ')} · loss ${format(data.before.loss)}
• Best step ${data.best.step}: prediction ${data.best.prediction.map(value => format(value)).join(', ')} · loss ${format(data.best.loss)}
• Final step: prediction ${data.final.prediction.map(value => format(value)).join(', ')} · loss ${format(data.final.loss)}

${improved ? `The best step reduced the loss from ${format(data.before.loss)} to ${format(data.best.loss)}.` : 'No step beat the starting loss. Try a smaller learning rate, more steps, or a different activation.'} Ask me why the best result is what it is, or how to get even closer.`;
}

export function NeuronTutor({ open, context, onClose, onAutoTrain }: {
  open: boolean; context: TutorContext; onClose: () => void; onAutoTrain: (target: number) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(1);
  const greeted = useRef(false);
  const lastAuto = useRef(context.autoResult);

  useEffect(() => {
    if (!open || greeted.current) return;
    greeted.current = true;
    setMessages([{ id: nextId.current++, role: 'bot', text: welcome(context) }]);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open, context]);

  useEffect(() => {
    if (!open) return;
    const auto = context.autoResult;
    if (!auto || auto === lastAuto.current) return;
    lastAuto.current = auto;
    setMessages(current => [...current, { id: nextId.current++, role: 'bot', text: autoSummary(auto) }]);
  }, [context.autoResult, open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  const snap = snapshot(context);
  const quick = [
    `Why is the output ${snap ? format(snap.prediction) : '—'}?`,
    `How can I reach ${snap ? format(snap.target) : '—'}?`,
    'What if I change the bias?',
    `Why is the loss ${snap?.loss === null || !snap ? '—' : format(snap.loss)}?`,
    'How do I train it?',
  ];

  function ask(text: string) {
    const question = text.trim();
    if (!question) return;
    const reply = makeReply(question, context);
    setMessages(current => [
      ...current,
      { id: nextId.current++, role: 'user', text: question },
      { id: nextId.current++, role: 'bot', text: reply.text, actions: reply.actions },
    ]);
    setDraft('');
  }

  function runAction(action: TutorAction) {
    onAutoTrain(action.target);
    setMessages(current => [
      ...current,
      { id: nextId.current++, role: 'user', text: `Auto-train toward ${format(action.target)}.` },
      { id: nextId.current++, role: 'bot', text: 'Starting Auto-train now. I will run the forward pass, repeat the backward step, keep the best loss, and tell you what happened.' },
    ]);
  }

  return createPortal(<aside className={`tutor-panel ${open ? 'open' : ''}`} aria-hidden={!open} aria-label="Neuron tutor">
    <div className="tutor-head">
      <div className="tutor-title">
        <span className="tutor-avatar"><Icon name="sparkles" size={17}/></span>
        <div><h3>Neuron tutor</h3><p>I read the numbers on this screen</p></div>
      </div>
      <button type="button" className="icon-button" aria-label="Close tutor" onClick={onClose}><Icon name="close" size={17}/></button>
    </div>
    <div className="tutor-context">
      {snap ? <>
        <span>Prediction <strong>{format(snap.prediction)}</strong></span>
        <span>Target <strong>{format(snap.target)}</strong></span>
        <span>Loss <strong>{snap.loss === null ? '—' : format(snap.loss)}</strong></span>
      </> : <span>Run a forward pass and ask me anything.</span>}
    </div>
    <div className="tutor-messages" ref={listRef}>
      {messages.map(message => <div key={message.id} className={`tutor-message ${message.role}`}>
        {message.role === 'bot' && <span className="tutor-mini"><Icon name="sparkles" size={12}/></span>}
        <div className="tutor-bubble">
          <p>{message.text}</p>
          {message.actions && <div className="tutor-actions">
            {message.actions.map(action => <button type="button" key={action.label}
              onClick={() => runAction(action)}>{action.label}<Icon name="arrow" size={13}/></button>)}
          </div>}
        </div>
      </div>)}
    </div>
    <div className="tutor-quick" aria-label="Quick questions">
      {quick.map(prompt => <button type="button" key={prompt} onClick={() => ask(prompt)}>{prompt}</button>)}
    </div>
    <form className="tutor-form" onSubmit={event => { event.preventDefault(); ask(draft); }}>
      <input ref={inputRef} value={draft} onChange={event => setDraft(event.target.value)}
        placeholder="Why is the result like this? How can I reach 1?" aria-label="Ask the neuron tutor"/>
      <button type="submit" className="button small" disabled={!draft.trim()}><Icon name="arrow" size={15}/>Send</button>
    </form>
    <p className="tutor-foot">Local tutor · it only changes the network when you press Auto-train.</p>
  </aside>, document.body);
}
