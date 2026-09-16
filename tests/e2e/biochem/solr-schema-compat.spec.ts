import { test, expect } from '@playwright/test';

const EXPECTED_DELTA_G = '-10.5';
const EXPECTED_DELTA_G_ERROR = '1.2';
const EMPTY_SOLR_RESPONSE: { responseHeader: { status: number }; response: { numFound: number; start: number; docs: unknown[] } } = {
    responseHeader: { status: 0 },
    response: { numFound: 0, start: 0, docs: [] },
};
let interceptedRequests = 0;

const legacyReaction = {
    id: 'rxnCompat001',
    name: 'Schema compatibility reaction',
    definition: 'cpd00001 => cpd00002',
    equation: 'cpd00001 => cpd00002',
    deltag: -10.5,
    deltagerr: 1.2,
    reversibility: '>',
    aliases: [],
    ec_numbers: [],
    pathways: [],
    is_obsolete: '0',
};

const nestedReaction = {
    ...legacyReaction,
    thermodynamics: [{
        doc_type: 'thermodynamics',
        source_name: 'eQuilibrator',
        energy: -10.5,
        error: 1.2,
        operator: '=',
    }],
};

test.describe('Biochem reaction Solr schema compatibility', () => {
    test.beforeEach(async ({ page }, testInfo) => {
        const nested = testInfo.title.includes('Solr 9 nested');
        interceptedRequests = 0;

        await page.route('**/solr/**', async (route) => {
            interceptedRequests += 1;
            const url = route.request().url();
            let response = EMPTY_SOLR_RESPONSE;

            if (url.includes('rows=0')) {
                response = {
                    ...EMPTY_SOLR_RESPONSE,
                    response: { ...EMPTY_SOLR_RESPONSE.response, numFound: nested ? 1 : 0 },
                };
            } else if (url.includes('q=id:rxnCompat001')) {
                response = {
                    ...EMPTY_SOLR_RESPONSE,
                    response: {
                        ...EMPTY_SOLR_RESPONSE.response,
                        numFound: 1,
                        docs: [nested ? nestedReaction : legacyReaction],
                    },
                };
            }

            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(response) });
        });
    });

    test.afterEach(async ({}, testInfo) => {
        console.log(`${testInfo.title}: intercepted ${interceptedRequests} Solr requests`);
    });

    test('renders reaction thermodynamics from a legacy flat Solr document', async ({ page }) => {
        await page.goto('/biochem/reactions/rxnCompat001');

        await expect(page.getByText('Gibbs free energy change (ΔG)')).toBeVisible();
        await expect(page.getByText(`${EXPECTED_DELTA_G} +/- ${EXPECTED_DELTA_G_ERROR} kcal/mol`)).toBeVisible();
    });

    test('renders identical thermodynamics from a Solr 9 nested child document', async ({ page }) => {
        await page.goto('/biochem/reactions/rxnCompat001');

        await expect(page.getByText('Thermodynamics')).toBeVisible();
        await expect(page.getByRole('cell', { name: EXPECTED_DELTA_G })).toBeVisible();
        await expect(page.getByRole('cell', { name: EXPECTED_DELTA_G_ERROR })).toBeVisible();
    });
});
