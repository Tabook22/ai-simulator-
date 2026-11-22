import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, FormEvent, ReactNode } from 'react';
import { BackpropPlayback, backwardStages } from './BackpropPlayback';
import { AutoBackpropPanel } from './AutoBackpropPanel';
import { NeuronTutor } from './NeuronTutor';
import { Confetti } from './Confetti';
import { Diagram } from './Diagram';
import type { Selection } from './Diagram';
import { ForwardPlayback, ForwardStep, forwardStages } from './ForwardPlayback';
import { Hero } from './Hero';
import { LlmLab } from './LlmLab';
import { FineTuneLab } from './FineTuneLab';
import { TokenizerLab } from './TokenizerLab';
import { BackpropExamples } from './BackpropExamples';
import { HouseCaseStudy } from './HouseCaseStudy';
import { ExamCaseStudy } from './ExamCaseStudy';
import { Advisor } from './Advisor';
import { PythonGuide } from './PythonWorkspaces';
import { Playground } from './Playground';
import { ResourceLibrary } from './ResourceLibrary';
import { VideoLibrary } from './VideoLibrary';
import { Inspector } from './Inspector';
import { QuestStrip, emptyQuest, loadQuest, questComplete, saveQuest } from './Quest';
import type { Quest } from './Quest';
import { HOUSE_NETWORK_SHAPE } from './houseConfig';
import { LanguageSwitcher, useI18n } from './i18n';
import { Glossary } from './Glossary';
import { LessonGuide, LessonTabs } from './LessonGuide';
import { FULL_BLEED_TABS, loadGuideOpen, saveGuideOpen } from './lessons';
import type { WorkshopTab } from './lessons';
import { Settings, shapeOf } from './Settings';
import type { PresetKey, Shape } from './Settings';
import { Training } from './Training';
import { SiteSearch } from './SiteSearch';
import { NAVIGATE } from './searchIndex';
import type { Place } from './searchIndex';
import { api, blankExample, finite, format, layerName, networkPayload, neuronName, trainingPayload } from './model';
import type { Activation, AutoBackpropResult, BackpropResult, Connection, Example, Forward, LoadedLesson, Network, SavedLesson,
  TrainingResult, TrainingSettings } from './model';
import { Icon, NumberField, PanelTitle } from './ui';

function Dialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} aria-labelledby="dialog-title" onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className="dialog-heading"><h2 id="dialog-title">{title}</h2>
      <button className="icon-button" aria-label="Close dialog" onClick={onClose}><Icon name="close"/></button></div>
    <div className="dialog-body">{children}</div>
  </dialog>;
}

function Challenge({ preset, disabled, onCompare, onTryBias }: {
  preset: PresetKey | ''; disabled: boolean;
  onCompare: (activation: 'linear' | 'relu') => void;
  onTryBias: (value: number) => void;
}) {
  if (preset === 'one-neuron') return <aside className="challenge">
    <span className="challenge-icon"><Icon name="bulb" size={19}/></span>
    <div><h3>Student challenge</h3><p>In the original example, what changes if the bias goes from −1 to −5?</p>
      <details><summary>Reveal the worked answer</summary>
        <div className="challenge-answer">
          <p className="challenge-answer-lead"><strong>Short answer:</strong> the output goes from <strong>3</strong> to <strong>0</strong>, and the neuron switches off.</p>

          <h4>What is the neuron doing?</h4>
          <p>A neuron is a tiny calculator. Each input is multiplied by a <strong>weight</strong> (how strongly that input matters),
            the products are added, a <strong>bias</strong> is added (a starting offset), and an <strong>activation</strong> decides what
            leaves the neuron. Here the inputs are 2 and 3, the weights are 0.5 and 1, the bias is −1, and the activation is ReLU.</p>
          <p><span className="math">2 × 0.5 = 1</span> and <span className="math">3 × 1 = 3</span>, so the total is <strong>4</strong>.
            With the original bias: <span className="math">4 + (−1) = 3</span>. ReLU lets positive totals through, so the output is <strong>3</strong>.</p>
          <p>With bias −5: <span className="math">4 + (−5) = −1</span>. ReLU blocks negative totals and returns <strong>0</strong>.
            The neuron is off: it sends no signal to the next layer.</p>

          <h4>What the numbers mean</h4>
          <ul>
            <li><strong>Input:</strong> a number the neuron receives. Here 2 and 3.</li>
            <li><strong>Weight:</strong> a volume knob for one input. A bigger weight makes that input matter more.</li>
            <li><strong>Bias:</strong> a starting offset added after the weighted sum. Negative makes the neuron harder to turn on.</li>
            <li><strong>ReLU:</strong> a gate. Positive in, same number out. Negative in, zero out.</li>
            <li><strong>Output:</strong> the signal this neuron sends forward.</li>
            <li><strong>Target:</strong> the answer we want. Here the target is 1.</li>
            <li><strong>Loss:</strong> a wrongness score, <span className="math">(output − target)²</span>. Lower is better.</li>
          </ul>

          <h4>What if we try different biases?</h4>
          <p>The weighted total before the bias is always 4. The bias shifts it, and ReLU cuts off anything below zero:</p>
          <div className="challenge-table-wrap">
            <table className="challenge-table">
              <thead><tr><th>Bias</th><th>Total after bias</th><th>Output</th><th>Loss if target is 1</th></tr></thead>
              <tbody>
                <tr><td>−10</td><td>−6</td><td>0</td><td>1</td></tr>
                <tr><td>−5</td><td>−1</td><td>0</td><td>1</td></tr>
                <tr><td>−3</td><td>1</td><td>1</td><td>0</td></tr>
                <tr><td>−1 (original)</td><td>3</td><td>3</td><td>4</td></tr>
                <tr><td>0</td><td>4</td><td>4</td><td>9</td></tr>
              </tbody>
            </table>
          </div>
          <p>The turning point is between bias −4 and −3: at −4 the total is 0 and the output is 0; at −3 the total is 1 and the output is 1.
            Bias −1 leaves the neuron fully on at 3. Bias −5 is past the switch, so the neuron is fully off.</p>

          <h4>So is bias −5 “better”?</h4>
          <p>For this one example it happens to give a lower loss: output 0 is wrong by 1, while output 3 is wrong by 2.
            But that is not a general rule. If the target were 3, bias −1 would give loss 0 and bias −5 would give loss 9.
            The target decides what a good output is; the bias only shifts the neuron.</p>

          <h4>What if we change something else?</h4>
          <ul>
            <li><strong>Change a weight:</strong> weights scale each input separately. Setting the first weight to 0 makes the total 3,
              so with bias −1 the output becomes 2. The bias then shifts that new total.</li>
            <li><strong>Change the activation to linear:</strong> bias −5 would output −1 instead of 0. The next layer would receive a
              negative signal. ReLU's gate is what turns −1 into 0.</li>
            <li><strong>Make every neuron in a layer negative:</strong> the whole layer outputs zeros. ReLU's slope is zero there, so the
              training signal is also zero; those neurons may stop learning. This is called a dead ReLU, and it is why biases and
              starting weights matter.</li>
          </ul>

          <p className="challenge-takeaway"><strong>The big idea:</strong> the bias is a threshold knob. It does not change the inputs;
            it changes how easily the neuron turns on. A small bias change can switch a neuron completely off and change every layer after it.</p>
          <p className="challenge-llm">In a language model, thousands of neurons like this work together, and their weights and biases are
            learned from text instead of typed by hand. The same questions still apply: what are the inputs, how strongly are they weighted,
            and does the activation let the result through?</p>

          <div className="button-row challenge-try">
            <button className="button small" disabled={disabled} onClick={() => onTryBias(-5)}>Try bias −5</button>
            <button className="button small" disabled={disabled} onClick={() => onTryBias(-3)}>Try bias −3</button>
            <button className="button small" disabled={disabled} onClick={() => onTryBias(-1)}>Back to original</button>
          </div>
          <p className="challenge-try-note">These buttons keep the current weights and only change the last bias. They run a forward
            pass; they do not train the network.</p>
        </div>
      </details>
    </div>
  </aside>;

  if (preset === 'two-layers') return <aside className="challenge">
    <span className="challenge-icon"><Icon name="bulb" size={19}/></span>
    <div><h3>Follow the second layer</h3>
      <p>Hidden 1 gives 3 and Hidden 2 gives 0. What does Output 1 compute from them?</p>
      <details><summary>Reveal the worked answer</summary>
        <div className="challenge-answer">
          <p className="challenge-answer-lead"><strong>Short answer:</strong> Output 1 is <strong>1.75</strong>.</p>

          <h4>What are the hidden numbers?</h4>
          <p>Hidden 1 = 3 means that neuron passed a positive total through its ReLU. Hidden 2 = 0 means its total was negative,
            so ReLU clamped it to zero. Zero is still a signal: it says “this feature did not fire.”</p>
          <p>The output layer combines the hidden signals with its own weights and bias:</p>
          <p className="math">z = 3 × 0.5 + 0 × (−1) + 0.25 = 1.5 + 0 + 0.25 = 1.75</p>
          <p>This output layer is linear, so it passes 1.75 through unchanged.</p>

          <h4>What it means</h4>
          <ul>
            <li><strong>Hidden 1</strong> is a feature that fired strongly.</li>
            <li><strong>Hidden 2</strong> is silent; its weight does not matter for this example because its output is zero.</li>
            <li>The output is a <strong>weighted vote</strong> of the hidden features, shifted by the bias.</li>
            <li>A <strong>negative weight</strong> subtracts: if Hidden 2 fired, it would push the output down.</li>
          </ul>

          <h4>What if we change one thing?</h4>
          <div className="challenge-table-wrap">
            <table className="challenge-table">
              <thead><tr><th>Change</th><th>New output</th><th>What it shows</th></tr></thead>
              <tbody>
                <tr><td>Hidden 1: 3 → 2</td><td>1.25</td><td>The output follows the positive weight.</td></tr>
                <tr><td>Hidden 2: 0 → 1</td><td>0.75</td><td>The negative weight subtracts the new signal.</td></tr>
                <tr><td>Output weight 0.5 → 1</td><td>3.25</td><td>A stronger connection has a bigger effect.</td></tr>
                <tr><td>Bias 0.25 → −2</td><td>−0.5</td><td>The bias shifts the whole result.</td></tr>
              </tbody>
            </table>
          </div>
          <p>If the target were 1, the original output 1.75 has loss 0.5625, the “Hidden 1 = 2” output 1.25 has loss 0.0625,
            and the “weight = 1” output 3.25 has loss 5.0625. The same small change can help or hurt depending on the target.</p>

          <h4>Why it matters for the whole network</h4>
          <p>Hidden layers create useful intermediate features; the output layer decides how much each feature contributes.
            If a hidden neuron stays at zero, that feature is silent and its weight is wasted. If every hidden neuron is silent,
            the output is only the bias: the network has no information to work with.</p>
          <p className="challenge-takeaway"><strong>The big idea:</strong> a layer is not a magic box. It is a set of weighted votes.
            Change a hidden value, a weight, or the bias and you can predict the new output with the same multiplication and addition.</p>
          <p className="challenge-llm">A language model stacks many layers of these weighted votes. Each layer turns the previous layer’s
            numbers into slightly more useful features, until the final layer turns them into a next-token score.</p>
        </div>
      </details>
    </div>
  </aside>;

  if (preset === 'and') return <aside className="challenge">
    <span className="challenge-icon"><Icon name="bulb" size={19}/></span>
    <div><h3>Before you train</h3>
      <p>What does the network predict for 1 AND 1 before any training step?</p>
      <details><summary>Reveal the worked answer</summary>
        <div className="challenge-answer">
          <p className="challenge-answer-lead"><strong>Short answer:</strong> about <strong>0.45</strong>. That is below half, so the
            network is not saying “yes” — it is guessing near the middle.</p>

          <h4>What the sigmoid is doing</h4>
          <p>The neuron adds its weighted inputs and bias, then sigmoid squashes the total into a score between 0 and 1.
            The score is not a label; it is “how strongly the neuron leans yes.” A common rule is to call anything above 0.5 a “yes.”</p>
          <p>For 1 AND 1: <span className="math">z = 1 × 0.2 + 1 × (−0.3) + (−0.1) = −0.2</span>, and
            <span className="math">sigmoid(−0.2) ≈ 0.45</span>.</p>

          <h4>The whole truth table before training</h4>
          <div className="challenge-table-wrap">
            <table className="challenge-table">
              <thead><tr><th>Inputs</th><th>z</th><th>Score</th><th>Target</th></tr></thead>
              <tbody>
                <tr><td>0, 0</td><td>−0.1</td><td>0.475</td><td>0</td></tr>
                <tr><td>0, 1</td><td>−0.4</td><td>0.401</td><td>0</td></tr>
                <tr><td>1, 0</td><td>0.1</td><td>0.525</td><td>0</td></tr>
                <tr><td>1, 1</td><td>−0.2</td><td>0.450</td><td>1</td></tr>
              </tbody>
            </table>
          </div>
          <p>All four scores sit near 0.5. The network has not learned AND yet. In fact, 1,0 is slightly above 0.5, so it would
            wrongly say “yes,” while 1,1 is below 0.5 and would wrongly say “no.”</p>

          <h4>Why training changes it</h4>
          <p>Training compares each score with its target, measures the wrongness (the loss), and adjusts the weights and bias a little.
            After enough steps the scores move toward 0, 0, 0, 1: low for 00, 01, and 10; high for 11.
            In this lab the loss falls from about 0.241 to 0.051 in 120 steps.</p>

          <h4>What if we change the bias or a weight?</h4>
          <ul>
            <li><strong>More negative bias:</strong> every score moves down; the neuron leans “no” more easily.</li>
            <li><strong>More positive bias:</strong> every score moves up; the neuron leans “yes” more easily.</li>
            <li>For AND, the bias must be negative enough that one input alone stays below 0.5, but not so negative that two inputs
              together cannot cross it.</li>
            <li><strong>A negative weight</strong> on one input would make that input push the score down — closer to “not both” than AND.</li>
            <li><strong>Both inputs 0:</strong> the score is sigmoid(bias); the bias sets the baseline.</li>
          </ul>
          <p className="challenge-takeaway"><strong>The big idea:</strong> a network does not start out knowing AND. It starts with
            numbers near the middle and uses the examples to turn its weights and bias into a rule.</p>
          <p className="challenge-llm">A language model’s next-token scores are built the same way: weighted sums and a squashing step,
            trained on examples until the right continuation gets a higher score.</p>
        </div>
      </details>
    </div>
  </aside>;

  if (preset === 'activation') return <aside className="challenge">
    <span className="challenge-icon"><Icon name="bulb" size={19}/></span>
    <div><h3>Compare two activation functions</h3>
      <p>Keep the inputs, weights, and bias the same. See how Linear and ReLU handle a negative z.</p>
      <div className="button-row">
        <button className="button small" disabled={disabled} onClick={() => onCompare('linear')}>Run Linear</button>
        <button className="button small" disabled={disabled} onClick={() => onCompare('relu')}>Run ReLU</button>
      </div>
      <details><summary>Reveal what to notice</summary>
        <div className="challenge-answer">
          <p className="challenge-answer-lead"><strong>Short answer:</strong> with a negative total, Linear passes the negative number
            through; ReLU turns it into <strong>0</strong>.</p>
          <h4>What an activation is</h4>
          <p>The activation is the gate at the end of the neuron. It decides what shape of signal leaves. ReLU says “keep positives,
            block negatives.” Linear says “pass everything unchanged.”</p>
          <div className="challenge-table-wrap">
            <table className="challenge-table">
              <thead><tr><th>Total z</th><th>Linear output</th><th>ReLU output</th></tr></thead>
              <tbody>
                <tr><td>−3</td><td>−3</td><td>0</td></tr>
                <tr><td>0</td><td>0</td><td>0</td></tr>
                <tr><td>2</td><td>2</td><td>2</td></tr>
              </tbody>
            </table>
          </div>
          <h4>Why it matters</h4>
          <p>Without a nonlinear activation, stacking layers is pointless: several linear layers collapse into one linear layer.
            The nonlinearity is what lets a network bend and learn shapes, not just straight lines.</p>
          <p>But ReLU has a cost: when its total is negative, its output and its slope are both zero. That neuron may stop learning.
            A linear activation never switches off, but it also never adds a bend.</p>
          <p className="challenge-takeaway"><strong>The big idea:</strong> activation is a design choice with trade-offs. ReLU is simple
            and fast, but it can turn a neuron off; linear is smooth, but too simple on its own.</p>
        </div>
      </details>
    </div>
  </aside>;
  return null;
}

export default function App() {
  const [network, setNetwork] = useState<Network | null>(null);
  const [result, setResult] = useState<Forward | null>(null);
  const [preset, setPreset] = useState<PresetKey | ''>('one-neuron');
  const [lessonName, setLessonName] = useState('');
  const [tab, setTab] = useState<WorkshopTab>('explore');
  const fullBleed = FULL_BLEED_TABS.has(tab);
  const { t } = useI18n();
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [watchOpen, setWatchOpen] = useState(false);
  const [presentation, setPresentation] = useState(false);
  const [modal, setModal] = useState<'lessons' | 'glossary' | null>(null);
  const [lessons, setLessons] = useState<SavedLesson[]>([]);
  const [saveName, setSaveName] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Selection>({ layer: 0, neuron: 0 });
  const [showCalculation, setShowCalculation] = useState(false);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const [playback, setPlayback] = useState<{ position: number; paused: boolean } | null>(null);
  const [targets, setTargets] = useState<string[]>(['1']);
  const [learningRate, setLearningRate] = useState('0.5');
  const [backprop, setBackprop] = useState<BackpropResult | null>(null);
  const [backwardStep, setBackwardStep] = useState<number | null>(null);
  const [backwardApplied, setBackwardApplied] = useState(false);
  const [steps, setSteps] = useState('50');
  const [autoResult, setAutoResult] = useState<AutoBackpropResult | null>(null);
  const [autoApplied, setAutoApplied] = useState(false);
  const [tutorOpen, setTutorOpen] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [stale, setStale] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [settings, setSettings] = useState<TrainingSettings | null>(null);
  const [trainConnection, setTrainConnection] = useState<Connection>({ layer: 0, neuron: 0, source: 0 });
  const [baseline, setBaseline] = useState<Network | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [report, setReport] = useState<TrainingResult | null>(null);
  const [quest, setQuest] = useState<Quest>(loadQuest);
  const [burst, setBurst] = useState(0);
  const [guideOpen, setGuideOpen] = useState(loadGuideOpen);
  const diagramPanel = useRef<HTMLElement>(null);
  const outputCount = network?.layers.at(-1)?.weights.length ?? 0;

  useEffect(() => {
    setTargets(current => Array.from({ length: outputCount }, (_, index) => current[index] ?? '1'));
  }, [outputCount]);

  useEffect(() => {
    if (tab === 'explore') return;
    clearBackward();
    setTutorOpen(false);
  }, [tab]);
  const seenQuest = useRef<Quest>(quest);

  useEffect(() => {
    saveQuest(quest);
    const done = questComplete(quest);
    if (done && !questComplete(seenQuest.current)) setBurst(value => value + 1);
    seenQuest.current = quest;
  }, [quest]);

  function markQuest(key: keyof Quest) {
    setQuest(current => current[key] ? current : { ...current, [key]: true });
  }

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && showCalculation) setShowCalculation(false);
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [showCalculation]);

  async function perform(action: () => Promise<void>) {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  /** Leave the backward-pass lesson and the auto-train report. */
  function clearBackward() {
    setBackprop(null);
    setBackwardStep(null);
    setBackwardApplied(false);
    setAutoResult(null);
    setAutoApplied(false);
  }

  function clearSession() {
    setBaseline(null);
    setHistory([]);
    setReport(null);
  }

  function applyLesson(lesson: LoadedLesson, key: PresetKey | '') {
    const layer = lesson.network.layers.length - 1;
    setNetwork(lesson.network);
    setResult(lesson.forward);
    setPreset(key);
    setLessonName(lesson.name);
    setSelected({ layer, neuron: 0 });
    setShowCalculation(false);
    setTrainConnection({ layer, neuron: 0, source: 0 });
    setConnection(null);
    setActive(null);
    setPlayback(null);
    clearBackward();
    setStale(lesson.forward === null);
    if (lesson.warning) setError(lesson.warning);
    setSettings(lesson.training ?? null);
    clearSession();
  }

  function loadPreset(key: PresetKey) {
    return perform(async () => {
      const lesson = await api<LoadedLesson>(`/presets/${key}`);
      applyLesson(lesson, key);
    });
  }

  useEffect(() => { void loadPreset('one-neuron'); }, []);

  function editNetwork(next: Network, affectsForward = true) {
    setNetwork(next);
    if (affectsForward) {
      setStale(true);
      setActive(null);
      setPlayback(null);
      clearBackward();
      clearSession();
    }
    setNotice('');
    setError('');
  }

  /** Bring the diagram to the top of the window so the animation is not below the fold. */
  function showDiagram() {
    const panel = diagramPanel.current;
    if (!panel) return;
    const top = panel.getBoundingClientRect().top;
    if (top >= 60 && top <= 170) return;
    panel.scrollIntoView({ block: 'start',
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }

  function startPlayback() {
    setConnection(null);
    setActive(null);
    setPlayback({ position: 0, paused: false });
    showDiagram();
  }

  /** The numbers typed under “Teach this answer”, checked before they are sent. */
  function teachingValues(overrides?: { targets?: number[]; steps?: number; rate?: number }) {
    const targetValues = overrides?.targets ?? targets.map((value, index) =>
      finite(value, outputCount === 1 ? 'Target' : `Target ${index + 1}`));
    const rate = overrides?.rate ?? finite(learningRate, 'Learning rate');
    const count = overrides?.steps ?? finite(steps, 'Steps');
    if (rate <= 0 || rate > 10) throw new Error('Use a learning rate above 0 and at most 10.');
    if (!Number.isInteger(count) || count < 1 || count > 500) {
      throw new Error('Choose a whole number of steps between 1 and 500.');
    }
    return { targetValues, rate, count };
  }

  function startBackward() {
    if (!network || !result || stale) return;
    void perform(async () => {
      const { targetValues, rate } = teachingValues();
      const data = await api<BackpropResult>('/backprop', {
        network: networkPayload(network),
        inputs: network.inputs.map(value => Number(value)),
        targets: targetValues,
        learning_rate: rate,
      });
      clearBackward();
      setBackprop(data);
      setBackwardStep(0);
      setPlayback(null);
      setActive(null);
      setShowCalculation(false);
      setConnection(null);
      setNotice('Backward pass ready. Follow the coral error from output to input.');
      markQuest('trained');
    });
  }

  function applyBackward() {
    if (!backprop) return;
    const corrected = backprop.updated.network;
    void perform(async () => {
      const forward = await api<Forward>('/forward', networkPayload(corrected));
      setNetwork(corrected);
      setResult(forward);
      setStale(false);
      setPlayback(null);
      setBackwardApplied(true);
      setNotice('One backward step applied. The weights and biases moved toward the target.');
      markQuest('trained');
    });
  }

  function startAuto(overrides?: { targets?: number[]; steps?: number; rate?: number }) {
    if (!network || !result || stale) return;
    void perform(async () => {
      const { targetValues, rate, count } = teachingValues(overrides);
      setTargets(targetValues.map(value => String(value)));
      const data = await api<AutoBackpropResult>('/backprop/auto', {
        network: networkPayload(network),
        inputs: network.inputs.map(value => Number(value)),
        targets: targetValues,
        learning_rate: rate,
        steps: count,
      });
      const bestForward = await api<Forward>('/forward', networkPayload(data.best.network));
      setNetwork(data.best.network);
      setResult(bestForward);
      setStale(false);
      clearBackward();
      setAutoResult(data);
      setAutoApplied(true);
      setPlayback(null);
      setActive(null);
      setShowCalculation(false);
      setConnection(null);
      setNotice(`Auto-train kept the best step (loss ${format(data.best.loss)}) and applied it.`);
      markQuest('trained');
    });
  }

  function run(next: Network, compareActivation = false) {
    return perform(async () => {
      const forward = await api<Forward>('/forward', networkPayload(next));
      if (compareActivation) {
        setNetwork(next);
        setPlayback(null);
        clearBackward();
        setActive(null);
        clearSession();
      } else {
        startPlayback();
      }
      setResult(forward);
      setStale(false);
      markQuest('ran');
    });
  }

  function resize(shape: Shape, outputActivation?: Activation) {
    if (!network) return;
    void perform(async () => {
      const raw = await api<Network>('/resize', { network: networkPayload(network), ...shape });
      const last = raw.layers.length - 1;
      const next = outputActivation ? {
        ...raw,
        layers: raw.layers.map((layer, index) => index === last ? { ...layer, activation: outputActivation } : layer),
      } : raw;
      const oldShape = shapeOf(network);
      if (settings && (shape.inputs !== oldShape.inputs || shape.outputs !== oldShape.outputs)) {
        const fit = (values: Example['inputs'], size: number) =>
          Array.from({ length: size }, (_, index) => values[index] ?? '');
        setSettings({ ...settings, examples: settings.examples.map(example => ({
          ...example, inputs: fit(example.inputs, shape.inputs), targets: fit(example.targets, shape.outputs),
        })) });
      }
      editNetwork(next);
      setResult(null);
      setSelected({ layer: last, neuron: 0 });
      setShowCalculation(false);
      setTrainConnection({ layer: last, neuron: 0, source: 0 });
      setConnection(null);
    });
  }

  function loadHouseNetwork() {
    resize(HOUSE_NETWORK_SHAPE, 'linear');
  }

  function openTab(next: WorkshopTab) {
    // A new lab starts at its heading, not wherever the last one was scrolled to.
    if (next !== tab) window.scrollTo({ top: 0 });
    setTab(next);
    setPlayback(null);
    setError('');
    setNotice('');
  }

  // A site-search result: open its lab, the library, the lectures or the glossary.
  const navigate = useRef<(place: Place) => void>(() => undefined);
  navigate.current = place => {
    setError('');
    setNotice('');
    if (place.lab === 'glossary') { setLibraryOpen(false); setWatchOpen(false); setModal('glossary'); return; }
    setModal(null);
    if (place.lab === 'library') { setWatchOpen(false); setLibraryOpen(true); window.scrollTo({ top: 0 }); return; }
    if (place.lab === 'watch') { setLibraryOpen(false); setWatchOpen(true); window.scrollTo({ top: 0 }); return; }
    setLibraryOpen(false);
    setWatchOpen(false);
    openTab(place.lab);
  };
  useEffect(() => {
    const onNavigate = (event: Event) => navigate.current((event as CustomEvent<Place>).detail);
    window.addEventListener(NAVIGATE, onNavigate);
    return () => window.removeEventListener(NAVIGATE, onNavigate);
  }, []);

  function editActivation(index: number, activation: Activation, runNow = false) {
    if (!network) return;
    const next = { ...network, layers: network.layers.map((layer, position) => position === index ? { ...layer, activation } : layer) };
    if (runNow) void run(next, true);
    else editNetwork(next);
  }

  function editWeight(layer: number, neuron: number, source: number, value: string) {
    if (!network) return;
    markQuest('edited');
    editNetwork({ ...network, layers: network.layers.map((entry, index) => index === layer ? {
      ...entry, weights: entry.weights.map((row, position) => position === neuron
        ? row.map((old, cell) => cell === source ? value : old) : row),
    } : entry) });
  }

  function editBias(layer: number, neuron: number, value: string) {
    if (!network) return;
    markQuest('edited');
    editNetwork({ ...network, layers: network.layers.map((entry, index) => index === layer ? {
      ...entry, biases: entry.biases.map((old, position) => position === neuron ? value : old),
    } : entry) });
  }

  function tryBias(value: number) {
    if (!network) return;
    const next = {
      ...network,
      layers: network.layers.map((layer, index) => index === network.layers.length - 1
        ? { ...layer, biases: layer.biases.map(() => value) }
        : layer),
    };
    void run(next, true);
  }

  function visitLayer(index: number) {
    setPlayback(null);
    setShowCalculation(false);
    setActive(index);
    setSelected({ layer: index, neuron: 0 });
    setConnection(null);
  }

  function selectEdge(edge: Connection) {
    setSelected({ layer: edge.layer, neuron: edge.neuron });
    setShowCalculation(false);
    setConnection(edge);
    setTrainConnection(edge);
    setActive(current => current === null ? null : edge.layer);
  }

  async function listLessons() {
    setLessons(await api<SavedLesson[]>('/lessons'));
  }

  function openLibrary() {
    setModal('lessons');
    setSaveName(lessonName);
    setDeleteId(null);
    void perform(listLessons);
  }

  function saveLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!network) return;
    void perform(async () => {
      await api('/lessons', { name: saveName, network: networkPayload(network),
        training: settings ? trainingPayload(settings) : null });
      setNotice(`Saved “${saveName.trim()}”.`);
      await listLessons();
    });
  }

  const shape = network && shapeOf(network);
  const training = settings ?? {
    learning_rate: 1, steps: 120, examples: shape ? [blankExample(shape.inputs, shape.outputs)] : [],
  };

  function train(single: boolean) {
    if (!network) return;
    void perform(async () => {
      const update = await api<TrainingResult>('/train', { network: networkPayload(network),
        settings: trainingPayload(training, single ? 1 : undefined), connection: trainConnection });
      setBaseline(baseline ?? network);
      setNetwork(update.network);
      setResult(update.forward);
      setStale(false);
      setActive(null);
      setReport(update);
      setHistory(previous => previous.length ? [...previous, ...update.history.slice(1)] : update.history);
      setNotice(single ? 'One full-batch update complete.' : `${update.history.length - 1} training steps complete.`);
      markQuest('trained');
      if (update.after.loss < update.before.loss) setBurst(value => value + 1);
    });
  }

  function resetTraining() {
    if (!baseline || !network) return;
    void perform(async () => {
      const restored = { ...baseline, seed: network.seed };
      const forward = await api<Forward>('/forward', networkPayload(restored));
      setNetwork(restored);
      setResult(forward);
      setStale(false);
      clearSession();
      setNotice('Restored the weights and biases from the start of training.');
    });
  }

  const layerCount = result?.layers.length ?? 0;
  const backStages = backprop ? backwardStages(backprop) : [];
  const backStage = backprop && backwardStep !== null
    ? backStages[Math.min(backwardStep, backStages.length - 1)] : null;
  const playbackLength = layerCount * forwardStages.length;
  const frame = playback && playback.position < playbackLength ? {
    layer: Math.floor(playback.position / forwardStages.length),
    step: playback.position % forwardStages.length,
  } : null;
  const showingOutput = !frame || (frame.layer === layerCount - 1 && frame.step === ForwardStep.Pass);
  const outputLabels = showingOutput ? result?.outputs : undefined;
  const openedNode = showCalculation ? selected : null;
  const shownSelection = frame && !openedNode && frame.layer !== selected.layer ? { layer: frame.layer, neuron: 0 } : selected;
  const selectedWeight = network && connection ? network.layers[connection.layer].weights[connection.neuron][connection.source] : null;
  return <div className={presentation ? 'app presentation' : 'app'}>
    <div className="aurora" aria-hidden="true"><span/><span/><span/></div>
    <Confetti burst={burst}/>
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand">
          <span className="brand-mark"><img src={`${import.meta.env.BASE_URL}neuron.svg`} width="34" height="34" alt=""/></span>
          <span className="brand-word">{t('Neuron Lab')}</span>
          <span className="brand-tag">{t('learn by watching')}</span>
        </div>
        <div className="top-actions">
          <LanguageSwitcher/>
          <SiteSearch/>
          <button className="button top-button" aria-pressed={libraryOpen}
            onClick={() => { setLibraryOpen(value => !value); setWatchOpen(false); setModal(null); setError(''); setNotice(''); }}>
            <Icon name="library" size={17}/>{t('Library')}</button>
          <button className="button top-button" aria-pressed={watchOpen} aria-label={t('Watch video lectures')}
            onClick={() => { setWatchOpen(value => !value); setLibraryOpen(false); setModal(null); setError(''); setNotice(''); }}>
            <Icon name="play" size={17}/>{t('Watch')}</button>
          <button className="button top-button" onClick={() => setModal('glossary')}><Icon name="book" size={17}/>{t('Glossary')}</button>
          <button className="button top-button" disabled={busy || !network} onClick={openLibrary}><Icon name="layers" size={17}/>{t('Lessons')}</button>
          <button className="button top-button presentation-toggle" aria-pressed={presentation}
            onClick={() => setPresentation(!presentation)}><Icon name="monitor" size={17}/>{presentation ? t('Exit presentation') : t('Presentation view')}</button>
        </div>
      </div>
    </header>
    <main className="shell">
      {libraryOpen ? <ResourceLibrary
        onClose={() => setLibraryOpen(false)}
        onOpenLab={target => {
          setLibraryOpen(false);
          openTab(target);
        }}/> : watchOpen ? <VideoLibrary
        onClose={() => setWatchOpen(false)}
        onOpenLibrary={() => { setWatchOpen(false); setLibraryOpen(true); }}
        onOpenLab={target => {
          setWatchOpen(false);
          openTab(target);
        }}/> : <>
      <LessonTabs tab={tab} disabled={busy} label={t('Classroom modes')} translate={t} onOpen={openTab}/>
      {!fullBleed && guideOpen && <Hero preset={preset} disabled={busy}
        onPreset={key => { openTab('explore'); void loadPreset(key); }}/>}
      <LessonGuide tab={tab} open={guideOpen} disabled={busy} onOpen={openTab}
        onToggle={() => { saveGuideOpen(!guideOpen); setGuideOpen(!guideOpen); }}/>
      {!fullBleed && <QuestStrip quest={quest} onReset={() => setQuest(emptyQuest)}/>}
      {error && !modal && <div className="message error" role="alert">{error}</div>}
      {notice && !modal && <div className="message success" role="status">{notice}</div>}
      {tab === 'tokenizer' ? <TokenizerLab/> : tab === 'llm' ? <LlmLab/> : tab === 'finetune' ? <FineTuneLab/> : tab === 'exam' ? <ExamCaseStudy/> : tab === 'house' ? <HouseCaseStudy/> : tab === 'examples' ? <BackpropExamples/> : tab === 'playground' ? <Playground/> : network ? (tab === 'explore' ? <div className="explore-layout">
        <Settings network={network} preset={preset} disabled={busy || Boolean(backprop)} onPreset={loadPreset} onResize={resize}
          onInput={(index, value) => editNetwork({ ...network, inputs: network.inputs.map((old, position) => index === position ? value : old) })}
          onSeed={value => editNetwork({ ...network, seed: value }, false)} onActivation={editActivation}
          onInitialize={() => void perform(async () => {
            const next = await api<Network>('/initialize', networkPayload(network));
            editNetwork(next);
            setNotice('Starting weights set and biases set to zero. Run the forward pass to see the new outputs.');
          })}/>
        <div className="diagram-stack">
          <section className="panel diagram-panel" ref={diagramPanel}>
            <PanelTitle icon="network" aside={<span role="status" className={`badge ${stale || frame || backprop || autoResult ? 'accent-badge' : 'ready-badge'}`}>
              {frame ? (playback?.paused ? 'Animation paused' : 'Forward pass in progress')
                : autoResult ? 'Auto-train complete · best kept'
                  : backprop ? (backwardApplied ? 'Correction applied' : 'Backward pass')
                    : stale ? 'Needs a new run' : <><Icon name="check" size={13}/>Up to date</>}
            </span>}>Network diagram</PanelTitle>
            <div className="diagram-body" style={frame || backStage ? {
              '--step-duration': `${(frame ? forwardStages[frame.step].duration : 2200) / speed}ms`,
              '--flow-duration': `${2600 / speed}ms`,
              '--play-state': frame && playback?.paused ? 'paused' : 'running',
            } as CSSProperties : undefined}>
              <div className="run-row">
                <button className={stale || !result ? 'button primary run-button needs-run' : 'button primary run-button'}
                  disabled={busy || Boolean(frame) || Boolean(backprop) || Boolean(autoResult)}
                  onClick={() => { clearBackward(); void run(network); }}>
                  <span className="run-icon"><Icon name="play" size={15}/></span>Run forward pass
                </button>
                <div className="walkthrough-buttons">
                  <button className="button icon-only" title="Previous layer" aria-label="Previous layer"
                    disabled={busy || Boolean(frame) || Boolean(backprop) || Boolean(autoResult) || stale || active === null || active === 0} onClick={() => visitLayer(active! - 1)}><Icon name="previous" size={17}/></button>
                  <button className="button next-button" disabled={busy || Boolean(frame) || Boolean(backprop) || Boolean(autoResult) || stale || active === network.layers.length - 1}
                    onClick={() => visitLayer((active ?? -1) + 1)}>Next layer<Icon name="next" size={17}/></button>
                  <button className="button icon-only" title="Reset walkthrough" aria-label="Reset walkthrough"
                    disabled={active === null} onClick={() => setActive(null)}><Icon name="reset" size={16}/></button>
                </div>
              </div>
              <p className="diagram-intro">{autoResult
                ? 'The best backward step is applied. The loss chart shows the journey from the first guess to the best correction.'
                : backprop
                  ? 'Follow the coral error packets backward. Each step shows the math behind one correction.'
                  : frame ? 'Click a neuron to show or hide its math while the dots move.'
                    : stale ? 'Your edit is saved. Run the forward pass again to see the new numbers.'
                      : !result ? 'Press Run forward pass to watch every number travel through the network.'
                        : 'Click a neuron to show or hide its math. Select a line to see its weight.'}</p>
              <Diagram network={network} result={result} stale={stale} selected={shownSelection} openedNode={openedNode} connection={connection}
                active={frame?.layer ?? active} frame={frame}
                backward={backStage ? { kind: backStage.kind, layer: backStage.layer } : null}
                gradients={backprop?.backward.layers}
                onNode={node => {
                  const opening = node.layer >= 0 && !(openedNode?.layer === node.layer && openedNode.neuron === node.neuron);
                  setShowCalculation(opening);
                  if (opening) markQuest('opened');
                  setSelected(node);
                  setConnection(null);
                  if (!frame) setActive(current => current !== null && node.layer >= 0 ? node.layer : null);
                }} onEdge={edge => { if (!frame) selectEdge(edge); }}/>
              {backprop ? <div className="legend" aria-label="Backward pass">
                <span><i className="backward-dot"/>Error flowing backward</span>
                <span><i className="gradient-dot"/>Weight gradient</span></div>
                : frame ? <div className="legend" aria-label="Moving dots"><span><i className="data-dot"/>Incoming value</span>
                <span><i className="data-dot product-dot"/>Value after multiplication</span>
                <span><i className="flow-arrow-legend"/>Signal flow</span></div>
                : <div className="legend" aria-label="Weight styles"><span><i className="positive"/>Positive</span>
                  <span><i className="negative"/>Negative</span><span><i className="zero"/>Zero</span></div>}
              {connection && <div className="selected-weight">
                <span>{neuronName(connection.layer - 1, connection.source, network.layers.length)} → {neuronName(connection.layer, connection.neuron, network.layers.length)}</span>
                <strong className="math">Weight {selectedWeight === '' ? '—' : selectedWeight}</strong>
              </div>}
              {!frame && <div className="walkthrough-caption" aria-live="polite">
                {active === null ? 'Walkthrough · Start with Next layer'
                  : `Layer ${active + 1} of ${network.layers.length} · ${layerName(active, network.layers.length)} · Values from ${layerName(active - 1, network.layers.length)}`}
              </div>}
              {backprop && backStage && <BackpropPlayback data={backprop} stages={backStages} step={backwardStep ?? 0}
                applied={backwardApplied} disabled={busy}
                onPrev={() => setBackwardStep(current => Math.max(0, (current ?? 0) - 1))}
                onNext={() => setBackwardStep(current => Math.min(backStages.length - 1, (current ?? 0) + 1))}
                onApply={applyBackward} onClose={clearBackward}/>}
              {autoResult && <AutoBackpropPanel data={autoResult} targets={targets.map(Number)} applied={autoApplied}
                onClose={clearBackward} onRunAgain={() => startAuto()}/>}
              {!backprop && !autoResult && playback && result && <ForwardPlayback frame={frame} result={result}
                inspectedNeuron={openedNode && frame?.layer === openedNode.layer ? openedNode.neuron : null}
                paused={playback.paused} disabled={busy} speed={speed} onSpeed={setSpeed}
                onPause={() => setPlayback({ ...playback, paused: !playback.paused })}
                onAdvance={() => setPlayback(current => current && current.position < playbackLength
                  ? { ...current, position: current.position + 1 } : current)}
                onFinish={() => setPlayback({ position: playbackLength, paused: false })}
                onReplay={startPlayback}/>}
              {!backprop && !autoResult && <div className="backprop-setup">
                <div className="backprop-setup-lead"><Icon name="target" size={14}/><span>Teach this answer</span>
                  <small>Step 2 · run the error backward</small></div>
                <div className="backprop-setup-fields">
                  {Array.from({ length: outputCount }, (_, index) => <label className="backprop-field" key={index}>
                    <span>{outputCount === 1 ? 'Target' : `Target ${index + 1}`}</span>
                    <NumberField label={`Target ${index + 1}`} value={targets[index] ?? '1'} disabled={busy || Boolean(frame)}
                      onChange={value => setTargets(current => current.map((old, position) => position === index ? value : old))}/>
                  </label>)}
                  <label className="backprop-field"><span>Learning rate</span>
                    <NumberField label="Learning rate" value={learningRate} disabled={busy || Boolean(frame)}
                      onChange={setLearningRate}/>
                  </label>
                  <label className="backprop-field"><span>Steps</span>
                    <NumberField label="Steps" value={steps} disabled={busy || Boolean(frame)} onChange={setSteps}/>
                  </label>
                </div>
                <div className="backprop-actions">
                  <button type="button" className="button small backprop-start" disabled={busy || Boolean(frame) || !result || stale}
                    onClick={startBackward}><Icon name="previous" size={14}/>Run backward pass</button>
                  <button type="button" className="button small primary auto-train" disabled={busy || Boolean(frame) || !result || stale}
                    onClick={() => startAuto()}><Icon name="bolt" size={14}/>Auto-train</button>
                </div>
              </div>}
              {!backprop && !autoResult && <p className="backprop-note">The <strong>target</strong> is the answer you want for these inputs. <strong>Run backward pass</strong> walks through one correction slowly: loss, error slope, every gradient, the update. <strong>Auto-train</strong> repeats that correction for the number of steps and keeps the lowest loss.</p>}
            </div>
          </section>
          <section className="panel output-panel" aria-label="Network output">
            <div className="output-heading"><span className="panel-icon output-icon"><Icon name="arrow" size={17}/></span>
              <div><h2>Network output</h2><p>{!showingOutput ? 'Waiting for the final layer' : stale
                ? (result ? 'Values from the last run' : 'Run the forward pass to see the output') : 'Values from the final layer'}</p></div>
            </div>
            <div className="output-values" aria-live="polite">
              {network.layers.at(-1)!.weights.map((_, index) => {
                const value = outputLabels?.[index];
                const label = value === undefined ? '—' : format(value);
                return <div className={value === undefined ? 'output-value idle' : 'output-value'} key={index}>
                  <span>OUTPUT {index + 1}</span><strong key={label}>{label}</strong>
                </div>;
              })}
            </div>
            <button className="button small tutor-open" onClick={() => setTutorOpen(true)}>
              <Icon name="sparkles" size={14}/>Ask the tutor
            </button>
          </section>
          <Challenge key={preset} preset={preset} disabled={busy || Boolean(frame) || Boolean(backprop)}
            onCompare={activation => editActivation(network.layers.length - 1, activation, true)}
            onTryBias={tryBias}/>
        </div>
        <Inspector network={network} result={frame && shownSelection.layer > frame.layer ? null : result}
          stale={stale} selected={shownSelection} disabled={busy || Boolean(frame) || Boolean(backprop)}
          playbackStep={frame?.layer === shownSelection.layer ? frame.step : undefined}
          onWeight={editWeight} onBias={editBias}/>
      </div> : tab === 'advisor' ? <Advisor network={network} training={training}
        onOpenExplore={() => openTab('explore')}
        onUseHouseSetup={loadHouseNetwork}/> : tab === 'python' ? <PythonGuide network={network} training={training}
        onOpenExplore={() => openTab('explore')}
        onUseHouseSetup={loadHouseNetwork}/> : <Training network={network} settings={training} selection={trainConnection} report={report}
        history={history} busy={busy} onEdit={setSettings} onExamples={examples => {
          setSettings({ ...training, examples });
          clearSession();
          setNotice('');
          setError('');
        }} onConnection={setTrainConnection} onAnd={() => loadPreset('and')} onTrain={train} onReset={resetTraining}/>)
        : <div className="panel loading">{error ? <button className="button" onClick={() => loadPreset('one-neuron')}>Try again</button>
          : <>
            <div className="loader" aria-hidden="true"><span/><span/><span/></div>
            <p role="status">Loading the classroom example…</p>
          </>}</div>}
      </>}
      <footer><span>{t('Neuron Lab')}</span><p>{t('Initialize sets the starting values. A forward pass uses them. Training updates them from examples.')}</p></footer>
    </main>
    {modal === 'glossary' && <Dialog title="Classroom glossary" onClose={() => setModal(null)}>
      <Glossary onOpenLab={target => { setModal(null); setLibraryOpen(false); setWatchOpen(false); openTab(target); }}/>
    </Dialog>}
    {modal === 'lessons' && <Dialog title="Saved lessons" onClose={() => setModal(null)}>
      <p>Save the network, values, and any training examples on this computer.</p>
      {error && <div className="message error" role="alert">{error}</div>}
      {notice && <div className="message success" role="status">{notice}</div>}
      <form className="lesson-form" onSubmit={saveLesson}>
        <label className="field-label" htmlFor="lesson-name">Lesson name</label>
        <div><input id="lesson-name" required maxLength={80} value={saveName} onChange={event => setSaveName(event.target.value)}/>
          <button className="button primary" disabled={busy || !saveName.trim()}>Save lesson</button></div>
      </form>
      <div className="saved-list">
        {lessons.length === 0 ? <p className="muted">No lessons saved yet.</p> : lessons.map(lesson => <div key={lesson.id}>
          <strong data-keep="">{lesson.name}</strong>
          {deleteId === lesson.id ? <div className="button-row">
            <button className="button small danger" disabled={busy} onClick={() => void perform(async () => {
              await api(`/lessons/${lesson.id}`, undefined, 'DELETE');
              setDeleteId(null);
              await listLessons();
            })}>Confirm delete</button>
            <button className="button small" onClick={() => setDeleteId(null)}>Cancel</button>
          </div> : <div className="button-row">
            <button className="button small" disabled={busy} onClick={() => void perform(async () => {
              applyLesson(await api<LoadedLesson>(`/lessons/${lesson.id}`), '');
              setModal(null);
            })}>Open</button>
            <button className="icon-button" disabled={busy} aria-label={`Delete ${lesson.name}`}
              onClick={() => setDeleteId(lesson.id)}><Icon name="trash" size={16}/></button>
          </div>}
        </div>)}
      </div>
    </Dialog>}
    <NeuronTutor open={tutorOpen}
      context={{ network, result, targets: targets.map(Number), learningRate, steps, autoResult }}
      onClose={() => setTutorOpen(false)}
      onAutoTrain={target => {
        const next = targets.map((value, index) => index === 0 ? String(target) : value);
        startAuto({ targets: next.map(Number) });
      }}/>
  </div>;
}
