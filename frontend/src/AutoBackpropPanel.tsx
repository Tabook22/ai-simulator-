import { format } from './model';
import type { AutoBackpropResult } from './model';
import { Icon } from './ui';

function LossChart({ data }: { data: AutoBackpropResult }) {
  const history = data.history.length > 1 ? data.history : [data.history[0], data.history[0]];
  const max = Math.max(...history, 1e-6);
  const min = Math.min(...history, 0);
  const range = Math.max(max - min, 1e-9);
  const x = (index: number) => (index / (history.length - 1)) * 100;
  const y = (loss: number) => 36 - ((loss - min) / range) * 30;
  const points = history.map((loss, index) => `${x(index)},${y(loss)}`).join(' ');
  const bestIndex = Math.max(0, Math.min(history.length - 1, data.best.step));
  return <div className="auto-chart" aria-label="Loss after each backward step">
    <div className="auto-chart-head"><span>Loss journey</span><small>{history.length - 1} backward steps · lower is better</small></div>
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" role="img" aria-label="Loss chart">
      <polyline className="auto-spark" points={points}/>
      <circle className="auto-best-dot" cx={x(bestIndex)} cy={y(data.best.loss)} r="1.7"/>
    </svg>
    <div className="auto-chart-foot"><span>start {format(data.before.loss)}</span><span className="auto-best-text">best {format(data.best.loss)} · step {data.best.step}</span></div>
  </div>;
}

export function AutoBackpropPanel({ data, targets, applied, onClose, onRunAgain }: {
  data: AutoBackpropResult; targets: number[]; applied: boolean;
  onClose: () => void; onRunAgain: () => void;
}) {
  const improved = data.best.loss < data.before.loss;
  return <section className="auto-backprop" aria-label="Automatic backward pass">
    <div className="auto-top">
      <div>
        <div className="eyebrow">Automatic backward pass · best step kept</div>
        <h3>Auto-train</h3>
      </div>
      <div className="button-row">
        {applied && <span className="auto-applied"><Icon name="check" size={14}/>Best result applied</span>}
        <button type="button" className="button small quiet" onClick={onClose}><Icon name="close" size={14}/>Close</button>
      </div>
    </div>

    <div className="auto-summary">
      <p>
        The forward pass made the first guess. Then the backward pass took
        <strong> {data.history.length - 1} small steps</strong>, each one measuring the error and turning every weight
        and bias a little. The step with the lowest loss is the one we kept.
      </p>
      <p className="auto-note">
        The final step is not always the best: a big learning rate can overshoot. That is why Auto-train keeps the
        <strong> best step</strong>, not just the last one.
      </p>
    </div>

    <div className="auto-grid">
      <LossChart data={data}/>
      <div className="auto-cards">
        <div className="auto-card">
          <span>Before</span>
          <strong>{data.before.prediction.map(value => format(value)).join(', ')}</strong>
          <small>target {targets.map(value => format(value)).join(', ')} · loss {format(data.before.loss)}</small>
        </div>
        <div className="auto-card best">
          <span>Best step {data.best.step}</span>
          <strong>{data.best.prediction.map(value => format(value)).join(', ')}</strong>
          <small>loss {format(data.best.loss)}</small>
        </div>
        <div className="auto-card">
          <span>Final step</span>
          <strong>{data.final.prediction.map(value => format(value)).join(', ')}</strong>
          <small>loss {format(data.final.loss)}</small>
        </div>
      </div>
    </div>

    <div className="auto-actions">
      <p>{improved
        ? `The best step reduced the loss from ${format(data.before.loss)} to ${format(data.best.loss)}.`
        : 'No step beat the starting loss. Try a smaller learning rate or more steps.'}</p>
      <div className="button-row">
        <button type="button" className="button small" onClick={onRunAgain}><Icon name="reset" size={14}/>Run again</button>
        <button type="button" className="button small quiet" onClick={onClose}>Close</button>
      </div>
    </div>
  </section>;
}
