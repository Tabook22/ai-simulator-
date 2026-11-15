import { useEffect, useState } from 'react';
import './house.css';
import { api } from './model';
import type { ExamResult } from './model';
import { HouseReferences } from './HouseReferences';
import { Icon, PanelTitle } from './ui';
import { useI18n } from './i18n';
import {
  EXAM_BATCH_SIZE, EXAM_CASE_EPOCHS, EXAM_LEARNING_RATE, EXAM_POSTERS,
} from './examConfig';

const points = (value: number) => `${Math.round(value)} / 100`;

interface CaseSection { heading: string; body: string; bullets?: string[] }
interface CaseStep {
  number: number;
  label: string;
  title: string;
  lead: string;
  sections: CaseSection[];
  check: string;
}

const STEPS: CaseStep[] = [
  {
    number: 1, label: 'Define', title: 'Define the task',
    lead: 'Decide what the network should learn.',
    sections: [
      { heading: 'Our goal', body: 'Predict a student’s exam score from two study habits: weekly study hours and attendance percentage.' },
      { heading: 'Inputs and target', body: 'x₁ = study hours per week, x₂ = attendance (%), and the target = the actual exam score out of 100. One student is one example; 1,000 students are 1,000 examples.' },
      { heading: 'Why the target is not an input', body: 'The actual score is never fed into the network. It is used only after the prediction to measure the error. If the network were given the answer, it would not learn to predict anything.' },
    ],
    check: 'For Student 1, point to the two inputs (5, 70) and the target (58).',
  },
  {
    number: 2, label: 'Records', title: 'One student = one example',
    lead: 'Each row gives the network the habits and keeps the result for comparison.',
    sections: [
      { heading: 'What a record contains', body: 'A record has two input features — study hours and attendance — and one target, the actual score. The score is compared with the prediction; it is not an input.' },
      { heading: 'The four rows', body: 'Student 1: 5 hours, 70%, score 58. Student 2: 10 hours, 85%, score 75. Student 3: 15 hours, 95%, score 89. Student 4: 8 hours, 80%, score 68.' },
      { heading: 'Illustrative data', body: 'These four values are illustrative. Study hours and attendance help predict a score, but they do not completely determine exam results.' },
    ],
    check: 'Which column is not an input? The actual score. It is the target.',
  },
  {
    number: 3, label: 'Split', title: 'Split the records',
    lead: 'Keep some students out of training so you can test whether the network really learned.',
    sections: [
      { heading: 'The three sets', body: 'Training students update the weights and biases. Validation students compare settings and designs without changing the weights. Test students are opened once at the end.' },
      { heading: 'In our example', body: '1,000 training students, 100 validation students, and 100 test students. The model never trains on the validation or test students.' },
      { heading: 'Why it matters', body: 'A network can memorise its training rows. Separate students reveal whether it can handle someone it has never seen.' },
    ],
    check: 'Which set may update the weights? Only the training set.',
  },
  {
    number: 4, label: 'Scale', title: 'Prepare and scale the inputs',
    lead: 'Put study hours and attendance on comparable scales before training.',
    sections: [
      { heading: 'The scales are different', body: 'Study hours run from about 1 to 20; attendance runs from 50 to 100. Without scaling, attendance would produce much larger products and gradients than study hours.' },
      { heading: 'How scaling works', body: 'For each feature, subtract the training mean and divide by the training standard deviation: x_scaled = (x − mean) / std. Fit the scaler on training students only, then apply the same numbers to validation and test students.' },
      { heading: 'The target', body: 'The score is also scaled while training for stable gradients. The app converts every prediction back to a score out of 100 for the tables and the error report.' },
    ],
    check: 'Why must validation and test students use the training mean and standard deviation? So every student gets the same transformation.',
  },
  {
    number: 5, label: 'Network', title: 'Choose the network',
    lead: 'The same small network as before: two inputs, three hidden neurons, one output.',
    sections: [
      { heading: 'The shape', body: '2 input nodes (study hours and attendance) → 3 hidden neurons (ReLU) → 1 output neuron (Linear), because we predict one score. This gives 2×3 + 3×1 = 9 weights and 3 + 1 = 4 biases.' },
      { heading: 'What each part does', body: 'The hidden neurons learn combinations of study habits. The output neuron turns those features into a predicted score. The output is linear because a score can take any value in the 0–100 range.' },
      { heading: 'Features are not rows', body: 'Add a third feature, such as sleep hours, and the input layer needs three nodes. Change the batch size from 100 to 50 and the input layer still needs two nodes, because each student still has two features.' },
      { heading: 'More hidden layers?', body: 'A deeper 2 → 4 → 4 → 1 network has more capacity. More capacity can learn more complex patterns, but it does not automatically improve results and can overfit. Compare designs on separate validation students.' },
    ],
    check: 'Count the parameters: 9 weights and 4 biases. Where do the 9 weights come from?',
  },
  {
    number: 6, label: 'Initialize', title: 'Choose settings and initialize',
    lead: 'Pick the learning settings, then set the starting weights reproducibly.',
    sections: [
      { heading: 'The settings', body: 'Batch size 100, a learning rate, 10 epochs, mean squared error, and a small mini-batch optimizer. These are choices to test, not magic numbers.' },
      { heading: 'The seed', body: 'Seed 42 makes the random starting weights repeatable. Set seeds before other random operations too, such as splitting or shuffling the students.' },
      { heading: 'The starting point', body: 'The two weight matrices start from a seeded random draw; the four biases start at zero. The same seed with the same initialization code gives the same starting network.' },
    ],
    check: 'Why set a seed? So two runs start from the same weights and can be compared fairly.',
  },
  {
    number: 7, label: 'Batch', title: 'Train one batch',
    lead: 'The same network predicts 100 students, averages their errors, and updates once.',
    sections: [
      { heading: 'One batch', body: 'A batch of 100 students has shape 100 × 2: 100 rows and two feature columns per row. That is 200 input values. The network produces 100 score predictions.' },
      { heading: 'One update', body: 'The losses for those 100 predictions are averaged into one batch loss. Backpropagation calculates the gradients, and the optimizer updates every weight and bias once. The next batch starts from those updated parameters.' },
      { heading: 'Why batches?', body: 'The rows are processed together with matrix operations; you do not need 100 separate networks. Batches reduce memory needs and allow frequent updates.' },
    ],
    check: 'What is the shape of one batch? 100 students × 2 features = 200 input values.',
  },
  {
    number: 8, label: 'Epoch', title: 'Complete one epoch',
    lead: 'One pass over the 1,000 training students is one epoch: ten batches, ten updates.',
    sections: [
      { heading: 'One epoch', body: '1,000 training students ÷ 100 per batch = 10 batches = 10 updates. Batch 1 uses the initial parameters; batch 2 uses batch 1’s updated weights; and so on to batch 10.' },
      { heading: 'The next epoch', body: 'Shuffle the training students and repeat. Do not reinitialize the weights: epoch 2 starts from the parameters learned in epoch 1.' },
      { heading: 'Ten epochs', body: '10 epochs × 10 batches = 100 updates. Every student is seen once per epoch, then again in later epochs. The learned weights continue across epochs.' },
    ],
    check: 'After the first batch of epoch 2, how many updates have happened? 11.',
  },
  {
    number: 9, label: 'Validate', title: 'Validate and improve',
    lead: 'Use the validation students to choose settings, not to update the weights.',
    sections: [
      { heading: 'What we measure', body: 'After each epoch, predict the validation students and record the error. No gradient step is taken from validation data.' },
      { heading: 'When to stop', body: 'If validation performance stops improving, stop rather than assuming more training is always better. This is early stopping.' },
      { heading: 'Capacity and overfitting', body: 'More hidden layers can learn more complex patterns but may memorise the training students. Compare a shallow 2 → 3 → 1 network with a deeper 2 → 4 → 4 → 1 network on the same validation split, and choose by validation error.' },
    ],
    check: 'Which error should guide the choice of network — training or validation? Validation.',
  },
  {
    number: 10, label: 'Predict', title: 'Test and predict a new student',
    lead: 'Open the test set once, then use the chosen model on a new student.',
    sections: [
      { heading: 'The final check', body: 'Evaluate the selected model on the 100 test students. They were never used to update weights or choose settings, so the test error is the fairest estimate on unseen students.' },
      { heading: 'Using it', body: 'For a new student, enter study hours and attendance. The same network runs a forward pass and returns a predicted score out of 100. The actual score was only needed during training and evaluation.' },
      { heading: 'The whole pipeline', body: 'Prepare data → choose network → initialize → predict → measure error → calculate gradients → update → repeat → evaluate. Learning happens when the optimizer updates the weights and biases using the gradients.' },
    ],
    check: 'What changes the weights? Only the optimizer step after backpropagation, using training batches.',
  },
];

const FEATURE_ROWS = [
  ['Student 1', '5', '70', '58'],
  ['Student 2', '10', '85', '75'],
  ['Student 3', '15', '95', '89'],
  ['Student 4', '8', '80', '68'],
];

function DatasetTable() {
  return <div className="house-table-wrap">
    <table className="house-table">
      <thead><tr><th>Student</th><th>Study h/week</th><th>Attendance %</th><th>Actual score /100</th></tr></thead>
      <tbody>{FEATURE_ROWS.map((row, index) => <tr key={index}>{row.map((cell, position) => <td key={position}>{cell}</td>)}</tr>)}
      </tbody>
    </table>
    <p className="house-caption"><span className="house-tag input">x₁ study hours</span><span className="house-tag input">x₂ attendance</span><span className="house-tag target">target score</span> — the target is compared, never fed in as an input.</p>
  </div>;
}

function NetworkVisual() {
  return <div className="house-network">
    <svg viewBox="0 0 720 280" role="img" aria-label="A 2 to 3 to 1 network">
      <g className="house-edges">
        {[0, 1].flatMap(input => [0, 1, 2].map(hidden =>
          <line key={`in-${input}-${hidden}`} x1={110} y1={86 + input * 92} x2={320} y2={60 + hidden * 70} />))}
        {[0, 1, 2].map(hidden => <line key={`out-${hidden}`} x1={380} y1={60 + hidden * 70} x2={570} y2={150} />)}
      </g>
      {[0, 1].map(input => <g key={input} className="house-node input" transform={`translate(80, ${86 + input * 92})`}>
        <circle r="34"/><text y="5">{input === 0 ? 'Study' : 'Attendance'}</text>
        <text className="house-node-caption" y="52">{input === 0 ? 'x₁ hours' : 'x₂ percent'}</text>
      </g>)}
      {[0, 1, 2].map(hidden => <g key={hidden} className="house-node hidden" transform={`translate(350, ${60 + hidden * 70})`}>
        <circle r="27"/><text y="5">h{hidden + 1}</text><text className="house-node-caption" y="45">ReLU</text>
      </g>)}
      <g className="house-node output" transform="translate(600, 150)">
        <circle r="36"/><text y="5">ŷ</text><text className="house-node-caption" y="54">predicted score</text>
      </g>
    </svg>
    <div className="house-network-foot">
      <span><strong>9</strong> weights</span>
      <span><strong>4</strong> biases</span>
      <span><strong>2</strong> inputs · <strong>3</strong> hidden · <strong>1</strong> output</span>
    </div>
  </div>;
}

function StepVisual({ step }: { step: number }) {
  if (step === 1 || step === 2) return <div className="house-card">
    <div className="house-card-head"><Icon name="layers" size={16}/><h3>One student = one row</h3></div>
    <DatasetTable/>
  </div>;
  if (step === 3) return <div className="house-card">
    <div className="house-card-head"><Icon name="target" size={16}/><h3>Split before you train</h3></div>
    <div className="house-split">
      <div className="house-split-block train"><strong>1,000</strong><span>training students</span><small>update the weights</small></div>
      <div className="house-split-block"><strong>100</strong><span>validation students</span><small>choose settings</small></div>
      <div className="house-split-block"><strong>100</strong><span>test students</span><small>final check</small></div>
    </div>
    <p className="house-caption">The test students are opened once, after the design is chosen.</p>
  </div>;
  if (step === 4) return <div className="house-card">
    <div className="house-card-head"><Icon name="sliders" size={16}/><h3>Make the columns comparable</h3></div>
    <div className="house-formula math">x_scaled = (x − mean) / std</div>
    <div className="house-chain"><span>Study 1–20 h</span><Icon name="arrow" size={14}/><span>scaled</span><Icon name="arrow" size={14}/><span>Attendance 50–100%</span><Icon name="arrow" size={14}/><span>scaled</span></div>
    <p className="house-caption">Fit the mean and standard deviation on the training students, then reuse them for validation and test students.</p>
  </div>;
  if (step === 5) return <div className="house-card">
    <div className="house-card-head"><Icon name="network" size={16}/><h3>2 → 3 → 1</h3></div>
    <NetworkVisual/>
    <p className="house-caption">A deeper 2 → 4 → 4 → 1 design has four neurons in each hidden layer; adding layers is a choice to test on validation data.</p>
  </div>;
  if (step === 6) return <div className="house-card">
    <div className="house-card-head"><Icon name="dice" size={16}/><h3>Settings for the run</h3></div>
    <div className="house-settings">
      <span>Batch size <strong>100</strong></span><span>Epochs <strong>10</strong></span><span>Loss <strong>MSE</strong></span>
      <span>Seed <strong>42</strong></span><span>Weights <strong>9</strong></span><span>Biases <strong>4</strong></span>
    </div>
    <p className="house-caption">The biases start at zero; the same seed and initialization give the same starting network.</p>
  </div>;
  if (step === 7) return <div className="house-card">
    <div className="house-card-head"><Icon name="flask" size={16}/><h3>One batch = 100 students</h3></div>
    <div className="house-batch-shape"><span>100 students</span><strong>×</strong><span>2 features</span><strong>=</strong><span>200 input values</span></div>
    <div className="house-batch-flow">
      <span>Predict 100 scores</span><Icon name="arrow" size={14}/><span>Average the losses</span><Icon name="arrow" size={14}/><span>Backpropagate</span><Icon name="arrow" size={14}/><span>Update once</span>
    </div>
    <p className="house-caption">The same network predicts all 100 students. You do not need 100 separate networks.</p>
  </div>;
  if (step === 8) return <div className="house-card">
    <div className="house-card-head"><Icon name="reset" size={16}/><h3>10 batches = 1 epoch</h3></div>
    <div className="house-epoch">
      <div><strong>1,000</strong><span>students</span></div><Icon name="arrow" size={16}/>
      <div><strong>÷ 100</strong><span>batches</span></div><Icon name="arrow" size={16}/>
      <div><strong>10</strong><span>updates</span></div><Icon name="arrow" size={16}/>
      <div><strong>1</strong><span>epoch</span></div>
    </div>
    <p className="house-caption">Shuffle and repeat. Keep the learned weights; do not initialize them again.</p>
  </div>;
  if (step === 9) return <div className="house-card">
    <div className="house-card-head"><Icon name="chart" size={16}/><h3>Watch validation, not just training</h3></div>
    <div className="house-split">
      <div className="house-split-block"><strong>Training</strong><span>learns the weights</span><small>can be memorised</small></div>
      <div className="house-split-block"><strong>Validation</strong><span>chooses the design</span><small>no weight updates</small></div>
    </div>
    <p className="house-caption">More layers can help, but compare designs on validation students. They can also overfit and cost more computation.</p>
  </div>;
  return <div className="house-card">
    <div className="house-card-head"><Icon name="check" size={16}/><h3>Open the test set once</h3></div>
    <div className="house-chain"><span>Train</span><Icon name="arrow" size={14}/><span>Validate</span><Icon name="arrow" size={14}/><span>Test</span><Icon name="arrow" size={14}/><span>Predict a new student</span></div>
    <p className="house-caption">The test error is the fairest estimate of performance on students the model has never seen.</p>
    <DatasetTable/>
  </div>;
}

function LossChart({ result }: { result: ExamResult }) {
  const train = result.history.train_rmse;
  const validation = result.history.validation_rmse;
  const all = [...train, ...validation];
  const max = Math.max(...all, 1);
  const min = Math.min(...all, 0);
  const range = Math.max(max - min, 1);
  const x = (index: number) => (index / Math.max(train.length - 1, 1)) * 100;
  const y = (value: number) => 36 - ((value - min) / range) * 30;
  return <div className="house-chart">
    <div className="house-chart-head"><span>RMSE per epoch</span><small>lower is better</small></div>
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" role="img" aria-label="Training and validation error">
      <polyline className="house-train-line" points={train.map((value, index) => `${x(index)},${y(value)}`).join(' ')}/>
      <polyline className="house-val-line" points={validation.map((value, index) => `${x(index)},${y(value)}`).join(' ')}/>
    </svg>
    <div className="house-chart-foot">
      <span><i className="house-dot train"/>Training RMSE {points(train[train.length - 1])}</span>
      <span><i className="house-dot validation"/>Validation RMSE {points(validation[validation.length - 1])}</span>
    </div>
  </div>;
}

function TrainingLab({ result, loading, error, run }: {
  result: ExamResult | null; loading: boolean; error: string; run: (epochs: number) => void;
}) {
  return <section className="panel house-lab" aria-label="Live exam score mini-batch training">
    <PanelTitle icon="flask" aside={<span className="badge neutral-badge">2 → 3 → 1 · seed 42</span>}>Try the exam batch loop</PanelTitle>
    <div className="house-lab-body">
      <p className="house-lab-lead">Run the same 1,000 training students through 10 batches of 100. The network sees one batch, updates once, then carries those weights into the next batch.</p>
      <div className="house-lab-controls">
        <button type="button" className="button primary" disabled={loading} onClick={() => run(EXAM_CASE_EPOCHS)}>
          <Icon name="play" size={15}/>{loading ? 'Training…' : `Run ${EXAM_CASE_EPOCHS} epochs`}
        </button>
        <button type="button" className="button small" disabled={loading} onClick={() => run(1)}>Run 1 epoch</button>
        <span className="house-lab-note">100 updates · 10 batches per epoch · 2 features</span>
      </div>
      {error && <div className="message error" role="alert">{error}</div>}
      {result && <>
        <div className="house-lab-summary">
          <div><span>Parameters</span><strong>{result.network.weights} weights · {result.network.biases} biases</strong></div>
          <div><span>Batches</span><strong>{result.dataset.batches_per_epoch} × {result.dataset.batch_size} students</strong></div>
          <div><span>Updates</span><strong>{result.updates}</strong></div>
          <div><span>Epochs</span><strong>{result.epochs}</strong></div>
        </div>
        <div className="house-lab-grid">
          <div>
            <div className="house-batch-list" aria-label="Batch losses in the first epoch">
              {result.batch_losses.map((loss, index) => <span key={index} title={`Batch ${index + 1} RMSE`}>
                <small>B{index + 1}</small>{Math.round(loss)}
              </span>)}
            </div>
            <LossChart result={result}/>
          </div>
          <div className="house-metrics">
            <div className="house-metric-head"><span>Mean absolute error</span><span>before → after</span></div>
            {(['train', 'validation', 'test'] as const).map(split => <div className="house-metric" key={split}>
              <span>{split}</span>
              <strong>{points(result.initial[split].mae)}</strong>
              <Icon name="next" size={13}/>
              <strong className="after">{points(result.final[split].mae)}</strong>
            </div>)}
            <p className="house-caption">The test students were never used for updates or for choosing settings.</p>
          </div>
        </div>
        <div className="house-predictions">
          <h4>After training</h4>
          <div className="house-table-wrap">
            <table className="house-table">
              <thead><tr><th>Student</th><th>Study h</th><th>Attendance</th><th>Actual</th><th>Predicted</th><th>Gap</th></tr></thead>
              <tbody>{result.predictions.map((sample, index) => <tr key={index}>
                <td>Student {index + 1}</td><td>{sample.study_hours}</td><td>{sample.attendance}%</td>
                <td>{points(sample.actual)}</td><td>{points(sample.predicted)}</td>
                <td>{sample.predicted - sample.actual > 0 ? '+' : ''}{sample.predicted - sample.actual}</td>
              </tr>)}</tbody>
            </table>
          </div>
        </div>
      </>}
    </div>
  </section>;
}

export function ExamCaseStudy() {
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function run(epochs: number) {
    setLoading(true);
    setError('');
    try {
      const data = await api<ExamResult>('/case/exam/train', {
        epochs, batch_size: EXAM_BATCH_SIZE, learning_rate: EXAM_LEARNING_RATE,
      });
      setResult(data);
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'The training run failed.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void run(EXAM_CASE_EPOCHS); }, []);

  const current = STEPS[step];
  return <div className="house-case">
    <header className="house-hero">
      <div>
        <div className="eyebrow">{t('Real-world case study · 10 steps')}</div>
        <h1>{t('How a neural network learns exam scores')}</h1>
        <p>{t('2 features per student · 100 students per batch · 10 updates per epoch · one 2 → 3 → 1 network.')}</p>
        <div className="house-hero-chips">
          <span><Icon name="layers" size={13}/>{t('1,000 training students')}</span>
          <span><Icon name="network" size={13}/>{t('9 weights + 4 biases')}</span>
          <span><Icon name="chart" size={13}/>{t('validation + test')}</span>
        </div>
      </div>
      <button type="button" className="button small" onClick={() => window.print()}><Icon name="book" size={15}/>{t('Print the case study')}</button>
    </header>

    <HouseReferences posters={EXAM_POSTERS}/>

    <div className="house-pipeline" aria-label={t('The ten steps of a machine-learning project')}>
      <div className="house-pipeline-line">{t('Prepare data → choose network → initialize → predict → measure error → calculate gradients → update → repeat → evaluate.')}</div>
      <div className="house-step-rail">
        {STEPS.map((item, index) => <button type="button" key={item.number}
          className={index === step ? 'current' : index < step ? 'done' : ''}
          aria-current={index === step ? 'step' : undefined} onClick={() => setStep(index)}>
          <span>{item.number}</span>{t(item.label)}
        </button>)}
      </div>
    </div>

    <div className="house-layout">
      <section className="panel house-document" aria-label={`${t('Step')} ${current.number}: ${t(current.title)}`}>
        <div className="house-doc-head">
          <div className="house-doc-number">{current.number}</div>
          <div><div className="eyebrow">{t('Step')} {current.number} {t('of 10')}</div><h2>{t(current.title)}</h2></div>
          <span className="house-doc-badge">{t(current.label)}</span>
        </div>
        <p className="house-lead">{t(current.lead)}</p>
        <div className="house-doc-sections">
          {current.sections.map(section => <section key={section.heading}>
            <h3>{t(section.heading)}</h3>
            <p>{t(section.body)}</p>
            {section.bullets && <ul>{section.bullets.map(item => <li key={item}>{t(item)}</li>)}</ul>}
          </section>)}
        </div>
        <div className="house-check"><Icon name="bulb" size={16}/><p><strong>{t('Student check:')}</strong> {t(current.check)}</p></div>
        <div className="house-doc-nav">
          <button type="button" className="button small" disabled={step === 0} onClick={() => setStep(value => Math.max(0, value - 1))}><Icon name="previous" size={14}/>{t('Previous')}</button>
          <span>{current.number} / 10</span>
          <button type="button" className="button small" disabled={step === STEPS.length - 1} onClick={() => setStep(value => Math.min(STEPS.length - 1, value + 1))}>{t('Next step')}<Icon name="next" size={14}/></button>
        </div>
      </section>

      <div className="house-visual-column">
        <StepVisual step={current.number}/>
      </div>
    </div>

    <TrainingLab result={result} loading={loading} error={error} run={run}/>

    <footer className="house-footer">
      <p><strong>{t('Remember:')}</strong> {t('learning happens when the optimizer updates the weights and biases using the gradients.')}</p>
      <p>{t('Batch size counts students. Input count counts features. Architecture decides the weights and biases.')}</p>
    </footer>
  </div>;
}
