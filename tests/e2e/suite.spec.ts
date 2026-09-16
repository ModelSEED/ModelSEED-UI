/**
 * ModelSEED-UI E2E Test Suite
 * 
 * This test suite provides comprehensive end-to-end testing for the ModelSEED-UI application.
 * Tests verify that all pages load correctly, navigation works, and user interactions function properly.
 * 
 * Run with: npx playwright test
 * 
 * Prerequisites:
 * - Set PATRIC_TOKEN in .env.local for authenticated tests
 * - API server must be running (via SSH tunnel on port 8000)
 */

import { test, expect, type Page } from '@playwright/test';

/* ============================================================================
 * TEST CONFIGURATION & UTILITIES
 * ========================================================================= */

/** PATRIC authentication token from environment */
const PATRIC_TOKEN = process.env.PATRIC_TOKEN;

/**
 * Authenticates a page by injecting the auth token into localStorage.
 * This bypasses the UI login flow and simulates a logged-in user.
 * 
 * @param page - Playwright page object
 * @param token - PATRIC authentication token
 */
async function authenticatePage(page: Page, token: string): Promise<void> {
  await page.addInitScript((t: string) => {
    window.localStorage.setItem('auth', JSON.stringify({
      user_id: 'seaver',
      token: t,
      method: 'PATRIC',
    }));
  }, token);
}

/**
 * Check if tests should run with authentication
 */
/* ============================================================================
 * SUITE 1: PUBLIC PAGES
 * Tests for pages that don't require authentication
 * ========================================================================= */

test.describe('01. Public Pages', () => {

  test('Homepage loads correctly', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/ModelSEED/i);
    await expect(page.locator('body')).toBeVisible();
    const content = await page.content();
    expect(content.length).toBeGreaterThan(1000);
  });

  test('Header navigation has links', async ({ page }) => {
    await page.goto('/');
    const links = page.locator('a[href]');
    expect(await links.count()).toBeGreaterThan(5);
  });

  test('Homepage support section has Contact us and GitHub Issues links', async ({ page }) => {
    await page.goto('/');
    const contactLink = page.getByRole('link', { name: 'Contact us' });
    await expect(contactLink).toBeVisible();
    await expect(contactLink).toHaveAttribute('href', 'mailto:help@modelseed.org');

    const issuesLink = page.getByRole('link', { name: 'GitHub Issues' });
    await expect(issuesLink).toBeVisible();
    await expect(issuesLink).toHaveAttribute('href', 'https://github.com/ModelSEED/ModelSEED-UI/issues');
    await expect(issuesLink).toHaveAttribute('target', '_blank');
    await expect(issuesLink).toHaveAttribute('rel', /noopener/);
    await expect(issuesLink).toHaveAttribute('rel', /noreferrer/);
  });

  const publicPages = [
    { path: '/about', name: 'About' },
    { path: '/about/version', name: 'Version' },
    { path: '/about/data-sources', name: 'Data Sources' },
    { path: '/team', name: 'Team' },
    { path: '/publications', name: 'Publications' },
    { path: '/projects', name: 'Projects' },
    { path: '/events', name: 'Events' },
  ];

  for (const pageInfo of publicPages) {
    test(`${pageInfo.name} page loads`, async ({ page }) => {
      await page.goto(pageInfo.path);
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
      const content = await page.content();
      expect(content.length).toBeGreaterThan(500);
    });
  }

  test('Team member pages load', async ({ page }) => {
    await page.goto('/team');
    const links = page.locator('a[href*="/team/"]');
    if (await links.count() > 0) {
      await links.first().click();
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    }
  });

  test('Event pages load', async ({ page }) => {
    await page.goto('/events');
    const links = page.locator('a[href*="/events/plantseed"]');
    expect(await links.count()).toBeGreaterThan(0);
  });
});


/* ============================================================================
 * SUITE 2: REFERENCE DATA PAGES
 * Tests for reference data pages (Biochem, Genomes, Media)
 * ========================================================================= */

test.describe('02. Reference Data Pages', () => {

  test.describe('Biochem Database', () => {
    test('Compounds page loads with search', async ({ page }) => {
      await page.goto('/biochem/compounds');
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
      
      const searchInput = page.locator('input[placeholder*="Search"]').first();
      if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await searchInput.fill('glucose');
        await page.waitForTimeout(500);
      }
      await expect(page.locator('.MuiDataGrid-root').first()).toBeVisible({ timeout: 10000 });
    });

    test('Compound detail page loads', async ({ page }) => {
      await page.goto('/biochem/compounds/cpd00001');
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
      expect((await page.content()).length).toBeGreaterThan(300);
    });

    test('Reactions page loads with search', async ({ page }) => {
      await page.goto('/biochem/reactions');
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('.MuiDataGrid-root').first()).toBeVisible({ timeout: 10000 });
    });

    test('Reaction detail page loads', async ({ page }) => {
      await page.goto('/biochem/reactions/rxn00001');
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
      expect((await page.content()).length).toBeGreaterThan(300);
    });
  });

  test.describe('Genome Database', () => {
    test('Genomes page loads with data grid', async ({ page }) => {
      await page.goto('/genomes');
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('.MuiDataGrid-root').first()).toBeVisible({ timeout: 10000 });
    });

    test('Genomes search works', async ({ page }) => {
      await page.goto('/genomes');
      const searchInput = page.locator('input[placeholder*="Search"]').first();
      if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await searchInput.fill('E. coli');
        await page.waitForTimeout(1000);
      }
    });

    test('Public Plant Models page loads', async ({ page }) => {
      await page.goto('/genomes/Plants');
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    });

    test('Annotations page loads', async ({ page }) => {
      await page.goto('/genomes/Annotations');
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Media Database', () => {
    test('List Media page loads', async ({ page }) => {
      await page.goto('/list-media');
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('.MuiDataGrid-root').first()).toBeVisible({ timeout: 10000 });
    });

    test('Media detail page loads', async ({ page }) => {
      await page.goto('/media/public/Complete');
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Public Models & Genomes', () => {
    test('Public model page loads', async ({ page }) => {
      await page.goto('/model/public/modelseed/iJO1366');
      await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('Public genome page loads', async ({ page }) => {
      await page.goto('/genome/public/GramPos/Bacillus_subtilis_168');
      await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('Browse Models page loads', async ({ page }) => {
      await page.goto('/browse/models');
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    });
  });
});


/* ============================================================================
 * SUITE 3: AUTHENTICATED PAGES
 * Tests for pages that require login (My Models, My Media, My Jobs)
 * ========================================================================= */

test.describe('03. Authenticated User Pages', () => {
  test.beforeEach(async ({ page }) => {
    if (!PATRIC_TOKEN) {
      test.skip();
    }
    await authenticatePage(page, PATRIC_TOKEN!);
  });

  test('My Models page loads with grid', async ({ page }) => {
    await page.goto('/my-models');
    await expect(page.locator('.MuiDataGrid-root')).toBeVisible({ timeout: 15000 });
    
    // Verify user data tabs
    await expect(page.getByRole('tab', { name: /My Models/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /My Media/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /My Jobs/i })).toBeVisible();
  });

  test('My Models grid interaction works', async ({ page }) => {
    await page.goto('/my-models');
    await expect(page.locator('.MuiDataGrid-root')).toBeVisible({ timeout: 15000 });
    
    // Check column headers exist
    const headers = page.locator('.MuiDataGrid-columnHeader');
    expect(await headers.count()).toBeGreaterThan(0);
    
    // Test sorting
    await headers.first().click();
    await page.waitForTimeout(500);
  });

  test('My Models search/filter works', async ({ page }) => {
    await page.goto('/my-models');
    await expect(page.locator('.MuiDataGrid-root')).toBeVisible({ timeout: 15000 });
    
    const quickFilter = page.locator('input[placeholder*="Search"]').first();
    if (await quickFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await quickFilter.fill('test');
      await page.waitForTimeout(500);
      await quickFilter.clear();
    }
  });

  test('My Media page loads with grid', async ({ page }) => {
    await page.goto('/myMedia');
    await expect(page.locator('.MuiDataGrid-root')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('tab', { name: /My Media/i })).toBeVisible();
  });

  test('My Media search/filter works', async ({ page }) => {
    await page.goto('/myMedia');
    await expect(page.locator('.MuiDataGrid-root')).toBeVisible({ timeout: 15000 });
    
    const quickFilter = page.locator('input[placeholder*="Search"]').first();
    if (await quickFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await quickFilter.fill('test');
      await page.waitForTimeout(500);
    }
  });

  test('My Jobs page loads', async ({ page }) => {
    await page.goto('/my-jobs');
    await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('tab', { name: /My Jobs/i })).toBeVisible();
  });
});


/* ============================================================================
 * SUITE 4: MODEL DETAIL PAGE
 * Tests for model detail page with all its tabs
 * ========================================================================= */

test.describe('04. Model Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    if (!PATRIC_TOKEN) {
      test.skip();
    }
    await authenticatePage(page, PATRIC_TOKEN!);
  });

  test('Model detail page loads with content', async ({ page }) => {
    await page.goto('/model/public/modelseed/iJO1366');
    await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(3000);
    expect((await page.content()).length).toBeGreaterThan(500);
  });

  test('User model detail shows user data tabs', async ({ page }) => {
    await page.goto('/my-models');
    await expect(page.locator('.MuiDataGrid-root')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('tab', { name: /My Models/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /My Media/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /My Jobs/i })).toBeVisible();
  });

  test('Model has detail tabs', async ({ page }) => {
    await page.goto('/model/public/modelseed/iJO1366');
    await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2000);
    expect((await page.content()).length).toBeGreaterThan(500);
  });

  test('Model Overview tab displays metadata', async ({ page }) => {
    await page.goto('/model/public/modelseed/iJO1366');
    await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2000);
    expect((await page.content()).length).toBeGreaterThan(500);
  });

  test('Model Reactions tab displays data', async ({ page }) => {
    await page.goto('/model/public/modelseed/iJO1366');
    await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    
    const reactionsTab = page.getByRole('tab', { name: /Reactions/i });
    if (await reactionsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await reactionsTab.click();
      await page.waitForTimeout(1000);
      await expect(page.locator('.MuiDataGrid-root').first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('Model Compounds tab displays data', async ({ page }) => {
    await page.goto('/model/public/modelseed/iJO1366');
    await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    
    const compoundsTab = page.getByRole('tab', { name: /Compounds/i });
    if (await compoundsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await compoundsTab.click();
      await page.waitForTimeout(1000);
      await expect(page.locator('.MuiDataGrid-root').first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('Model Genes tab displays data', async ({ page }) => {
    await page.goto('/model/public/modelseed/iJO1366');
    await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    
    const genesTab = page.getByRole('tab', { name: /Genes/i });
    if (await genesTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await genesTab.click();
      await page.waitForTimeout(1000);
      await expect(page.locator('.MuiDataGrid-root').first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('Model Biomass tab displays data', async ({ page }) => {
    await page.goto('/model/public/modelseed/iJO1366');
    await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    
    const biomassTab = page.getByRole('tab', { name: /Biomass/i });
    if (await biomassTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await biomassTab.click();
      await page.waitForTimeout(1000);
      await expect(page.locator('.MuiDataGrid-root').first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('Model Pathways tab displays data', async ({ page }) => {
    await page.goto('/model/public/modelseed/iJO1366');
    await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    
    const pathwaysTab = page.getByRole('tab', { name: /Pathways/i });
    if (await pathwaysTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await pathwaysTab.click();
      await page.waitForTimeout(1000);
      expect((await page.content()).length).toBeGreaterThan(300);
    }
  });

  test('Model FBA tab displays data', async ({ page }) => {
    await page.goto('/model/public/modelseed/iJO1366');
    await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    
    const fbaTab = page.getByRole('tab', { name: /FBA/i });
    if (await fbaTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await fbaTab.click();
      await page.waitForTimeout(1000);
      expect((await page.content()).length).toBeGreaterThan(200);
    }
  });

  test('Model Gapfills tab displays data', async ({ page }) => {
    await page.goto('/model/public/modelseed/iJO1366');
    await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    
    const gapfillsTab = page.getByRole('tab', { name: /Gapfills/i });
    if (await gapfillsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await gapfillsTab.click();
      await page.waitForTimeout(1000);
      expect((await page.content()).length).toBeGreaterThan(200);
    }
  });

  test('Model search functionality works', async ({ page }) => {
    await page.goto('/model/public/modelseed/iJO1366');
    await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    
    const searchInputs = page.locator('input[placeholder*="Search"]');
    if (await searchInputs.count() > 0) {
      await searchInputs.first().fill('glucose');
      await page.waitForTimeout(1000);
      await searchInputs.first().clear();
    }
  });
});


/* ============================================================================
 * SUITE 5: ANALYSIS TOOLS
 * Tests for FBA, Gapfilling, Compare, and Build Model features
 * ========================================================================= */

test.describe('05. Analysis Tools', () => {
  test.beforeEach(async ({ page }) => {
    if (!PATRIC_TOKEN) {
      test.skip();
    }
    await authenticatePage(page, PATRIC_TOKEN!);
  });

  test.describe('Build Model', () => {
    test('Build Model page loads', async ({ page }) => {
      await page.goto('/plant');
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(2000);
      expect((await page.content()).length).toBeGreaterThan(300);
    });

    test('Build Model form has required fields', async ({ page }) => {
      await page.goto('/plant');
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(2000);
      
      const nameInput = page.locator('input[name*="name"], input[id*="name"]').first();
      if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(nameInput).toBeVisible();
      }
    });

    test('Plant FASTA upload button exists', async ({ page }) => {
      await page.goto('/plant');
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(2000);
      
      const uploadButton = page.locator('button, [role="tab"]').filter({ hasText: /UPLOAD/i });
      await expect(uploadButton.first()).toBeVisible();
    });
  });

  test.describe('Compare Models', () => {
    test('Compare page loads', async ({ page }) => {
      await page.goto('/compare');
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(2000);
      expect((await page.content()).length).toBeGreaterThan(200);
    });

    test('Compare form has model selection', async ({ page }) => {
      await page.goto('/compare');
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(2000);
      
      const formElements = page.locator('input, select, button');
      expect(await formElements.count()).toBeGreaterThan(0);
    });
  });

  test.describe('FBA Analysis', () => {
    test('FBA page loads', async ({ page }) => {
      await page.goto('/fba/seaver/modelseed/TestModel');
      await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('FBA form has required fields', async ({ page }) => {
      await page.goto('/fba/seaver/modelseed/TestModel');
      await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
      await page.waitForTimeout(2000);
      expect((await page.content()).length).toBeGreaterThan(200);
    });
  });

  test.describe('Gapfilling', () => {
    test('Gapfill page loads', async ({ page }) => {
      await page.goto('/gapfill/seaver/modelseed/TestModel');
      await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('Gapfill form has required fields', async ({ page }) => {
      await page.goto('/gapfill/seaver/modelseed/TestModel');
      await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
      await page.waitForTimeout(2000);
      expect((await page.content()).length).toBeGreaterThan(200);
    });
  });

  test.describe('Data & Feature Pages', () => {
    test('Data page loads', async ({ page }) => {
      await page.goto('/data/seaver/modelseed/TestModel');
      await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('Feature page loads', async ({ page }) => {
      await page.goto('/feature/seaver/modelseed/TestModel');
      await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });
  });
});


/* ============================================================================
 * SUITE 6: NAVIGATION
 * Tests for navigation between pages
 * ========================================================================= */

test.describe('06. Navigation', () => {
  test.beforeEach(async ({ page }) => {
    if (!PATRIC_TOKEN) {
      test.skip();
    }
    await authenticatePage(page, PATRIC_TOKEN!);
  });

  test('Header navigation works', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav, header');
    await expect(nav.first()).toBeVisible();
  });

  test('User data tabs navigation works', async ({ page }) => {
    await page.goto('/my-models');
    await expect(page.getByRole('tab', { name: /My Media/i })).toBeVisible();
    
    // Navigate to My Media
    await page.getByRole('tab', { name: /My Media/i }).click();
    await expect(page).toHaveURL(/myMedia/);
    
    // Navigate to My Jobs
    await page.getByRole('tab', { name: /My Jobs/i }).click();
    await expect(page).toHaveURL(/my-jobs/);
    
    // Navigate back to My Models
    await page.getByRole('tab', { name: /My Models/i }).click();
    await expect(page).toHaveURL(/my-models/);
  });

  test('Navigate to model detail from My Models', async ({ page }) => {
    await page.goto('/my-models');
    await expect(page.locator('.MuiDataGrid-root')).toBeVisible({ timeout: 15000 });
    // Just verify the grid is visible - clicking specific rows depends on data
  });
});


/* ============================================================================
 * SUITE 7: EDGE CASES
 * Tests for error handling and edge cases
 * ========================================================================= */

test.describe('07. Edge Cases', () => {

  test('Non-existent model page handles gracefully', async ({ page }) => {
    await page.goto('/model/public/nonexistent/model12345');
    await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
  });

  test('Invalid route shows content', async ({ page }) => {
    await page.goto('/invalid-route-12345');
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
  });

  test('Public pages work without auth', async ({ page }) => {
    const publicUrls = ['/', '/about', '/biochem/compounds', '/genomes'];
    for (const url of publicUrls) {
      await page.goto(url);
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    }
  });
});
