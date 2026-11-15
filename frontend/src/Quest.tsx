import type { CSSProperties } from 'react';
import { Icon } from './ui';
import type { IconName } from './ui';
import { useI18n } from './i18n';
import { readStored, writeStored } from './libraryStorage';

export interface Quest {
  ran: boolean;
  opened: boolean;
  edited: boolean;
  trained: boolean;
}

export const emptyQuest: Quest = { ran: false, opened: false, edited: false, trained: false };

export const questSteps: { key: keyof Quest; label: string; icon: IconName }[] = [
  { key: 'ran', label: 'Run the numbers', icon: 'play' },
  { key: 'opened', label: 'Open a neuron', icon: 'target' },
  { key: 'edited', label: 'Change a weight', icon: 'sliders' },
  { key: 'trained', label: 'Teach the net', icon: 'flask' },
];

const STORAGE = 'neuron-lab-quest-v1';

export function questComplete(quest: Quest) {
  return questSteps.every(step => quest[step.key]);
}

export function loadQuest(): Quest {
  try {
    const saved = JSON.parse(readStored(STORAGE) ?? 'null') as Partial<Quest> | null;
    return {
      ran: saved?.ran === true,
      opened: saved?.opened === true,
      edited: saved?.edited === true,
      trained: saved?.trained === true,
    };
  } catch {
    return emptyQuest;
  }
}

export function saveQuest(quest: Quest) {
  writeStored(STORAGE, JSON.stringify(quest));
}

export function QuestStrip({ quest, onReset }: { quest: Quest; onReset: () => void }) {
  const { t } = useI18n();
  const done = questSteps.filter(step => quest[step.key]).length;
  const complete = done === questSteps.length;
  return <section className={complete ? 'quest complete' : 'quest'} aria-label={t('Classroom quest')}>
    <div className="quest-ring"
      style={{ '--progress': `${done / questSteps.length}` } as CSSProperties} aria-hidden="true">
      <span>{done}<small>/{questSteps.length}</small></span>
    </div>
    <div className="quest-copy">
      <span className="quest-eyebrow">
        <Icon name={complete ? 'trophy' : 'sparkle'} size={14}/>
        {complete ? t('Quest complete') : t('Your quest')}
      </span>
      <p>{complete ? t('You followed a whole neuron from input to update. Nice work.')
        : t('Four small moves that show the whole idea.')}</p>
    </div>
    <ol className="quest-steps">
      {questSteps.map(step => <li key={step.key} className={quest[step.key] ? 'done' : ''}>
        <span className="quest-dot"><Icon name={quest[step.key] ? 'check' : step.icon} size={12}/></span>
        <span><span className="sr-only">{quest[step.key] ? t('Done: ') : t('Not yet: ')}</span>{t(step.label)}</span>
      </li>)}
    </ol>
    {done > 0 && <button className="icon-button quest-reset" aria-label={t('Reset quest progress')}
      title={t('Reset quest progress')} onClick={onReset}><Icon name="reset" size={14}/></button>}
  </section>;
}
