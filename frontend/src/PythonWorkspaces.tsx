/**
 * The Python tab: one example, one workspace.
 * Every example opens alone, with its own code, settings, output and files; nothing from another
 * example is rendered beside it, and switching unmounts the old workspace so no state carries over.
 *
 * To add a future example, add ONE entry to PY_EXAMPLES below (key, icon, titles, and render).
 * Do not place a new example inside an existing workspace.
 */
import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import './python-workspaces.css';
import { Icon } from './ui';
import type { IconName } from './ui';
import type { Network, TrainingSettings } from './model';
import { readStored, writeStored } from './libraryStorage';
import { t, useTx } from './FineTuneScenes';
import type { Text } from './FineTuneScenes';
import { FromScratch } from './FromScratch';
import { TorchWorkspace } from './PythonGuide';

interface WorkspaceProps { network: Network; training: TrainingSettings | null; onOpenExplore: () => void; onUseHouseSetup: () => void }

interface PyExample {
  key: string;
  icon: IconName;
  tone: string;
  title: Text;
  goal: Text;
  /** Tools the example uses, shown as a tag. */
  stack: Text;
  render: (props: WorkspaceProps) => ReactNode;
}

export const PY_EXAMPLES: PyExample[] = [
  { key: 'scratch', icon: 'target', tone: '#fb923c', stack: t('Plain Python + numpy', 'بايثون + numpy'),
    title: t('Build a neuron from scratch', 'ابنِ خلية عصبية من الصفر'),
    goal: t('The bike-ride neuron and activation functions, line by line, with the picture and the output in step.', 'خلية ركوب الدراجة ودوال التنشيط، سطرًا بسطر، مع الصورة والناتج خطوة بخطوة.'),
    render: () => <FromScratch/> },
  { key: 'network', icon: 'network', tone: '#a78bfa', stack: t('PyTorch · your network', 'PyTorch · شبكتك'),
    title: t('Train your network in PyTorch', 'درّب شبكتك بـ PyTorch'),
    goal: t('A 15-step training script matched to the network you built in Explore, on generic or your own rows.', 'سكربت تدريب من 15 خطوة يطابق الشبكة التي بنيتها في الاستكشاف، على بيانات عامة أو صفوفك أنت.'),
    render: props => <TorchWorkspace mode="network" {...props}/> },
  { key: 'house', icon: 'home', tone: '#5ee7ff', stack: t('PyTorch · house prices', 'PyTorch · أسعار المنازل'),
    title: t('House prices in PyTorch', 'أسعار المنازل بـ PyTorch'),
    goal: t('The 2 → 3 → 1 house-price model: synthetic data, training, evaluation and saving, in 15 steps.', 'نموذج أسعار المنازل 2 → 3 → 1: بيانات اصطناعية وتدريب وتقييم وحفظ، في 15 خطوة.'),
    render: props => <TorchWorkspace mode="house" {...props}/> },
];

const STORE = 'neuron-lab-python-example';

export function PythonGuide(props: WorkspaceProps) {
  const say = useTx();
  const [key, setKey] = useState(() => {
    const saved = readStored(STORE);
    return PY_EXAMPLES.some(example => example.key === saved) ? saved as string : PY_EXAMPLES[0].key;
  });
  const index = PY_EXAMPLES.findIndex(example => example.key === key);
  const example = PY_EXAMPLES[index];
  const open = (next: string) => {
    setKey(next);
    writeStored(STORE, next);
    window.scrollTo({ top: 0 });
  };
  return <div className="python-guide">
    <header className="pw-head">
      <div>
        <div className="eyebrow">{say(t('Python workspaces', 'مساحات عمل بايثون'))}</div>
        <h1>{say(t('One example, one workspace', 'مثال واحد، مساحة عمل واحدة'))}</h1>
        <p>{say(t('Pick an example. It opens alone, with its own code, settings and files, so you can focus on it completely.', 'اختر مثالًا. يُفتح وحده، بشيفرته وإعداداته وملفاته، لتركّز عليه تمامًا.'))}</p>
      </div>
      <div className="pw-picker" role="tablist" aria-label={say(t('Python examples', 'أمثلة بايثون'))}>
        {PY_EXAMPLES.map((item, position) => <button key={item.key} type="button" role="tab" id={`pw-tab-${item.key}`} aria-selected={item.key === key}
          aria-controls="pw-workspace" className={item.key === key ? 'on' : ''} style={{ '--tone': item.tone } as CSSProperties} onClick={() => open(item.key)}>
          <span className="pw-num" dir="ltr">{position + 1}</span>
          <Icon name={item.icon} size={18}/>
          <b>{say(item.title)}</b>
          <small>{say(item.goal)}</small>
          <em>{say(item.stack)}</em>
        </button>)}
      </div>
    </header>
    <section className="pw-workspace" id="pw-workspace" role="tabpanel" aria-labelledby={`pw-tab-${example.key}`} style={{ '--tone': example.tone } as CSSProperties}
      data-example={example.key}>
      <div className="pw-bar">
        <span className="pw-badge"><Icon name={example.icon} size={14}/>{say(t('Workspace', 'مساحة العمل'))} {index + 1} · {say(example.title)}</span>
        <span className="pw-stack">{say(example.stack)}</span>
      </div>
      <div className="pw-body" key={example.key}>{example.render(props)}</div>
    </section>
  </div>;
}
