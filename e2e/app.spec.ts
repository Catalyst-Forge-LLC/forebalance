import { test, expect, type Page } from '@playwright/test';

const raw = 'B-CHCK-main|2026-10-01|2500|Private balance\nD|2026-10-02,R|100|Rent';
async function seed(page: Page) {
  await page.goto('/');
  await page.evaluate((text) => {
    localStorage.clear();
    localStorage.setItem(
      'forebalance_entrySets',
      JSON.stringify({
        activeId: 'a',
        sets: [
          { id: 'a', name: 'Primary', raw: text },
          { id: 'b', name: 'Other', raw: 'B-CHCK-main|2026-10-01|800|Other balance' },
        ],
      }),
    );
  }, raw);
  await page.goto('/#entries');
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Scenario', exact: true })).toHaveValue('a');
}

test('raw edits, clearing, reload, and scenario switching preserve the correct owner', async ({ page }) => {
  await seed(page);
  await page.getByRole('button', { name: 'Raw', exact: true }).click();
  const editor = page.locator('.cm-content');
  await editor.fill(raw.replace('2500', '3100'));
  await page.getByRole('combobox', { name: 'Scenario', exact: true }).selectOption('b');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('forebalance_entrySets')!).sets[0].raw)).toContain('3100');
  await page.getByRole('combobox', { name: 'Scenario', exact: true }).selectOption('a');
  await expect(editor).toContainText('3100');
  await editor.fill('');
  await page.getByRole('link', { name: 'Forecast', exact: true }).click();
  await page.reload();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('forebalance_entrySets')!).sets[0].raw)).toBe('');
});

test('fragment shares never send scenario text in network URLs', async ({ page }) => {
  const urls: string[] = [];
  page.on('request', (request) => urls.push(request.url()));
  page.on('dialog', (dialog) => dialog.accept());
  await page.goto('/#entries?' + new URLSearchParams({ share: raw }));
  await expect.poll(() => page.evaluate(() => localStorage.getItem('rawEntries'))).toBe(raw);
  expect(urls.every((url) => !url.includes('share=') && !url.includes('Private'))).toBe(true);
  expect(new URL(page.url()).hash).toBe('#entries');
});

test('malformed settings recover without replacing saved entries', async ({ page }) => {
  await seed(page);
  await page.evaluate(() => localStorage.setItem('settings', '{broken'));
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('recovery');
  expect(await page.evaluate(() => localStorage.getItem('rawEntries'))).toBe(raw);
});

test('file import confirms replacement and survives reload', async ({ page }) => {
  await seed(page);
  await page.locator('input[type=file]').setInputFiles({ name: 'import.psv', mimeType: 'text/plain', buffer: Buffer.from(raw.replace('2500', '4200')) });
  await page.getByRole('button', { name: 'Replace scenario', exact: true }).click();
  await page.getByRole('button', { name: 'Use this currency', exact: true }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('rawEntries'))).toContain('4200');
  await page.reload();
  expect(await page.evaluate(() => localStorage.getItem('rawEntries'))).toContain('4200');
});

test('entry dialog supports Escape and mobile layout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page);
  await page.getByText('Rent', { exact: true }).first().click();
  await expect(page.getByRole('dialog', { name: 'Edit entry' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Edit entry' })).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('recurrence editing round trips to PSV and exports a copy', async ({ page }) => {
  await seed(page);
  await page.getByText('Rent', { exact: true }).first().click();
  await page.getByRole('tab', { name: 'When', exact: true }).click();
  await page.getByRole('radio', { name: 'Weekly', exact: true }).click();
  await page.getByRole('button', { name: 'Save and close', exact: true }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('rawEntries'))).toContain(',RW');
  await page.getByRole('button', { name: 'Scenario actions', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: 'Export', exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/\.psv$/);
});

test('editor and local AI stay out of the initial network requests', async ({ page }) => {
  const { readFileSync } = await import('node:fs');
  const manifest = JSON.parse(readFileSync('.svelte-kit/output/client/.vite/manifest.json', 'utf8'));
  const editorFile = manifest['src/components/PsvEditor.svelte'].file;
  const aiFile = manifest['src/lib/labs/webllmSession.ts'].file;
  const urls: string[] = [];
  page.on('request', (request) => urls.push(request.url()));
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Sections' }).getByRole('link', { name: 'Entries', exact: true })).toBeVisible();
  expect(urls.some((url) => url.endsWith(editorFile) || url.endsWith(aiFile) || url.includes('webllm.worker'))).toBe(false);
  await page.getByRole('navigation', { name: 'Sections' }).getByRole('link', { name: 'Entries', exact: true }).click();
  await page.getByRole('button', { name: 'Raw', exact: true }).click();
  await expect(page.locator('.cm-content')).toBeVisible();
  expect(urls.some((url) => url.endsWith(editorFile))).toBe(true);
});

test('unavailable browser storage still allows editing and exporting', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('blocked', 'SecurityError');
      },
    });
  });
  await page.goto('/#entries');
  await expect(page.getByRole('alert')).toContainText('storage');
  await page.getByRole('button', { name: 'Raw', exact: true }).click();
  await page.locator('.cm-content').fill(raw);
  await page.getByRole('link', { name: 'Forecast', exact: true }).click();
  await expect(page.locator('table')).toBeVisible();
});

test('scenario account names render as text in tooltips', async ({ page }) => {
  await seed(page);
  const hostile = 'B-CHCK-main|2026-10-01|5000|Checking\nD-CO|2026-10-18,R|500|<img src=x onerror=alert(1)>|CO|1000|0';
  await page.getByRole('button', { name: 'Raw', exact: true }).click();
  await page.locator('.cm-content').fill(hostile);
  await page.getByRole('link', { name: 'Forecast', exact: true }).click();
  await page.locator('table .tooltip-wrapper').filter({ hasText: '<img' }).first().hover();
  const tooltip = page.getByRole('tooltip');
  await expect(tooltip).toBeVisible();
  await expect(tooltip.locator('img')).toHaveCount(0);
  await expect(tooltip).toContainText('<img');
});

test('static document routes refresh and return through reactive section links', async ({ page }) => {
  for (const path of ['/about', '/privacy']) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await page.reload();
    const entries = page.getByRole('navigation', { name: 'Sections' }).getByRole('link', { name: 'Entries', exact: true });
    await expect(entries).toHaveAttribute('href', '/#entries');
    await entries.click();
    await expect(page).toHaveURL(/\/#entries$/);
    await expect(entries).toHaveAttribute('href', '#entries');
    await expect(page.getByRole('button', { name: 'Raw', exact: true })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(path + '$'));
    await expect(entries).toHaveAttribute('href', '/#entries');
    await page.goForward();
    await expect(page).toHaveURL(/\/#entries$/);
    await expect(entries).toHaveAttribute('href', '#entries');
  }
});

test('document dialogs and repeated tab selection retain drafts and router history', async ({ page }) => {
  await seed(page);
  await page.getByRole('button', { name: 'Raw', exact: true }).click();
  const editor = page.locator('.cm-content');
  await editor.fill(raw.replace('2500', '7300'));
  await page.getByRole('button', { name: 'Site menu', exact: true }).click();
  await page.getByRole('menuitem', { name: 'About', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'About', exact: true })).toBeVisible();
  const routerState = await page.evaluate(() => history.state);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).toHaveURL(/#entries$/);
  await expect(editor).toContainText('7300');
  // Tab replacements must retain Kit's history bookkeeping.
  await page.getByRole('link', { name: 'Forecast', exact: true }).click();
  await page.getByRole('link', { name: 'Forecast', exact: true }).click();
  const state = await page.evaluate(() => history.state);
  expect(state).toEqual(expect.objectContaining(routerState));
  await page.getByRole('navigation', { name: 'Sections' }).getByRole('link', { name: 'Entries', exact: true }).click();
  await expect(editor).toContainText('7300');
  await page.reload();
  await page.getByRole('button', { name: 'Raw', exact: true }).click();
  await expect(page.locator('.cm-content')).toContainText('7300');
});

test('legacy query shares are consumed once and leave navigation usable', async ({ page }) => {
  page.on('dialog', (dialog) => dialog.accept());
  await page.goto('/?' + new URLSearchParams({ share: raw }));
  await expect.poll(() => page.evaluate(() => localStorage.getItem('rawEntries'))).toBe(raw);
  await expect(page).toHaveURL(/\/#entries$/);
  await page.getByRole('link', { name: 'Forecast', exact: true }).click();
  await expect(page.locator('table')).toBeVisible();
  await page.reload();
  await expect(page.locator('table')).toBeVisible();
});

test('forecast scrolls months while scenario controls remain fixed', async ({ page }) => {
  await page.goto('/#forecast');
  const region = page.getByRole('region', { name: 'Forecast months' });
  await expect(region).toBeVisible();
  const bar = page.getByRole('combobox', { name: 'Scenario', exact: true });
  const before = await bar.boundingBox();
  await region.focus();
  await page.keyboard.press('PageDown');
  await expect.poll(() => region.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
  expect((await bar.boundingBox())!.y).toBe(before!.y);
  expect(await page.locator('.tab-panel').evaluate((node) => node.scrollTop)).toBe(0);
});

test('settings sections expose all options and retain changes', async ({ page }) => {
  await page.goto('/#settings');
  await page.getByRole('button', { name: 'Forecast thresholds', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Forecast thresholds' })).toBeVisible();
  const months = page.getByRole('spinbutton', { name: 'Months to forecast' });
  await months.fill('9');
  await months.press('Tab');
  await page.getByRole('button', { name: 'Categories', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Forecast thresholds' })).toHaveCount(0);
  await page.getByRole('textbox', { name: 'New category', exact: true }).fill('Travel');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Rename Travel' })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Forecast thresholds', exact: true }).click();
  await expect(months).toHaveValue('9');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('combobox', { name: 'Settings section' }).selectOption('reset');
  await expect(page.getByRole('heading', { name: 'Reset', exact: true })).toBeVisible();
});

test('help topics and Labs tasks use the shared section navigation', async ({ page }) => {
  await page.goto('/#when');
  await expect(page.getByRole('heading', { name: 'WHEN', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Scenarios', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Scenarios', exact: true })).toBeVisible();
  await page.goto('/#labs');
  await page.getByRole('button', { name: 'Draft entries', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Draft entries from a description' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Go to model setup' })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('combobox', { name: 'Labs section' }).selectOption('question');
  await expect(page.getByRole('textbox', { name: 'A format question, or your own' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
