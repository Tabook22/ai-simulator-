/**
 * Builds the site-wide search index: public/search-index.en.json and public/search-index.ar.json.
 *
 * It starts the backend (which serves the built frontend), opens the app in a browser, and visits
 * every lab, every fine-tuning part and its Watch / Try / Remember tabs, every inner tab and step,
 * the library, the lecture videos and the glossary, in English and then in Arabic. Each heading and
 * the text under it becomes one entry, with the clicks needed to reach it.
 *
 *   npm run build && npm run search-index
 *
 * Run it again whenever the content changes. Set NEURON_LAB_BROWSER=chrome to use installed Chrome.
 */
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const PORT = 8012;
const URL_BASE = `http://127.0.0.1:${PORT}`;
const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const OUT = fileURLToPath(new URL('../public/', import.meta.url));
/** The order of the lab buttons (LESSONS in src/lessons.ts). */
const LABS = ['explore', 'train', 'examples', 'playground', 'house', 'exam', 'advisor', 'python', 'tokenizer', 'llm', 'finetune', 'knowledge'];

const server = spawn('python', ['-m', 'uvicorn', 'backend.main:app', '--host', '127.0.0.1', '--port', String(PORT)], {
  cwd: ROOT, env: { ...process.env, NEURON_LAB_DB: join(tmpdir(), `neuron-lab-index-${randomUUID()}.sqlite3`) }, stdio: 'ignore',
});
const stop = () => { try { server.kill(); } catch { /* already gone */ } };
process.on('exit', stop);

for (let i = 0; ; i++) {
  try { if ((await fetch(`${URL_BASE}/api/presets/one-neuron`)).ok) break; } catch { /* not up yet */ }
  if (i > 100) throw new Error('The backend did not start.');
  await new Promise(resolve => setTimeout(resolve, 200));
}

const browser = await chromium.launch({ channel: process.env.NEURON_LAB_BROWSER || undefined });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
/** A button's readable name: its first line of text that is not just a number. */
const nameOf = text => text.split('\n').map(line => line.trim()).find(line => line && !/^\d+$/.test(line)) ?? text.trim();

/** Runs in the page: every visible heading under `rootSelector` and the text that follows it. */
function harvest(rootSelector) {
  const HEADINGS = 'h1, h2, h3, h4, h5, h6, summary, dt';
  const SKIP = 'header.topbar, nav, .workspace-tabs, .ft-rail, .ft-part-tabs, .kl-rail, .kl-part-eyebrow, footer, script, style, noscript, [aria-hidden="true"], .site-search-backdrop, .quest-strip';
  const clean = text => (text ?? '').replace(/\s+/g, ' ').trim();
  const root = document.querySelector(rootSelector);
  if (!root) return [];
  for (const details of root.querySelectorAll('details')) details.open = true;
  const visible = element => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden';
  const sections = [];
  const counts = new Map();
  let current = { heading: '', n: 0, parts: [] };
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.matches(SKIP) || !visible(node) && getComputedStyle(node).display !== 'contents') return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
      return node.data.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    },
  });
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (!node.matches(HEADINGS)) continue;
      const heading = clean(node.textContent);
      if (!heading) continue;
      sections.push(current);
      const n = counts.get(heading) ?? 0;
      counts.set(heading, n + 1);
      // The pieces of the heading with spaces between them ("08 Define loss…", not "08Define loss…").
      const pieces = [];
      const inner = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      for (let text = inner.nextNode(); text; text = inner.nextNode()) pieces.push(text.data);
      const shown = clean(pieces.join(' ')).replace(/^[^\p{L}\p{N}]+\s*/u, '');
      current = { heading, title: shown && shown !== heading ? shown : undefined, n, parts: [] };
    } else if (!node.parentElement.closest(HEADINGS)) current.parts.push(node.data);
  }
  sections.push(current);
  return sections.map(section => ({ heading: section.heading, title: section.title, n: section.n, text: clean(section.parts.join(' ')).slice(0, 4000) }))
    .filter(section => section.heading || section.text);
}

/** Runs in the page: the groups of tabs or steps inside the content, as lists of button labels. */
function switchers(rootSelector) {
  const SKIP = 'header.topbar, nav, .workspace-tabs, .ft-rail, .ft-part-tabs, [aria-hidden="true"], .site-search-backdrop';
  const clean = text => (text ?? '').replace(/\s+/g, ' ').trim();
  const root = document.querySelector(rootSelector);
  if (!root) return [];
  const groups = new Set([...root.querySelectorAll('[role="tablist"]')]);
  for (const button of root.querySelectorAll('button[aria-current="step"]')) groups.add(button.parentElement);
  return [...groups].filter(group => !group.closest(SKIP) && group.getClientRects().length).map(group => {
    const buttons = [...group.querySelectorAll(':scope > button, :scope > [role="tab"], :scope > * > button')].filter(button => clean(button.textContent));
    const name = button => (button.innerText ?? '').split('\n').map(clean).find(line => line && !/^\d+$/.test(line)) ?? clean(button.textContent);
    // A part list or a step rail names a section; a small tab group inside a section does not.
    const primary = group.getAttribute('aria-orientation') === 'vertical' || Boolean(group.querySelector('button[aria-current="step"]'));
    return buttons.map(button => ({ label: clean(button.textContent), name: name(button), primary, on: button.getAttribute('aria-selected') === 'true' || button.getAttribute('aria-current') === 'step' || button.classList.contains('on') || button.classList.contains('current') }));
  }).filter(buttons => buttons.length > 1 && buttons.length <= 24);
}

async function clickLabel(page, rootSelector, label) {
  const ok = await page.evaluate(([rootSelector, label]) => {
    const clean = text => (text ?? '').replace(/\s+/g, ' ').trim();
    const button = [...(document.querySelector(rootSelector)?.querySelectorAll('button, [role="tab"]') ?? [])]
      .find(item => clean(item.textContent) === label && item.getClientRects().length);
    button?.click();
    return Boolean(button);
  }, [rootSelector, label]);
  await pause(ok ? 260 : 0);
  return ok;
}

async function crawl(language) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.on('dialog', dialog => dialog.dismiss());
  await page.goto(`${URL_BASE}/`);
  if (language === 'ar') await page.getByRole('button', { name: 'العربية' }).click();
  await pause(600);

  const places = [];
  const entries = [];
  const seen = new Set();
  const record = async (place, rootSelector) => {
    const sections = await page.evaluate(harvest, rootSelector);
    let index = -1;
    for (const section of sections) {
      const key = `${section.heading}|${section.text}`;
      if (seen.has(key) || (!section.text && !section.heading)) continue;
      seen.add(key);
      if (index < 0) { index = places.length; places.push(place); }
      entries.push({ place: index, heading: section.heading, ...(section.title ? { title: section.title } : {}), n: section.n, text: section.text });
    }
  };
  /** Record the page as it is, then every other tab or step in each group, one at a time. */
  const visit = async (place, rootSelector = 'main') => {
    const groups = await page.evaluate(switchers, rootSelector);
    // What shows first still needs its tab or step pressed when the student is elsewhere.
    const starts = groups.map(group => group.find(button => button.on)).filter(Boolean);
    await record(starts.length ? { ...place, clicks: starts.map(button => button.label), crumbs: [...place.crumbs, ...starts.filter(button => button.primary).map(button => button.name)] } : place, rootSelector);
    for (const group of groups) {
      const start = group.find(button => button.on);
      for (const button of group) {
        if (button === start) continue;
        if (!await clickLabel(page, rootSelector, button.label)) continue;
        await record({ ...place, clicks: [button.label], crumbs: [...place.crumbs, button.name] }, rootSelector);
      }
      if (start) await clickLabel(page, rootSelector, start.label);
    }
  };

  const labButtons = page.locator('.workspace-tabs button');
  if (await labButtons.count() !== LABS.length) throw new Error(`Expected ${LABS.length} lab buttons.`);
  for (const [i, lab] of LABS.entries()) {
    await labButtons.nth(i).click();
    await pause(900);
    const labName = nameOf(await labButtons.nth(i).innerText());
    process.stdout.write(`${language} · ${labName}\n`);
    if (lab !== 'finetune') { await visit({ lab, crumbs: [labName] }); continue; }

    const rail = page.locator('.ft-rail button');
    const count = await rail.count();
    for (let j = 0; j < count; j++) {
      await rail.nth(j).click();
      await pause(400);
      const part = j < count - 2 ? j : j === count - 2 ? 100 : 101;
      const partName = (await rail.nth(j).getAttribute('aria-label')) ?? (await rail.nth(j).locator('strong').innerText()).trim();
      const tabs = page.locator('.ft-part-tabs [role="tab"]');
      const tabCount = await tabs.count();
      if (!tabCount) { await visit({ lab, part, crumbs: [labName, partName] }); continue; }
      const keys = tabCount === 3 ? ['watch', 'try', 'remember'] : ['try', 'remember'];
      for (let k = 0; k < tabCount; k++) {
        await tabs.nth(k).click();
        await pause(350);
        const tabName = nameOf(await tabs.nth(k).locator('strong').innerText());
        await visit({ lab, part, tab: keys[k], crumbs: [labName, partName, tabName] });
      }
    }
  }

  // The lecture videos, the library and the glossary.
  for (const [lab, name] of [['watch', language === 'ar' ? /شاهد|مشاهدة/ : /^Watch$/], ['library', language === 'ar' ? /المكتبة/ : /^Library$/]]) {
    const button = page.locator('.top-actions button').filter({ hasText: name }).first();
    await button.click();
    await pause(700);
    await record({ lab, crumbs: [nameOf(await button.innerText())] }, 'main');
    await button.click();
    await pause(300);
  }
  const glossary = page.locator('.top-actions button').filter({ hasText: language === 'ar' ? /المصطلحات|المسرد/ : /^Glossary$/ }).first();
  await glossary.click();
  await pause(500);
  await record({ lab: 'glossary', crumbs: [nameOf(await glossary.innerText())] }, 'dialog[open]');
  await context.close();
  return { language, built: new Date().toISOString().slice(0, 10), places, entries };
}

try {
  for (const language of ['en', 'ar']) {
    const index = await crawl(language);
    const file = join(OUT, `search-index.${language}.json`);
    writeFileSync(file, JSON.stringify(index));
    console.log(`${language}: ${index.entries.length} entries in ${index.places.length} places → ${file}`);
  }
} finally {
  await browser.close();
  stop();
}
