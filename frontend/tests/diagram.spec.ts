import { expect, test } from '@playwright/test';

test('moves the signal arrow only with the value packet', async ({ page }) => {
  await page.goto('/');
  expect(await page.locator('.flow-arrow').count()).toBe(0);

  await page.getByRole('button', { name: 'Run forward pass' }).click();
  await page.waitForTimeout(600);
  expect(await page.locator('.flow-arrow').count()).toBeGreaterThan(0);

  const packetPhase = await page.locator('.flow-packet').first()
    .evaluate(element => getComputedStyle(element).getPropertyValue('--flow-phase'));
  const arrowPhase = await page.locator('.flow-arrow').first()
    .evaluate(element => getComputedStyle(element).getPropertyValue('--flow-phase'));
  expect(arrowPhase.trim()).toBe(packetPhase.trim());
  const arrowPath = await page.locator('.flow-arrow').first()
    .evaluate(element => getComputedStyle(element).offsetPath);
  expect(arrowPath).toContain('path(');
  const animation = await page.locator('.flow-arrow').first()
    .evaluate(element => getComputedStyle(element).animationName);
  expect(animation).toBe('packet-stream');
});

test('keeps the arrows moving with packets when reduced motion is requested', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Run forward pass' }).click();
  await page.waitForTimeout(600);
  const arrowAnimation = await page.locator('.flow-arrow').first()
    .evaluate(element => getComputedStyle(element).animationName);
  const packetAnimation = await page.locator('.flow-packet').first()
    .evaluate(element => getComputedStyle(element).animationName);
  expect(arrowAnimation).toBe('packet-stream');
  expect(packetAnimation).toBe('packet-stream');
});

test('expands the diagram to the viewport and restores it', async ({ page }) => {
  await page.goto('/');
  const canvas = page.locator('.diagram-canvas');
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('The viewport is missing.');

  await page.getByRole('button', { name: 'Expand diagram' }).click();
  await expect(canvas).toHaveClass(/expanded/);
  await expect(page.getByRole('button', { name: 'Exit full screen' })).toBeVisible();
  const box = await canvas.boundingBox();
  expect(box?.width).toBeCloseTo(viewport.width, 0);
  expect(box?.height).toBeCloseTo(viewport.height, 0);

  await page.getByRole('button', { name: 'Exit full screen' }).click();
  await expect(canvas).not.toHaveClass(/expanded/);
  await expect(page.getByRole('button', { name: 'Expand diagram' })).toBeVisible();
});

test('zooms, pans, and fits the network diagram', async ({ page }) => {
  await page.goto('/');
  const svg = page.locator('.network-svg');
  const initial = await svg.getAttribute('viewBox');
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await expect(page.locator('.diagram-zoom span[aria-live="polite"]')).toHaveText('125%');
  const zoomed = await svg.getAttribute('viewBox');
  expect(zoomed).not.toBe(initial);

  const box = await page.locator('.diagram-scroll').boundingBox();
  if (!box) throw new Error('The network diagram is missing.');
  await page.mouse.move(box.x + 15, box.y + box.height - 40);
  await page.mouse.down();
  await page.mouse.move(box.x + 95, box.y + box.height - 10, { steps: 5 });
  await page.mouse.up();
  await expect.poll(() => svg.getAttribute('viewBox')).not.toBe(zoomed);

  await page.getByRole('button', { name: 'Fit diagram' }).click();
  await expect(page.locator('.diagram-zoom span[aria-live="polite"]')).toHaveText('100%');
  await expect(svg).toHaveAttribute('viewBox', initial ?? '');

  // A plain wheel scrolls the page and must not zoom; Ctrl + wheel zooms.
  const hover = async () => {
    await page.locator('.diagram-scroll').scrollIntoViewIfNeeded();
    const shown = await page.locator('.diagram-scroll').boundingBox();
    if (!shown) throw new Error('The network diagram is missing.');
    await page.mouse.move(shown.x + shown.width / 2, shown.y + shown.height / 2);
  };
  await hover();
  await page.mouse.wheel(0, -180);
  await expect(page.locator('.diagram-zoom span[aria-live="polite"]')).toHaveText('100%');
  await hover();
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -180);
  await page.keyboard.up('Control');
  await expect(page.locator('.diagram-zoom span[aria-live="polite"]')).not.toHaveText('100%');
  await expect.poll(() => svg.getAttribute('viewBox')).not.toBe(initial);
  await page.getByRole('button', { name: 'Fit diagram' }).click();
  await expect(page.locator('.diagram-zoom span[aria-live="polite"]')).toHaveText('100%');
  await expect(svg).toHaveAttribute('viewBox', initial ?? '');
});
