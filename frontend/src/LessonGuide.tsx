import { LESSONS } from './lessons';
import type { WorkshopTab } from './lessons';
import { Icon } from './ui';

/** The numbered lab tabs. The number is decoration: the accessible name stays the lab's name. */
export function LessonTabs({ tab, disabled, label, translate, onOpen }: {
  tab: WorkshopTab; disabled: boolean; label: string;
  translate: (text: string) => string; onOpen: (tab: WorkshopTab) => void;
}) {
  return <nav className="workspace-tabs" aria-label={label}>
    {LESSONS.map((lesson, index) => <button key={lesson.tab} className={tab === lesson.tab ? 'current' : ''}
      aria-current={tab === lesson.tab ? 'page' : undefined} disabled={disabled}
      title={lesson.question} onClick={() => onOpen(lesson.tab)}>
      <span className="tab-number" aria-hidden="true">{index + 1}</span>
      <Icon name={lesson.icon} size={17}/>{translate(lesson.label)}
    </button>)}
  </nav>;
}

/** What this lab teaches, what to try, and where to go next. */
export function LessonGuide({ tab, open, disabled, onToggle, onOpen }: {
  tab: WorkshopTab; open: boolean; disabled: boolean;
  onToggle: () => void; onOpen: (tab: WorkshopTab) => void;
}) {
  const index = LESSONS.findIndex(lesson => lesson.tab === tab);
  const lesson = LESSONS[index];
  const previous = LESSONS[index - 1];
  const next = LESSONS[index + 1];
  return <section className={open ? 'lesson-guide open' : 'lesson-guide'} aria-label="Lesson guide">
    <div className="lesson-guide-bar">
      <span className="lesson-step">Lesson {index + 1}<small>of {LESSONS.length}</small></span>
      <div className="lesson-guide-copy">
        <strong>{lesson.question}</strong>
        <p>{lesson.goal}</p>
      </div>
      <div className="lesson-guide-actions">
        <button type="button" className="button small quiet" aria-expanded={open} aria-controls="lesson-guide-detail"
          onClick={onToggle}><Icon name="bulb" size={14}/>{open ? 'Hide intro' : 'Show intro'}</button>
        <button type="button" className="button small icon-only" disabled={disabled || !previous}
          aria-label={previous ? `Go back to lesson ${index} of ${LESSONS.length}` : 'This is the first lesson'}
          title={previous ? `Back to lesson ${index}: ${previous.label}` : undefined}
          onClick={() => previous && onOpen(previous.tab)}><Icon name="previous" size={15}/></button>
        <button type="button" className="button small" disabled={disabled || !next}
          aria-label={next ? `Continue to lesson ${index + 2} of ${LESSONS.length}` : 'This is the last lesson'}
          title={next ? `Continue to lesson ${index + 2}: ${next.label}` : undefined}
          onClick={() => next && onOpen(next.tab)}>Continue<Icon name="next" size={15}/></button>
      </div>
    </div>
    {open && <div className="lesson-guide-detail" id="lesson-guide-detail">
      <div>
        <h3><Icon name="book" size={14}/>The ideas</h3>
        <ul>{lesson.learn.map(item => <li key={item}>{item}</li>)}</ul>
      </div>
      <div>
        <h3><Icon name="play" size={13}/>Try this</h3>
        <ol>{lesson.tryIt.map(item => <li key={item}>{item}</li>)}</ol>
      </div>
    </div>}
  </section>;
}
