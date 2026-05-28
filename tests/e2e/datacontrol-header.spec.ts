import { expect, test, type Locator, type Page } from '@playwright/test';

// ─── Helpers ────────────────────────────────────────────────────────────────

async function waitForGridData(page: Page, requireDataRows = true): Promise<void> {
  await page.waitForSelector('[role="grid"]', { timeout: 30000 });
  if (requireDataRows) {
    await page.waitForFunction(() => {
      const grid = document.querySelector('[role="grid"]');
      return Boolean(grid && grid.querySelectorAll('[role="row"]').length > 1);
    }, { timeout: 30000 });
  }
}

async function waitForGridStable(page: Page): Promise<void> {
  // Wait for loading indicator to disappear and row count to stabilise
  await page.waitForTimeout(600);
}

async function searchWithHeader(page: Page, term: string): Promise<void> {
  const searchInput = page.locator('input[placeholder*="Find in"]').first();
  await expect(searchInput).toBeVisible({ timeout: 10000 });
  await searchInput.fill(term);
  await page.waitForTimeout(1400);
}

/** Opens the filter/columns popover and waits until the panel is visible. */
async function openFilterDialog(page: Page): Promise<void> {
  const filterButton = page.locator('button:has-text("Filter & Columns")').first();
  await expect(filterButton).toBeVisible({ timeout: 10000 });
  await filterButton.click();
  await expect(page.locator('text=Visible Columns').first()).toBeVisible({ timeout: 10000 });
}

/**
 * Fill one filter row at the given index (0-based) inside the already-open
 * filter panel.  Does NOT click Save.
 */
async function fillFilterRow(
  page: Page,
  rowIndex: number,
  args: { column: string; operator: string; value?: string },
): Promise<void> {
  const columnCombos = page.getByRole('combobox', { name: 'Column' });
  const operatorCombos = page.getByRole('combobox', { name: 'Operator' });

  await columnCombos.nth(rowIndex).click();
  let listbox = page.getByRole('listbox');
  if ((await listbox.count()) === 0) {
    await columnCombos.nth(rowIndex).press('ArrowDown');
  }
  await expect(listbox).toBeVisible({ timeout: 10000 });
  await listbox.getByRole('option', { name: args.column, exact: true }).click();

  await operatorCombos.nth(rowIndex).click();
  listbox = page.getByRole('listbox');
  if ((await listbox.count()) === 0) {
    await operatorCombos.nth(rowIndex).press('ArrowDown');
  }
  await expect(listbox).toBeVisible({ timeout: 10000 });
  await listbox.getByRole('option', { name: args.operator, exact: true }).click();

  if (args.value !== undefined) {
    const valueCombos = page.getByLabel('Value');
    await valueCombos.nth(rowIndex).fill(args.value);
  }
}

/**
 * Open the filter panel, apply a single filter, and save.
 * Replaces any previously open panel if present.
 */
async function applyFilter(
  page: Page,
  args: { column: string; operator: string; value?: string },
): Promise<void> {
  await openFilterDialog(page);
  await fillFilterRow(page, 0, args);
  await page.locator('button:has-text("Save")').first().click();
  await waitForGridStable(page);
}

/**
 * Open filter panel, set TWO filter rows (adding the second with "Add Filter"),
 * then Save.  Returns with the panel closed.
 */
async function applyTwoFilters(
  page: Page,
  first: { column: string; operator: string; value?: string },
  second: { column: string; operator: string; value?: string },
  logicOperator: 'AND' | 'OR' = 'AND',
): Promise<void> {
  await openFilterDialog(page);

  // First row is always pre-populated
  await fillFilterRow(page, 0, first);

  // Add a second filter row
  await page.locator('button:has-text("Add Filter")').first().click();

  // Fill the second row (index 1)
  await fillFilterRow(page, 1, second);

  // Optionally change logic operator
  if (logicOperator === 'OR') {
    const logicCombo = page.getByRole('combobox', { name: 'Logic' });
    await logicCombo.click();
    const listbox = page.getByRole('listbox');
    if ((await listbox.count()) === 0) {
      await logicCombo.press('ArrowDown');
    }
    await expect(listbox).toBeVisible({ timeout: 10000 });
    await listbox.getByRole('option', { name: 'OR', exact: true }).click();
  }

  await page.locator('button:has-text("Save")').first().click();
  await waitForGridStable(page);
}

async function clearFilterDraftAndSave(page: Page): Promise<void> {
  await openFilterDialog(page);
  await page.locator('button:has-text("Clear")').first().click();
  await page.locator('button:has-text("Save")').first().click();
  await page.waitForTimeout(1000);
}

function dataRows(page: Page): Locator {
  return page.locator('[role="row"]').filter({ hasNotText: 'ID' });
}

async function readIdentifierFromFirstDataRow(page: Page, prefix: string): Promise<string> {
  const cells = page.locator('[role="row"]').nth(1).locator('[role="gridcell"]');
  const cellTexts = await cells.allInnerTexts();
  const found = cellTexts
    .map((text) => text.trim())
    .find((text) => text.toLowerCase().startsWith(prefix.toLowerCase()));
  if (!found) {
    throw new Error(`Could not find identifier starting with "${prefix}" in first data row`);
  }
  return found;
}

/** Returns the active filter count shown in the button label, or 0 if none. */
async function activeFilterCount(page: Page): Promise<number> {
  const btn = page.locator('button:has-text("Filter & Columns (")').first();
  const visible = await btn.isVisible();
  if (!visible) return 0;
  const text = await btn.innerText();
  const m = text.match(/\((\d+)\)/);
  return m ? parseInt(m[1], 10) : 0;
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function quickFilterButton(page: Page, headerName: string): Locator {
  const escaped = escapeRegex(headerName);
  return page.getByRole('button', {
    name: new RegExp(`(Quick filter for|Edit filter for) ${escaped}`),
  }).first();
}

async function openQuickFilterPopover(page: Page, headerName: string): Promise<Locator> {
  const button = quickFilterButton(page, headerName);
  await expect(button).toBeVisible({ timeout: 10000 });
  await button.click();
  const input = page.locator(`input[placeholder^="Filter ${headerName}"]`).first();
  await expect(input).toBeVisible({ timeout: 10000 });
  return input;
}

async function applyQuickColumnFilter(page: Page, headerName: string, value: string): Promise<void> {
  const input = await openQuickFilterPopover(page, headerName);
  await input.fill(value);
  await input.press('Enter');
  await expect(input).toBeHidden({ timeout: 10000 });
  await waitForGridStable(page);
}

async function readCellValue(page: Page, rowIndex: number, field: string): Promise<string> {
  const row = page.locator('[role="row"]').nth(rowIndex);
  const cell = row.locator(`[role="gridcell"][data-field="${field}"]`).first();
  const text = await cell.innerText();
  return text.trim();
}

function pickSearchToken(text: string): string {
  const cleaned = text.replace(/[^a-zA-Z0-9]+/g, ' ').trim();
  if (!cleaned) return 'a';
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const long = parts.find((part) => part.length >= 3);
  if (long) return long.slice(0, 6);
  return cleaned.slice(0, 4);
}

async function currentPageStart(page: Page): Promise<number> {
  const label = page.locator('.MuiTablePagination-displayedRows').first();
  await expect(label).toBeVisible({ timeout: 10000 });
  const text = (await label.innerText()).trim();
  const match = text.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

test.describe('DataControlHeader - biochem operator matrix', () => {
  test('reactions supports search + operator filters + highlight', async ({ page }) => {
    await page.goto('/biochem/reactions');
    await waitForGridData(page);
    const reactionId = await readIdentifierFromFirstDataRow(page, 'rxn');
    const reactionContainsToken = reactionId.slice(-3);

    const baselineCount = await dataRows(page).count();
    expect(baselineCount).toBeGreaterThan(0);

    await searchWithHeader(page, 'atp');
    await expect(page.locator('[role="gridcell"] mark').first()).toBeVisible({ timeout: 8000 });
    await clearFilterDraftAndSave(page);

    await applyFilter(page, { column: 'ID', operator: 'starts with', value: 'rxn0' });
    expect(await dataRows(page).count()).toBeGreaterThan(0);

    await applyFilter(page, { column: 'ID', operator: 'contains', value: reactionContainsToken });
    const containsCount = await dataRows(page).count();
    expect(containsCount).toBeGreaterThan(0);

    await applyFilter(page, { column: 'ID', operator: 'equals', value: reactionId });
    const equalsCount = await dataRows(page).count();
    expect(equalsCount).toBeLessThanOrEqual(containsCount);
    await expect(page.locator('button:has-text("Filter & Columns (")').first()).toBeVisible();

    await applyFilter(page, { column: 'ID', operator: 'does not contain', value: 'rxn' });
    expect(await dataRows(page).count()).toBe(0);

    await applyFilter(page, { column: 'ID', operator: 'is not empty' });
    expect(await dataRows(page).count()).toBeGreaterThan(0);
  });

  test('compounds supports operator filters and no-match handling', async ({ page }) => {
    await page.goto('/biochem/compounds');
    await waitForGridData(page);
    const compoundId = await readIdentifierFromFirstDataRow(page, 'cpd');
    const compoundContainsToken = compoundId.slice(-3);

    await applyFilter(page, { column: 'ID', operator: 'starts with', value: 'cpd0' });
    expect(await dataRows(page).count()).toBeGreaterThan(0);

    await applyFilter(page, { column: 'ID', operator: 'contains', value: compoundContainsToken });
    const containsCount = await dataRows(page).count();
    expect(containsCount).toBeGreaterThan(0);

    await applyFilter(page, { column: 'ID', operator: 'equals', value: compoundId });
    const equalsCount = await dataRows(page).count();
    expect(equalsCount).toBeLessThanOrEqual(containsCount);
    await expect(page.locator('button:has-text("Filter & Columns (")').first()).toBeVisible();

    await applyFilter(page, { column: 'ID', operator: 'does not contain', value: 'cpd' });
    expect(await dataRows(page).count()).toBe(0);

    await applyFilter(page, { column: 'ID', operator: 'is not empty' });
    expect(await dataRows(page).count()).toBeGreaterThan(0);
  });

  // ── Multi-filter regression test ──────────────────────────────────────────
  test('reactions: multiple filters all persist after Save (regression for Popover-close bug)', async ({ page }) => {
    await page.goto('/biochem/reactions');
    await waitForGridData(page);

    // Apply two AND-combined filters: ID starts with "rxn0" AND Status is not empty
    await applyTwoFilters(
      page,
      { column: 'ID', operator: 'starts with', value: 'rxn0' },
      { column: 'Status', operator: 'is not empty' },
    );

    // Both filters must be active — button should show (2)
    expect(await activeFilterCount(page)).toBe(2);
    expect(await dataRows(page).count()).toBeGreaterThan(0);

    // Re-open and verify both rows are still populated (not reverted to one)
    await openFilterDialog(page);
    const columnCombos = page.getByLabel('Column');
    const count = await columnCombos.count();
    expect(count).toBe(2);

    // Both rows should have their column value set
    await expect(columnCombos.nth(0)).not.toHaveValue('');
    await expect(columnCombos.nth(1)).not.toHaveValue('');
    // Close without changing
    await page.locator('button:has-text("Cancel")').first().click();

    // Clear and verify count drops to 0
    await clearFilterDraftAndSave(page);
    expect(await activeFilterCount(page)).toBe(0);
  });

  test('reactions: OR-logic multi-filter broadens results vs AND', async ({ page }) => {
    await page.goto('/biochem/reactions');
    await waitForGridData(page);

    const baselineCount = await dataRows(page).count();

    // AND: ID starts with "rxn00001" (narrow)
    await applyTwoFilters(
      page,
      { column: 'ID', operator: 'starts with', value: 'rxn00001' },
      { column: 'Status', operator: 'is not empty' },
      'AND',
    );
    const andCount = await dataRows(page).count();
    expect(andCount).toBeGreaterThan(0);
    expect(andCount).toBeLessThanOrEqual(baselineCount);
    expect(await activeFilterCount(page)).toBe(2);

    // OR: same two filters — should return at least as many
    await applyTwoFilters(
      page,
      { column: 'ID', operator: 'starts with', value: 'rxn00001' },
      { column: 'Status', operator: 'is not empty' },
      'OR',
    );
    const orCount = await dataRows(page).count();
    expect(orCount).toBeGreaterThanOrEqual(andCount);
    expect(await activeFilterCount(page)).toBe(2);
  });

  test('reactions: quick column filter applies on Enter and syncs toolbar', async ({ page }) => {
    await page.goto('/biochem/reactions');
    await waitForGridData(page);

    const reactionId = await readIdentifierFromFirstDataRow(page, 'rxn');

    const quickInput = await openQuickFilterPopover(page, 'ID');
    await quickInput.fill(reactionId);
    await page.waitForTimeout(500);
    expect(await activeFilterCount(page)).toBe(0);
    await expect(page.getByRole('button', { name: /Quick filter for ID/i })).toBeVisible();

    await quickInput.press('Enter');
    await waitForGridStable(page);
    expect(await activeFilterCount(page)).toBe(1);
    await expect(page.getByRole('button', { name: /Edit filter for ID/i })).toBeVisible();

    await openFilterDialog(page);
    const valueInputs = page.getByLabel('Value');
    await expect(valueInputs.first()).toBeVisible({ timeout: 10000 });
    await expect(valueInputs.first()).toHaveValue(reactionId);
    await page.locator('button:has-text("Cancel")').first().click();

    await searchWithHeader(page, 'atp');
    expect(await activeFilterCount(page)).toBe(1);
    await expect(page.getByRole('button', { name: /Edit filter for ID/i })).toBeVisible();
  });

  test('reactions: quick column filters stack, remain in editor, and reset pagination', async ({ page }) => {
    await page.goto('/biochem/reactions');
    await waitForGridData(page);

    const nextPageButton = page.locator('button[aria-label="Go to next page"]');
    const pageStartBefore = await currentPageStart(page);
    if (await nextPageButton.isEnabled()) {
      await nextPageButton.click();
      await waitForGridStable(page);
    }
    const pageStartAfter = await currentPageStart(page);
    if (await nextPageButton.isEnabled()) {
      expect(pageStartAfter).toBeGreaterThan(pageStartBefore);
    }

    const reactionId = await readCellValue(page, 1, 'id');
    const reactionName = await readCellValue(page, 1, 'name');
    const nameToken = pickSearchToken(reactionName);

    await applyQuickColumnFilter(page, 'ID', reactionId);
    const pageStartFiltered = await currentPageStart(page);
    expect(pageStartFiltered).toBe(1);
    expect(await activeFilterCount(page)).toBe(1);

    const rowsAfterFirst = await dataRows(page).count();

    await applyQuickColumnFilter(page, 'Name', nameToken);
    expect(await activeFilterCount(page)).toBe(2);
    const rowsAfterSecond = await dataRows(page).count();
    expect(rowsAfterSecond).toBeLessThanOrEqual(rowsAfterFirst);

    await openFilterDialog(page);
    const columnCombos = page.getByLabel('Column');
    expect(await columnCombos.count()).toBe(2);
    const valueInputs = page.getByLabel('Value');
    const valueTexts = [
      (await valueInputs.nth(0).inputValue()).trim(),
      (await valueInputs.nth(1).inputValue()).trim(),
    ];
    expect(valueTexts).toContain(reactionId);
    expect(valueTexts).toContain(nameToken);
    await page.locator('button:has-text("Cancel")').first().click();

    await openFilterDialog(page);
    await page.locator('button:has-text("Add Filter")').first().click();
    await fillFilterRow(page, 2, { column: 'Status', operator: 'is not empty' });
    await page.locator('button:has-text("Save")').first().click();
    await waitForGridStable(page);

    expect(await activeFilterCount(page)).toBe(3);
    await expect(page.getByRole('button', { name: /Edit filter for Status/i })).toBeVisible();
  });
});

test.describe('DataControlHeader - cross-page smoke', () => {
  test('list-media page supports search and filter dialog', async ({ page }) => {
    await page.goto('/list-media');
    await waitForGridData(page, false);
    await searchWithHeader(page, 'media');
    await openFilterDialog(page);
    await page.locator('button:has-text("Cancel")').first().click();
  });

  test('genomes page supports search and column visibility controls', async ({ page }) => {
    await page.goto('/genomes');
    await waitForGridData(page, false);
    await openFilterDialog(page);
    await page.locator('text=Visible Columns').first().click();
    await page.locator('button:has-text("Show all")').first().click();
    await page.locator('button:has-text("Save")').first().click();
    await searchWithHeader(page, 'plant');
    await expect(page.locator('input[placeholder*="Find in"]').first()).toHaveValue('plant');
  });

  test('genomes Annotations page shows subsystem search placeholder and filter dialog', async ({
    page,
  }) => {
    await page.goto('/genomes/Annotations');
    await waitForGridData(page, false);
    await expect(page.locator('input[placeholder*="Find in subsystems"]')).toBeVisible({
      timeout: 15000,
    });
    await openFilterDialog(page);
    await page.locator('button:has-text("Cancel")').first().click();
  });

  test('my-jobs grid uses toolbar pagination only (no duplicate footer)', async ({ page }) => {
    await page.goto('/my-jobs');

    // The page is auth-gated — in a headless unauthenticated context AuthGuard redirects
    // before the grid mounts.  We give the grid a short window to appear.
    const gridVisible = await page
      .waitForSelector('[role="grid"]', { timeout: 8000 })
      .then(() => true)
      .catch(() => false);

    const footers = page.locator('.MuiTablePagination-root');

    if (gridVisible) {
      // Authenticated: toolbar pagination only — no native MUI footer (hideFooter is set).
      await expect(footers).toHaveCount(1);
    } else {
      // Unauthenticated: auth-guard rendered, no grid, no pagination footer.
      await expect(footers).toHaveCount(0);
    }
  });
});
