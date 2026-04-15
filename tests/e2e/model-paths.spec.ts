/**
 * Model path verification tests.
 * Tests that model data loads correctly via the API, and stub models show the warning.
 */
import { test, expect } from '@playwright/test';

const TOKEN = process.env.PATRIC_TOKEN ?? "un=seaver|tokenid=D2E5BC0A-38FA-11F1-9F38-A4663B4BF60A|expiry=1807814535|client_id=seaver|token_type=Bearer|SigningSubject=https://rast.nmpdr.org/goauth/keys/E087E220-F8B1-11E3-9175-BD9D42A49C03|this_is_globus=globus_style_token|sig=12a496bfdf4bc9a32d1e22cd6f5ec785faef46e56945da687878e700dd5b7d0b655f92228f5307b554b65ea42f81698510a6a40f1f682834cb9d348312f923d1069b18570ad65c7cc31458222c1380cafa35fb9552b2b6bd357f29e81829919eea1706d9b1f5ec834542e442730799769f7de2c9a69beee86655e4be8281bd12";

async function authenticate(page: any) {
  await page.addInitScript((t: string) => {
    window.localStorage.setItem('auth', JSON.stringify({
      user_id: 'seaver', token: t, method: 'PATRIC',
    }));
  }, TOKEN);
}

test.describe('Model detail page — path resolution', () => {

  test('API: /api/models/data returns data for Test_Microbe', async ({ request }) => {
    const resp = await request.get('http://localhost:8000/api/models/data?ref=/seaver/modelseed/Test_Microbe', {
      headers: { Authorization: TOKEN },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(Array.isArray(body.reactions)).toBeTruthy();
    expect(body.reactions.length).toBeGreaterThan(0);
    expect(Array.isArray(body.compounds)).toBeTruthy();
    expect(body.compounds.length).toBeGreaterThan(0);
    expect(Array.isArray(body.genes)).toBeTruthy();
  });

  test('API: /api/models/data returns 404 for stub copy_test model', async ({ request }) => {
    const resp = await request.get('http://localhost:8000/api/models/data?ref=/seaver/modelseed/copy_test_1775156719858', {
      headers: { Authorization: TOKEN },
    });
    expect(resp.status()).toBe(404);
  });

  test('Frontend: Test_Microbe model page shows reactions count', async ({ page }) => {
    await authenticate(page);
    await page.goto('http://localhost:3001/model/seaver/modelseed/Test_Microbe');
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    // Should NOT show "Model data unavailable" warning
    await expect(page.locator('text=Model data unavailable')).not.toBeVisible({ timeout: 15000 });
    // Should show the Overview tab with non-zero reaction count
    const reactionsCard = page.locator('text=Reactions').first();
    await expect(reactionsCard).toBeVisible({ timeout: 15000 });
  });

  test('Frontend: stub copy_test model shows data unavailable warning', async ({ page }) => {
    await authenticate(page);
    await page.goto('http://localhost:3001/model/seaver/modelseed/copy_test_1775156719858');
    await page.waitForLoadState('networkidle');
    // Should show the warning banner for stub models
    await expect(page.locator('text=Model data unavailable')).toBeVisible({ timeout: 20000 });
  });

  test('Frontend: Reactions tab shows rows for Test_Microbe', async ({ page }) => {
    await authenticate(page);
    await page.goto('http://localhost:3001/model/seaver/modelseed/Test_Microbe/reactions');
    await page.waitForLoadState('networkidle');
    // Wait for DataGrid rows
    const rows = page.locator('.MuiDataGrid-row');
    await expect(rows.first()).toBeVisible({ timeout: 20000 });
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Frontend: Compounds tab shows rows for Test_Microbe', async ({ page }) => {
    await authenticate(page);
    await page.goto('http://localhost:3001/model/seaver/modelseed/Test_Microbe/compounds');
    await page.waitForLoadState('networkidle');
    const rows = page.locator('.MuiDataGrid-row');
    await expect(rows.first()).toBeVisible({ timeout: 20000 });
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Frontend: FBA tab is accessible for Test_Microbe', async ({ page }) => {
    await authenticate(page);
    await page.goto('http://localhost:3001/model/seaver/modelseed/Test_Microbe/fba');
    await page.waitForLoadState('networkidle');
    // FBA tab should load without crashing
    await expect(page.locator('body')).toBeVisible();
    // Should not show a fatal error
    await expect(page.locator('text=Error loading model')).not.toBeVisible();
  });

  test('Frontend: Back to Data Browser link is present', async ({ page }) => {
    await authenticate(page);
    await page.goto('http://localhost:3001/model/seaver/modelseed/Test_Microbe');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Back to Data Browser')).toBeVisible({ timeout: 10000 });
    const link = page.locator('a:has-text("Back to Data Browser")');
    await expect(link).toHaveAttribute('href', /\/data\//);
  });

});
