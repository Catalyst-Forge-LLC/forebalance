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

test('What hits next reads dated transactions without a model', async ({ page }) => {
  page.on('dialog', (dialog) => dialog.accept());
  const scenario = 'B-CHCK-main|2099-11-01|2500|Starting balance\nD|2099-11-02|300|Workshop rent\nC|2099-11-03|500|Client invoice';
  await page.goto('/#entries?' + new URLSearchParams({ share: scenario }));
  await expect.poll(() => page.evaluate(() => localStorage.getItem('rawEntries'))).toBe(scenario);
  await page.goto('/#labs');
  await page.getByRole('button', { name: 'Explore forecast', exact: true }).click();
  await page.getByRole('button', { name: 'What hits next?', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Result · What hits next?' })).toBeFocused();
  await expect(page.locator('.output pre')).toContainText('Workshop rent · Debit $300 → projected balance $2,200');
  await expect(page.locator('.output pre')).toContainText('Client invoice · Credit $500 → projected balance $2,700');
});

test('Visual can add a credit without changing existing entries or saving canceled drafts', async ({ page }) => {
  await seed(page);
  await page.getByRole('button', { name: /^Credits \(/ }).click();
  const before = await page.evaluate(() => localStorage.getItem('rawEntries'));
  const add = page.getByRole('button', { name: 'Add entry', exact: true });
  await add.click();
  const form = page.getByRole('dialog', { name: 'Add entry' });
  await form.getByLabel('Description').fill('Canceled draft');
  await page.keyboard.press('Escape');
  await expect(form).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('rawEntries'))).toBe(before);
  await add.click();
  await expect(form.getByRole('radio', { name: 'Money in' })).toHaveAttribute('aria-checked', 'true');
  await form.getByLabel('Description').fill('Referral bonus');
  await form.getByLabel('Amount').fill('50+25');
  await form.getByRole('button', { name: 'Save entry' }).click();
  await expect(form).toHaveCount(0);
  await expect(page.getByText('Referral bonus', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Referral bonus', { exact: true })).toBeVisible();
  const after = await page.evaluate(() => localStorage.getItem('rawEntries'));
  expect(after).toContain(before + '\nC|');
  expect(after).toContain('|75|Referral bonus');
});

test('category bulk update saves both cards together and cancel leaves the scenario unchanged', async ({ page }) => {
  const card1 = 'D-VISA|2099-11-02,R|80|Visa|VISA|1200|20|fixed|||debt|keep|autopay|#2=75';
  const card2 = 'D-MC|2099-11-03,R|5|Mastercard|MC|900|15|pct|||debt';
  const source = ['B-main-main|2099-11-01|2500|Checking', card1, card2, 'D|2099-11-05|30|Food'].join('\n');
  page.on('dialog', (d) => d.accept());
  await page.goto('/#entries?' + new URLSearchParams({ share: source }));
  await expect.poll(() => page.evaluate(() => localStorage.getItem('rawEntries'))).toBe(source);
  const open = page.getByRole('button', { name: 'Balances & payments' });
  const dialog = page.getByRole('dialog', { name: 'Update balances and payments' });
  await open.click();
  const today = await page.evaluate(() => new Date().toLocaleDateString('sv-SE'));
  const visa = dialog.getByRole('row').filter({ has: page.getByRole('rowheader', { name: 'Visa', exact: true }) });
  const mc = dialog.getByRole('row').filter({ has: page.getByRole('rowheader', { name: 'Mastercard', exact: true }) });
  await expect(dialog.getByLabel('Category')).toHaveValue('debt');
  await expect(dialog.getByText('Food', { exact: true })).toHaveCount(0);
  await visa.getByLabel(/Balance today/).fill('950');
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  expect(await page.evaluate(() => localStorage.getItem('rawEntries'))).toBe(source);
  await open.click();
  await visa.getByLabel(/Balance today/).fill('950');
  await visa.getByLabel(/Scheduled payment/).fill('100');
  await mc.getByLabel(/Payment rate/).fill('120');
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(dialog.getByRole('alert')).toContainText('percentage');
  expect(await page.evaluate(() => localStorage.getItem('rawEntries'))).toBe(source);
  await mc.getByLabel(/Payment rate/).fill('6');
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('rawEntries')))
    .toBe(source.replace(card1, card1 + '|debt@' + today + '=950|pay@' + today + '=100').replace(card2, card2 + '|pay@' + today + '=6'));
});

test('Visual disables and enables reversibly and deletes only after confirmation', async ({ page }) => {
  await seed(page);
  const rent = page.locator('.cards .list > li').filter({ hasText: 'Rent' });
  async function choose(name: string) {
    await rent.getByRole('button', { name: 'Entry actions' }).click();
    await rent.getByRole('menuitem', { name, exact: true }).click();
  }
  const saved = () => page.evaluate(() => localStorage.getItem('rawEntries'));
  await choose('Disable');
  await expect.poll(saved).toBe(raw.replace('\nD|', '\n!D|'));
  await choose('Enable');
  await expect.poll(saved).toBe(raw);
  await choose('Delete');
  const dialog = page.getByRole('dialog', { name: 'Delete entry?' });
  await expect(dialog).toContainText('Rent');
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  expect(await saved()).toBe(raw);
  await choose('Delete');
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.reload();
  await expect.poll(saved).toBe(raw.split('\n')[0]);
  await expect(rent).toHaveCount(0);
});

test('group counts follow category changes, reloads, and the selected entry type', async ({ page }) => {
  await seed(page);
  const group = page.getByRole('combobox', { name: 'Category', exact: true });
  const option = (value: string) => group.locator('option[value="' + value + '"]');
  await expect(option('all')).toHaveText('All categories (2)');
  await expect(option('unfiled')).toHaveText('Unfiled (1)');
  const rent = page.locator('.list > li').filter({ hasText: 'Rent' });
  await rent.getByRole('button', { name: 'Entry actions' }).click();
  await rent.getByRole('menuitem', { name: 'Change category' }).hover();
  await page.getByRole('menuitemradio', { name: 'Housing', exact: true }).click();
  await expect(option('housing')).toHaveText('Housing (1)');
  await expect(option('unfiled')).toHaveText('Unfiled');
  await page.reload();
  await expect(option('housing')).toHaveText('Housing (1)');
  await group.selectOption('housing');
  await expect(rent).toBeVisible();
  await page.getByRole('button', { name: /^Credits \(/ }).click();
  await expect(option('housing')).toHaveText('Housing');
  await expect(option('all')).toHaveText('All categories');
  await expect(rent).toHaveCount(0);
});

test('category upgrade preserves assignments, custom names and subsequent deletions', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.removeItem('forebalance.categories.v3');
    localStorage.removeItem('forebalance.categories.v2');
    localStorage.setItem(
      'forebalance.categories.v1',
      JSON.stringify([
        { id: 'debt', name: 'My loans' },
        { id: 'shows', name: 'Entertainment' },
      ]),
    );
  });
  await page.goto('/#settings');
  await page.reload();
  await page.getByRole('button', { name: 'Categories', exact: true }).click();
  const rename = (name: string) => page.getByRole('textbox', { name: 'Rename ' + name, exact: true });
  await expect(rename('My loans')).toBeVisible();
  await expect(rename('Entertainment')).toHaveCount(1);
  await expect(rename('Health & medical')).toBeVisible();
  await expect(rename('Utilities')).toHaveCount(0);
  await expect(rename('Credit cards')).toBeVisible();
  page.once('dialog', (d) => d.accept());
  await rename('Insurance').locator('..').getByRole('button', { name: 'Delete' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Categories', exact: true }).click();
  await expect(rename('Insurance')).toHaveCount(0);
  await expect(rename('Credit cards')).toBeVisible();
});

test('link confirmation preserves the currency step, writes the file, and restores the handle', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'File System Access picker is a Chromium feature');
  await seed(page);
  await page.evaluate(async () => {
    const handle = await (await navigator.storage.getDirectory()).getFileHandle('qa.psv', { create: true });
    const writer = await handle.createWritable();
    await writer.write('B-CH-main|2026-11-01|1220|Linked QA');
    await writer.close();
    window.showOpenFilePicker = async () => [handle];
  });
  await page.getByRole('button', { name: 'Scenario actions' }).click();
  await page.getByRole('menuitem', { name: 'Link file…' }).click();
  await page.getByRole('button', { name: 'Load entries' }).click();
  await page.getByRole('button', { name: 'Use this currency' }).click();
  await page.getByRole('button', { name: 'Raw', exact: true }).click();
  const editor = page.locator('.cm-content');
  await expect(editor).toContainText('Linked QA');
  await editor.fill('B-CH-main|2026-11-01|1930|Linked revision');
  await expect
    .poll(() => page.evaluate(async () => (await (await (await navigator.storage.getDirectory()).getFileHandle('qa.psv')).getFile()).text()))
    .toContain('1930');
  await page.reload();
  await page.getByRole('button', { name: 'Scenario actions' }).click();
  await expect(page.getByRole('menuitem', { name: 'Unlink qa.psv' })).toBeVisible();
});

test('selectively merge a fork into its original without changing the fork', async ({ page }) => {
  await seed(page);
  const menu = page.getByRole('button', { name: 'Scenario actions' });
  await menu.click();
  await page.getByRole('menuitem', { name: 'Fork what-if…' }).click();
  await page.getByRole('button', { name: 'Fork', exact: true }).click();
  const select = page.getByRole('combobox', { name: 'Scenario', exact: true });
  const fork = await select.inputValue();
  await page.getByRole('button', { name: 'Raw', exact: true }).click();
  const editor = page.locator('.cm-content');
  const child = raw.replace('|100|Rent', '|125|Rent') + '\nD|2026-10-05|40|Books';
  await editor.fill(child);
  await select.selectOption('a');
  await page.getByRole('button', { name: 'Raw', exact: true }).click();
  await editor.fill(raw.replace('2500', '3100'));
  await select.selectOption(fork);
  await menu.click();
  await page.getByRole('menuitem', { name: 'Merge into original…' }).click();
  const dialog = page.getByRole('dialog', { name: 'Merge into original' });
  await dialog.getByRole('checkbox', { name: /Update · Rent/ }).check();
  await dialog.getByRole('button', { name: 'Apply 1 change to Primary' }).click();
  await page.getByRole('button', { name: 'Open original' }).click();
  await expect(select).toHaveValue('a');
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('forebalance_entrySets')!).sets.map((s: { raw: string }) => s.raw)))
    .toEqual([raw.replace('2500', '3100').replace('|100|Rent', '|125|Rent'), 'B-CHCK-main|2026-10-01|800|Other balance', child]);
});
