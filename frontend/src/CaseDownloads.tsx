import { useState } from 'react';
import { useI18n } from './i18n';
import { Icon } from './ui';

const PATHS = {
  house: {
    excel: 'downloads/house/house_data.xlsx',
    project: 'downloads/house/house-python.zip',
    script: 'downloads/house/train_house.py',
    rows: '1,000 training houses, 100 validation, 100 test',
  },
  exam: {
    excel: 'downloads/exam/exam_data.xlsx',
    project: 'downloads/exam/exam-python.zip',
    script: 'downloads/exam/train_exam.py',
    rows: '1,000 training students, 100 validation, 100 test',
  },
} as const;

export function CaseDownloads({ kind }: { kind: 'house' | 'exam' }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const base = import.meta.env.BASE_URL;
  const paths = PATHS[kind];

  async function copyScript() {
    try {
      const response = await fetch(`${base}${paths.script}`);
      if (!response.ok) throw new Error('The script could not be loaded.');
      await navigator.clipboard.writeText(await response.text());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return <section className="case-downloads" aria-label={t('Download data and Python project')}>
    <div className="case-download-copy">
      <div className="eyebrow">{t('Take it with you')}</div>
      <h2>{t('Excel data + Python project')}</h2>
      <p>{t('Download the complete dataset and a small Python project that reads the workbook, trains the same 2 → 3 → 1 network, and writes the results.')}</p>
    </div>
    <div className="case-download-actions">
      <a className="button primary" href={`${base}${paths.excel}`} download>
        <Icon name="download" size={15}/>{t('Download Excel dataset')}
      </a>
      <a className="button" href={`${base}${paths.project}`} download>
        <Icon name="download" size={15}/>{t('Download Python project')}
      </a>
      <button type="button" className="button quiet" onClick={() => void copyScript()}>
        <Icon name="code" size={15}/>{copied ? t('Copied') : t('Copy Python code')}
      </button>
    </div>
    <p className="case-download-note">
      {t(paths.rows)} · {t('10 batch sheets × 100 rows · seed 42 · 9 weights + 4 biases · setup and README included')}
    </p>
  </section>;
}
