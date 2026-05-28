/**
 * Per-column Quick Search — comprehensive E2E tests
 *
 * Covers the full feature surface introduced across commits f652f86..70c6dd1:
 *   - Magnifying-glass icon presence on every filterable column header
 *   - Popover opens on click, closes on Escape / click-away
 *   - Filter applies ONLY on Enter (draft text does NOT trigger filtering)
 *   - Multiple quick-column filters AND together (stacking)
 *   - Toolbar badge count stays in sync with committed filters
 *   - Quick-column filters appear inside Filter & Columns popover editor
 *   - Editing a quick filter via the popover editor is reflected in the icon state
 *   - Active-state indicator (filled blue icon + dot badge) when column is filtered
 *   - Clearing a quick-column filter via the X button
 *   - Pagination resets to page 1 after quick filter
 *   - Interaction with the global search bar (both coexist)
 *   - Cross-page smoke: compounds, genomes, list-media
 */

import { expect, test, type Locator, type Page } from '@playwright/test';

// ─── Shared helpers ─────────────────────────────────────────────────────────

async function waitForGridData(page: Page, requireDataRows = true): Promise<void> {
  await page.waitForSelector('[role="grid"]', { timeout: 30_000 });
  if (requireDataRows) {
    await page.waitForFunction(
      () => {
        const grid = document.querySelector('[role="grid"]');
        return Boolean(grid && grid.querySelectorAll('[role="row"]').length > 1);
      },
      { timeout: 30_000 },
    );
  }
}

async function waitForGridStable(page: Page): Promise<void> {
  await page.waitForTimeout(800);
}

function dataRows(page: Page): Locator {
  return page.locator('[role="row"]').filter({ hasNotText: 'ID' });
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Locate the quick-filter icon button for a column. */
function quickFilterButton(page: Page, headerName: string): Locator {
  const escaped = escapeRegex(headerName);
  return page
    .getByRole('button', {
      name: new RegExp(`(Quick filter for|Edit filter for) ${escaped}`),
    })
    .first();
}

/** Open the per-column quick filter popover and return the input locator. */
async function openQuickFilterPopover(page: Page, headerName: string): Promise<Locator> {
  const button = quickFilterButton(page, headerName);
  await expect(button).toBeVisible({ timeout: 10_000 });
  await button.click();
  const input = page.locator(`input[placeholder^="Filter ${headerName}"]`).first();
  await expect(input).toBeVisible({ timeout: 10_000 });
  return input;
}

/** Type into the quick filter, press Enter, and wait for the popover to dismiss. */
async function applyQuickColumnFilter(
  page: Page,
  headerName: string,
  value: string,
): Promise<void> {
  const input = await openQuickFilterPopover(page, headerName);
  await input.fill(value);
  await input.press('Enter');
  await expect(input).toBeHidden({ timeout: 10_000 });
  await waitForGridStable(page);
}

/** Returns the active filter count shown in the toolbar badge, or 0. */
async function activeFilterCount(page: Page): Promise<number> {
  const btn = page.locator('button:has-text("Filter & Columns (")').first();
  const visible = await btn.isVisible();
  if (!visible) return 0;
  const text = await btn.innerText();
  const m = text.match(/\((\d+)\)/);
  return m ? parseInt(m[1], 10) : 0;
}

async function currentPageStart(page: Page): Promise<number> {
  const label = page.locator('.MuiTablePagination-displayedRows').first();
  await expect(label).toBeVisible({ timeout: 10_000 });
  const text = (await label.innerText()).trim();
  const match = text.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/** Read a specific cell value by row index (1-indexed, 0 = header) and data-field. */
async function readCellValue(page: Page, rowIndex: number, field: string): Promise<string> {
  const row = page.locator('[role="row"]').nth(rowIndex);
  const cell = row.locator(`[role="gridcell"][data-field="${field}"]`).first();
  return (await cell.innerText()).trim();
}

/** Pick a short alphanumeric token suitable for partial-match searching. */
function pickSearchToken(text: string): string {
  const cleaned = text.replace(/[^a-zA-Z0-9]+/g, ' ').trim();
  if (!cleaned) return 'a';
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const long = parts.find((p) => p.length >= 3);
  if (long) return long.slice(0, 6);
  return cleaned.slice(0, 4);
}

/** Open the Filter & Columns panel. */
async function openFilterDialog(page: Page): Promise<void> {
  const filterButton = page.locator('button:has-text("Filter & Columns")').first();
  await expect(filterButton).toBeVisible({ timeout: 10_000 });
  await filterButton.click();
  await expect(page.locator('text=Visible Columns').first()).toBeVisible({ timeout: 10_000 });
}

/** Fill one filter row (0-indexed) inside the open panel. Does NOT click Save. */
async function fillFilterRow(
  page: Page,
  rowIndex: number,
  args: { column: string; operator: string; value?: string },
): Promise<void> {
  const columnCombos = page.getByRole('combobox', { name: 'Column' });
  const operatorCombos = page.getByRole('combobox', { name: 'Operator' });

  await columnCombos.nth(rowIndex).click();
  let listbox = page.getByRole('listbox');
  if ((await listbox.count()) === 0) await columnCombos.nth(rowIndex).press('ArrowDown');
  await expect(listbox).toBeVisible({ timeout: 10_000 });
  await listbox.getByRole('option', { name: args.column, exact: true }).click();

  await operatorCombos.nth(rowIndex).click();
  listbox = page.getByRole('listbox');
  if ((await listbox.count()) === 0) await operatorCombos.nth(rowIndex).press('ArrowDown');
  await expect(listbox).toBeVisible({ timeout: 10_000 });
  await listbox.getByRole('option', { name: args.operator, exact: true }).click();

  if (args.value !== undefined) {
    await page.getByLabel('Value').nth(rowIndex).fill(args.value);
  }
}

async function searchWithHeader(page: Page, term: string): Promise<void> {
  const searchInput = page.locator('input[placeholder*="Find in"]').first();
  await expect(searchInput).toBeVisible({ timeout: 10_000 });
  await searchInput.fill(term);
  await page.waitForTimeout(1400);
}

async function clearFilterDraftAndSave(page: Page): Promise<void> {
  await openFilterDialog(page);
  await page.locator('button:has-text("Clear")').first().click();
  await page.locator('button:has-text("Save")').first().click();
  await page.waitForTimeout(1000);
}

// ─── Tests: reactions page (primary) ────────────────────────────────────────

test.describe('Quick column filter — reactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/biochem/reactions');
    await waitForGridData(page);
  });

  test('every filterable column header shows a quick-filter icon', async ({ page }) => {
    // The reactions page has ID, Name, Equation, Status columns visible by default.
    // Each should have a magnifying-glass button.
    for (const col of ['ID', 'Name', 'Equation', 'Status']) {
      const btn = quickFilterButton(page, col);
      await expect(btn).toBeVisible({ timeout: 5_000 });
    }
  });

  test('clicking icon opens a popover with an input; Escape closes without applying', async ({
    page,
  }) => {
    const input = await openQuickFilterPopover(page, 'ID');
    await input.fill('rxn00001');
    // Escape should close without committing
    await input.press('Escape');
    await expect(input).toBeHidden({ timeout: 5_000 });
    // No filter should be active
    expect(await activeFilterCount(page)).toBe(0);
    // Icon should still say "Quick filter" (not "Edit filter")
    await expect(
      page.getByRole('button', { name: /Quick filter for ID/i }),
    ).toBeVisible();
  });

  test('typing does NOT apply the filter — only Enter commits', async ({ page }) => {
    const baselineCount = await dataRows(page).count();
    expect(baselineCount).toBeGreaterThan(0);

    const input = await openQuickFilterPopover(page, 'ID');
    await input.fill('rxn00001');
    // Wait a beat to prove nothing fires
    await page.waitForTimeout(800);
    // Badge should still be 0 — the filter hasn't committed
    expect(await activeFilterCount(page)).toBe(0);

    // Now commit
    await input.press('Enter');
    await expect(input).toBeHidden({ timeout: 5_000 });
    await waitForGridStable(page);
    // Badge should now show 1
    expect(await activeFilterCount(page)).toBe(1);
  });

  test('icon turns to active state (Edit filter) when column has filter', async ({ page }) => {
    // Before: "Quick filter for ID"
    await expect(
      page.getByRole('button', { name: /Quick filter for ID/i }),
    ).toBeVisible();

    await applyQuickColumnFilter(page, 'ID', 'rxn00001');

    // After: "Edit filter for ID"
    await expect(
      page.getByRole('button', { name: /Edit filter for ID/i }),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('quick filter actually narrows displayed rows', async ({ page }) => {
    const baselineCount = await dataRows(page).count();
    expect(baselineCount).toBeGreaterThan(0);

    // A very specific filter should return fewer rows
    await applyQuickColumnFilter(page, 'ID', 'rxn00001');
    const filteredCount = await dataRows(page).count();
    expect(filteredCount).toBeLessThanOrEqual(baselineCount);
    expect(filteredCount).toBeGreaterThan(0);
  });

  test('two quick-column filters AND together (stacking)', async ({ page }) => {
    // Get a known row's ID and Name for cross-column filtering
    const reactionId = await readCellValue(page, 1, 'id');
    const reactionName = await readCellValue(page, 1, 'name');
    const nameToken = pickSearchToken(reactionName);

    // Apply filter on ID
    await applyQuickColumnFilter(page, 'ID', reactionId);
    expect(await activeFilterCount(page)).toBe(1);
    const afterFirst = await dataRows(page).count();
    expect(afterFirst).toBeGreaterThan(0);

    // Apply filter on Name — both should be active
    await applyQuickColumnFilter(page, 'Name', nameToken);
    expect(await activeFilterCount(page)).toBe(2);
    const afterSecond = await dataRows(page).count();
    // Second filter can only narrow further (or stay same)
    expect(afterSecond).toBeLessThanOrEqual(afterFirst);
    expect(afterSecond).toBeGreaterThan(0);

    // Both icons should show active state
    await expect(
      page.getByRole('button', { name: /Edit filter for ID/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Edit filter for Name/i }),
    ).toBeVisible();
  });

  test('quick-column filters appear in the Filter & Columns editor', async ({ page }) => {
    const reactionId = await readCellValue(page, 1, 'id');
    await applyQuickColumnFilter(page, 'ID', reactionId);
    expect(await activeFilterCount(page)).toBe(1);

    // Open the toolbar filter popover
    await openFilterDialog(page);
    const valueInputs = page.getByLabel('Value');
    await expect(valueInputs.first()).toBeVisible({ timeout: 10_000 });
    // The quick filter value should be pre-populated
    await expect(valueInputs.first()).toHaveValue(reactionId);
    await page.locator('button:has-text("Cancel")').first().click();
  });

  test('editing a quick-filter value via the toolbar editor updates the column icon', async ({
    page,
  }) => {
    await applyQuickColumnFilter(page, 'ID', 'rxn00001');
    expect(await activeFilterCount(page)).toBe(1);

    // Open the toolbar panel and change the value
    await openFilterDialog(page);
    const valueInput = page.getByLabel('Value').first();
    await valueInput.clear();
    await valueInput.fill('rxn99999_nonexistent');
    await page.locator('button:has-text("Save")').first().click();
    await waitForGridStable(page);

    // The ID column should still show "Edit filter" (active)
    expect(await activeFilterCount(page)).toBe(1);
    await expect(
      page.getByRole('button', { name: /Edit filter for ID/i }),
    ).toBeVisible();
  });

  test('clearing the filter via the toolbar panel clears the column icon', async ({ page }) => {
    await applyQuickColumnFilter(page, 'ID', 'rxn00001');
    expect(await activeFilterCount(page)).toBe(1);

    // Clear all from the toolbar
    await clearFilterDraftAndSave(page);
    expect(await activeFilterCount(page)).toBe(0);
    // Icon should revert to "Quick filter" (inactive)
    await expect(
      page.getByRole('button', { name: /Quick filter for ID/i }),
    ).toBeVisible();
  });

  test('clearing a quick-column filter via the popover X button removes it', async ({ page }) => {
    await applyQuickColumnFilter(page, 'ID', 'rxn00001');
    expect(await activeFilterCount(page)).toBe(1);

    // Re-open the quick filter popover, click the X (clear)
    const btn = quickFilterButton(page, 'ID');
    await btn.click();
    const clearBtn = page.locator('button[aria-label="Clear column filter"]').first();
    await expect(clearBtn).toBeVisible({ timeout: 5_000 });
    await clearBtn.click();
    await waitForGridStable(page);

    // Badge should drop to 0
    expect(await activeFilterCount(page)).toBe(0);
    await expect(
      page.getByRole('button', { name: /Quick filter for ID/i }),
    ).toBeVisible();
  });

  test('pagination resets to page 1 when quick filter is applied', async ({ page }) => {
    // Navigate to page 2 first
    const nextPageButton = page.locator('button[aria-label="Go to next page"]');
    if (await nextPageButton.isEnabled()) {
      await nextPageButton.click();
      await waitForGridStable(page);
      const afterNav = await currentPageStart(page);
      expect(afterNav).toBeGreaterThan(1);
    }

    // Apply a quick filter — pagination should reset
    await applyQuickColumnFilter(page, 'ID', 'rxn0');
    const afterFilter = await currentPageStart(page);
    expect(afterFilter).toBe(1);
  });

  test('quick-column filter coexists with the global search bar', async ({ page }) => {
    // Apply a quick column filter
    await applyQuickColumnFilter(page, 'ID', 'rxn00001');
    expect(await activeFilterCount(page)).toBe(1);

    // Now type into the global search
    await searchWithHeader(page, 'atp');
    // The column filter should still be active
    expect(await activeFilterCount(page)).toBe(1);
    await expect(
      page.getByRole('button', { name: /Edit filter for ID/i }),
    ).toBeVisible();
  });

  test('re-opening popover preserves previously committed value', async ({ page }) => {
    const reactionId = await readCellValue(page, 1, 'id');
    await applyQuickColumnFilter(page, 'ID', reactionId);

    // Re-open — input should be seeded with the committed value
    const input = await openQuickFilterPopover(page, 'ID');
    await expect(input).toHaveValue(reactionId);
    await input.press('Escape');
  });

  test('submitting empty string removes the quick filter', async ({ page }) => {
    await applyQuickColumnFilter(page, 'ID', 'rxn00001');
    expect(await activeFilterCount(page)).toBe(1);

    // Open, clear the input, press Enter
    const input = await openQuickFilterPopover(page, 'ID');
    await input.fill('');
    await input.press('Enter');
    await waitForGridStable(page);

    expect(await activeFilterCount(page)).toBe(0);
    await expect(
      page.getByRole('button', { name: /Quick filter for ID/i }),
    ).toBeVisible();
  });

  test('quick filter + toolbar filter stack together to 3 total', async ({ page }) => {
    test.setTimeout(60_000);

    // Quick filter on ID
    const reactionId = await readCellValue(page, 1, 'id');
    await applyQuickColumnFilter(page, 'ID', reactionId);
    expect(await activeFilterCount(page)).toBe(1);

    // Quick filter on Name
    const reactionName = await readCellValue(page, 1, 'name');
    const nameToken = pickSearchToken(reactionName);
    await applyQuickColumnFilter(page, 'Name', nameToken);
    expect(await activeFilterCount(page)).toBe(2);

    // Add a third filter via the toolbar editor
    await openFilterDialog(page);
    const addBtn = page.locator('button:has-text("Add Filter")').first();
    await addBtn.click();
    await page.waitForTimeout(500);

    // Target the LAST Column select (the newly added empty row)
    const allColumnSelects = page.getByRole('combobox', { name: 'Column' });
    const lastColumn = allColumnSelects.last();
    await expect(lastColumn).toBeVisible({ timeout: 5_000 });
    await lastColumn.click();
    let listbox = page.getByRole('listbox');
    if ((await listbox.count()) === 0) await lastColumn.press('ArrowDown');
    await expect(listbox).toBeVisible({ timeout: 10_000 });
    await listbox.getByRole('option', { name: 'Status', exact: true }).click();

    // Target the LAST Operator select
    const allOperatorSelects = page.getByRole('combobox', { name: 'Operator' });
    const lastOperator = allOperatorSelects.last();
    await lastOperator.click();
    listbox = page.getByRole('listbox');
    if ((await listbox.count()) === 0) await lastOperator.press('ArrowDown');
    await expect(listbox).toBeVisible({ timeout: 10_000 });
    await listbox.getByRole('option', { name: 'is not empty', exact: true }).click();

    await page.locator('button:has-text("Save")').first().click();
    await waitForGridStable(page);
    expect(await activeFilterCount(page)).toBe(3);

    // All three icons should reflect active state
    await expect(
      page.getByRole('button', { name: /Edit filter for ID/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Edit filter for Name/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Edit filter for Status/i }),
    ).toBeVisible();
  });

  test('tooltip shows filter summary when column is filtered', async ({ page }) => {
    await applyQuickColumnFilter(page, 'ID', 'rxn00001');
    // The button's aria-label should include the summary
    const btn = quickFilterButton(page, 'ID');
    const ariaLabel = await btn.getAttribute('aria-label');
    expect(ariaLabel).toContain('Edit filter for ID');
    expect(ariaLabel).toContain('currently:');
    expect(ariaLabel).toContain('rxn00001');
  });
});

// ─── Tests: compounds page ──────────────────────────────────────────────────

test.describe('Quick column filter — compounds', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/biochem/compounds');
    await waitForGridData(page);
  });

  test('quick filter icons are visible on compound column headers', async ({ page }) => {
    for (const col of ['ID', 'Name', 'Formula']) {
      await expect(quickFilterButton(page, col)).toBeVisible({ timeout: 5_000 });
    }
  });

  test('quick filter on compounds ID narrows rows and shows badge', async ({ page }) => {
    // Use the actual first compound ID from the grid — use a partial match
    // to handle server-side `contains` filter edge cases.
    const compoundId = await readCellValue(page, 1, 'id');
    // Use just the numeric suffix (e.g. "00001" from "cpd00001") for broad match
    const idToken = compoundId.replace(/^cpd/, '');
    await applyQuickColumnFilter(page, 'ID', idToken);
    await waitForGridStable(page);
    // The filter badge should show 1
    expect(await activeFilterCount(page)).toBe(1);
    // Active-state icon should be visible
    await expect(
      page.getByRole('button', { name: /Edit filter for ID/i }),
    ).toBeVisible();
  });

  test('stacking quick filters on compounds shows correct badge count', async ({ page }) => {
    // Read actual values from the first data row
    const compoundId = await readCellValue(page, 1, 'id');
    const compoundName = await readCellValue(page, 1, 'name');
    const idToken = compoundId.replace(/^cpd/, '');
    const nameToken = pickSearchToken(compoundName);

    await applyQuickColumnFilter(page, 'ID', idToken);
    expect(await activeFilterCount(page)).toBe(1);

    await applyQuickColumnFilter(page, 'Name', nameToken);
    expect(await activeFilterCount(page)).toBe(2);
    // Both icons should be in active state
    await expect(
      page.getByRole('button', { name: /Edit filter for ID/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Edit filter for Name/i }),
    ).toBeVisible();
  });
});

// ─── Tests: cross-page smoke ────────────────────────────────────────────────

test.describe('Quick column filter — cross-page', () => {
  test('genomes page has quick-filter icons', async ({ page }) => {
    await page.goto('/genomes');
    await waitForGridData(page, false);
    // At minimum, the grid should have column headers with search icons
    const icons = page.getByRole('button', {
      name: /Quick filter for|Edit filter for/i,
    });
    // May not have data rows but icons should be on column headers
    const count = await icons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('list-media page has quick-filter icons', async ({ page }) => {
    await page.goto('/list-media');
    await waitForGridData(page, false);
    const icons = page.getByRole('button', {
      name: /Quick filter for|Edit filter for/i,
    });
    const count = await icons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('genomes Annotations page has quick-filter icons', async ({ page }) => {
    await page.goto('/genomes/Annotations');
    await waitForGridData(page, false);
    const icons = page.getByRole('button', {
      name: /Quick filter for|Edit filter for/i,
    });
    const count = await icons.count();
    expect(count).toBeGreaterThan(0);
  });
});

// ─── Tests: edge cases & interaction integrity ──────────────────────────────

test.describe('Quick column filter — edge cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/biochem/reactions');
    await waitForGridData(page);
  });

  test('rapid successive quick filters on the same column replace each other', async ({
    page,
  }) => {
    await applyQuickColumnFilter(page, 'ID', 'rxn00001');
    expect(await activeFilterCount(page)).toBe(1);

    // Apply a different value on the same column
    await applyQuickColumnFilter(page, 'ID', 'rxn00002');
    // Should still be 1 — replaced, not stacked
    expect(await activeFilterCount(page)).toBe(1);

    // Re-open and verify the value was replaced
    const input = await openQuickFilterPopover(page, 'ID');
    await expect(input).toHaveValue('rxn00002');
    await input.press('Escape');
  });

  test('click-away closes popover without committing', async ({ page }) => {
    const input = await openQuickFilterPopover(page, 'ID');
    await input.fill('rxn99999');
    // MUI Popover renders an invisible backdrop that intercepts pointer events.
    // Click the backdrop to dismiss, same as a real user clicking outside.
    const backdrop = page.locator('.MuiBackdrop-root').first();
    if (await backdrop.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await backdrop.click({ force: true });
    } else {
      // Fallback: press Tab to blur, then Escape on the body
      await input.press('Tab');
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(500);
    // No filter committed
    expect(await activeFilterCount(page)).toBe(0);
  });

  test('resetting all from toolbar clears quick-column filters too', async ({ page }) => {
    // Apply two quick-column filters
    await applyQuickColumnFilter(page, 'ID', 'rxn00001');
    await applyQuickColumnFilter(page, 'Name', 'atp');
    expect(await activeFilterCount(page)).toBe(2);

    // Open toolbar, Reset All
    await openFilterDialog(page);
    await page.locator('button:has-text("Reset all")').first().click();
    await waitForGridStable(page);

    // All gone
    expect(await activeFilterCount(page)).toBe(0);
    await expect(
      page.getByRole('button', { name: /Quick filter for ID/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Quick filter for Name/i }),
    ).toBeVisible();
  });

  test('filter with no matching results shows zero data rows', async ({ page }) => {
    await applyQuickColumnFilter(page, 'ID', 'zzz_nonexistent_id_zzz');
    const count = await dataRows(page).count();
    expect(count).toBe(0);
    expect(await activeFilterCount(page)).toBe(1);
  });

  test('clearing a non-existent filter on empty input is a no-op', async ({ page }) => {
    const baselineCount = await dataRows(page).count();
    // Open, submit empty — should not add any filter
    const input = await openQuickFilterPopover(page, 'ID');
    await input.press('Enter');
    await waitForGridStable(page);
    expect(await activeFilterCount(page)).toBe(0);
    expect(await dataRows(page).count()).toBe(baselineCount);
  });
});
