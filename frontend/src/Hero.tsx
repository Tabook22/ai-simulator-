import { Icon } from './ui';
import type { IconName } from './ui';
import type { PresetKey } from './Settings';
import { useI18n } from './i18n';

const journeys: { key: PresetKey; title: string; goal: string; icon: IconName }[] = [
  { key: 'one-neuron', title: 'One neuron by hand', goal: 'Multiply, add, activate', icon: 'target' },
  { key: 'two-layers', title: 'Two layers', goal: 'Hidden neurons join in', icon: 'network' },
  { key: 'activation', title: 'Why activation?', goal: 'Linear vs ReLU at −3', icon: 'bulb' },
  { key: 'and', title: 'AND gate', goal: 'Teach it with examples', icon: 'flask' },
];

function HeroArt() {
  return <div className="hero-art" aria-hidden="true">
    <div className="hero-orbit hero-orbit-a"/>
    <div className="hero-orbit hero-orbit-b"/>
    <svg className="hero-net" viewBox="0 0 340 210" fill="none">
      <defs>
        <radialGradient id="hero-soma" cx="34%" cy="26%" r="78%">
          <stop offset="0%" stopColor="#c9f7ff"/>
          <stop offset="42%" stopColor="#5ee7ff"/>
          <stop offset="100%" stopColor="#8b6bff"/>
        </radialGradient>
        <linearGradient id="hero-wire" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#5ee7ff" stopOpacity=".25"/>
          <stop offset="100%" stopColor="#a78bfa" stopOpacity=".9"/>
        </linearGradient>
      </defs>
      <g className="hero-wires" stroke="url(#hero-wire)" strokeWidth="2" strokeLinecap="round">
        <path d="M64 55 C 120 55 128 102 172 102"/>
        <path d="M64 105 C 112 105 130 105 172 105"/>
        <path d="M64 155 C 120 155 128 108 172 108"/>
      </g>
      <g className="hero-inputs">
        <circle cx="54" cy="55" r="13"/><text x="54" y="60">2</text>
        <circle cx="54" cy="105" r="13"/><text x="54" y="110">3</text>
        <circle cx="54" cy="155" r="13"/><text x="54" y="160">1</text>
      </g>
      <g className="hero-soma">
        <circle cx="212" cy="105" r="46" fill="url(#hero-soma)" className="hero-glow"/>
        <circle cx="212" cy="105" r="42" fill="url(#hero-soma)"/>
        <g className="hero-face">
          <circle cx="199" cy="99" r="4.2" className="hero-eye"/>
          <circle cx="225" cy="99" r="4.2" className="hero-eye"/>
          <path d="M200 116 q12 9 24 0" className="hero-smile"/>
        </g>
      </g>
      <path d="M256 105 h 40" className="hero-out"/>
      <circle cx="308" cy="105" r="11" className="hero-out-node"/>
      <text x="308" y="110" className="hero-out-text">1.5</text>
    </svg>
    <span className="hero-token token-mul">× 0.5</span>
    <span className="hero-token token-bias">+ (−1)</span>
    <span className="hero-token token-relu">ReLU</span>
  </div>;
}

export function Hero({ preset, disabled, onPreset }: {
  preset: PresetKey | ''; disabled: boolean; onPreset: (preset: PresetKey) => void;
}) {
  const { t, isArabic } = useI18n();
  return <section className="hero">
    <div className="hero-copy">
      <div className="eyebrow hero-label"><span/>{t('Interactive AI classroom')}</div>
      <h1>{isArabic ? <>شاهد كيف <em className="glow-word">تفكّر</em> الخلية العصبية</> : <>See how a neuron <em className="glow-word">thinks</em></>}</h1>
      <p className="hero-lede">{t('Follow a real calculation from input to output, open any neuron, and train the network yourself — no setup, no accounts.')}</p>
      <p className="journey-lead">{t('Pick a starting network:')}</p>
      <div className="journey" aria-label={t('Classroom journey')}>
        {journeys.map((item, index) => <button key={item.key} type="button" disabled={disabled}
          className={preset === item.key ? 'journey-card active' : 'journey-card'}
          aria-pressed={preset === item.key} onClick={() => onPreset(item.key)}>
          <span className="journey-icon"><Icon name={item.icon} size={16}/></span>
          <span className="journey-text">
            <strong>{t(item.title)}</strong>
            <small>{t(item.goal)}</small>
          </span>
          <span className="journey-index">{index + 1}</span>
        </button>)}
      </div>
    </div>
    <HeroArt/>
  </section>;
}
