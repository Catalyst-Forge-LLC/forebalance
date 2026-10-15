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
