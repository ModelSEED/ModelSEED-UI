import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataGrid, type GridColDef, type GridFilterModel } from '@mui/x-data-grid';
import ChemicalEquation from '@/components/ui/ChemicalEquation';
import { EquationCell } from '@/app/(reference-data)/biochem/reactions/page';
import type { Reaction } from '@/lib/api/biochem';
import { resetSolrSchemaCache } from '@/lib/api/solrSchema';

const participant = {
    compound: 'cpd05331',
    coefficient: -1,
    compartment: 0,
    name: 'Glucoraphanin',
    is_reactant: true,
};

function renderReactionGrid(rows: Reaction[], quickFilterValues: string[]) {
    const columns: GridColDef<Reaction>[] = [{
        field: 'definition',
        headerName: 'Equation',
        width: 600,
        renderCell: (params) => <EquationCell equation={params.value} reaction={params.row} />,
    }];
    const filterModel: GridFilterModel = { items: [], quickFilterValues };

    return render(
        <div style={{ height: 300, width: 700 }}>
            <DataGrid rows={rows} columns={columns} filterMode="server" initialState={{ filter: { filterModel } }} />
        </div>,
    );
}

function renderEquation(quickFilterValues: string[], equation = 'cpd05331 + Glucoraphanin + H2O <=> Glucoraph', participants = [participant]) {
    return renderReactionGrid([{ id: 'rxn00001', name: 'Example reaction', aliases: [], definition: equation, participants }] as unknown as Reaction[], quickFilterValues);
}

async function getProductionShapedNestedReaction(): Promise<Reaction> {
    resetSolrSchemaCache();
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_DEPLOYMENT_MODE', 'staging');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input: RequestInfo | URL) => {
        const isProbe = String(input).includes('rows=0');
        return Promise.resolve(new Response(JSON.stringify({
            response: { numFound: isProbe ? 1 : 1, start: 0, docs: isProbe ? [] : [{
                id: 'rxn05331',
                definition: 'Glucoraphanin + H2O <=> Glucose',
                stoichiometry: [{
                    doc_type: ['stoichiometry'],
                    compound: ['cpd05331'],
                    coefficient: ['-1'],
                    participant_name: ['Glucoraphanin'],
                    participant_aliases: ['Name: Glucosinolate;GRA'],
                }],
            }] },
        }), { status: 200 }));
    });
    const { getReactions } = await import('@/lib/api/biochem');
    const result = await getReactions();
    expect(fetchMock).toHaveBeenCalled();
    return result.docs[0];
}

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    resetSolrSchemaCache();
});

describe('ChemicalEquation', () => {
    it('renders directly outside DataGrid context without highlights', () => {
        const { container } = render(<ChemicalEquation equation="(1) cpd05331[0] + H2O" />);

        expect(container.querySelectorAll('mark')).toHaveLength(0);
        expect(screen.getByRole('link', { name: 'cpd05331' }).getAttribute('href')).toBe('/biochem/compounds/cpd05331');
        expect(container.textContent).not.toContain('(1)');
        expect(container.textContent).not.toContain('[0]');
        expect(container.querySelector('sub')?.textContent).toBe('2');
    });

    it('highlights exact compound IDs, participant names, and substrings from multiple quick-filter terms', () => {
        renderEquation(['cpd05331 Glucoraphanin', 'Glucoraph']);

        const marks = screen.getAllByRole('mark');
        expect(marks.map((mark) => mark.textContent)).toEqual(expect.arrayContaining(['cpd05331', 'Glucoraphanin', 'Glucoraph']));
        expect(screen.getByRole('link', { name: 'cpd05331' }).getAttribute('href')).toBe('/biochem/compounds/cpd05331');
    });

    it('renders a production nested Solr result through getReactions and EquationCell with only Glucoraphanin marked', async () => {
        const reaction = await getProductionShapedNestedReaction();
        renderReactionGrid([reaction], ['cpd05331']);

        const marks = screen.getAllByRole('mark');
        expect(marks).toHaveLength(1);
        expect(marks[0].textContent).toBe('Glucoraphanin');
        expect(screen.getByRole('gridcell', { name: /Glucoraphanin \+ H 2 O <=> Glucose/ }).textContent).toBe('Glucoraphanin + H2O <=> Glucose');
        expect(screen.queryByRole('link', { name: 'cpd05331' })).toBeNull();
    });

    it('maps a nested participant compound-ID match to the visible participant name', () => {
        renderEquation(['cpd05331'], 'Glucoraphanin + H2O <=> Glucose');

        expect(screen.getByRole('mark').textContent).toContain('Glucoraphanin');
        expect(screen.queryByText('cpd05331')).toBeNull();
    });

    it('maps participant aliases to the visible participant label', async () => {
        const reaction = await getProductionShapedNestedReaction();
        renderReactionGrid([reaction], ['GRA']);

        expect(screen.getByRole('mark').textContent).toBe('Glucoraphanin');
    });

    it('maps nested, pipe-delimited aliases to the rendered participant without marking another product', () => {
        const reaction = {
            id: 'rxn05331',
            name: 'unrelated reaction metadata',
            aliases: ['Registry: unrelated-product'],
            definition: 'Glucoraphanin + H2O <=> Glucose',
            participants: [{
                compound: [['cpd05331']],
                participant_name: [['Glucoraphanin']],
                participant_aliases: [['Name: GRA|Registry: cpd05331-alias']],
            }],
        } as unknown as Reaction;

        renderReactionGrid([reaction], ['cpd05331-alias']);

        expect(screen.getByRole('mark').textContent).toBe('Glucoraphanin');
        expect(screen.queryByRole('mark', { name: 'Glucose' })).toBeNull();
    });

    it('maps array and legacy participant metadata to only rendered participant tokens', () => {
        const reaction = {
            id: 'rxn05331',
            name: 'Glucoraphanin conversion',
            aliases: ['Reaction DB: unrelated'],
            definition: 'Glucoraphanin + cpd00001 <=> Product',
            participants: [
                {
                    compound: ['cpd05331'],
                    participant_name: ['Glucoraphanin'],
                    participant_aliases: [['Name: GRA;glucosinolate']],
                },
                {
                    compound: 'cpd00001',
                    name: 'Legacy product',
                    aliases: ['Name: legacy-alias'],
                },
            ],
        } as unknown as Reaction;

        renderReactionGrid([reaction], ['GRA', 'legacy-alias']);

        expect(screen.getAllByRole('mark').map((mark) => mark.textContent)).toEqual(expect.arrayContaining(['Glucoraphanin', 'cpd00001']));
        expect(screen.queryByRole('mark', { name: 'Product' })).toBeNull();
    });

    it('never maps reaction metadata to a participant but marks literal Equation text', () => {
        renderEquation(['rxn00001', 'Example', 'Reaction DB: unrelated']);
        expect(screen.queryAllByRole('mark')).toHaveLength(0);

        renderEquation(['Example'], 'Glucoraphanin + Example <=> Glucose');
        expect(screen.getByRole('mark').textContent).toBe('Example');

        const { container } = renderEquation(['Example'], 'Glucoraphanin + H2O <=> Glucose');
        expect(container.querySelectorAll('mark')).toHaveLength(0);
    });

    it('preserves legacy equations, links, cleanup, and subscripts without a query', () => {
        const { container } = renderEquation([], '(1) cpd05331[0] + H2O <=> cpd00001[1]');

        expect(container.querySelectorAll('mark')).toHaveLength(0);
        expect(screen.getByRole('link', { name: 'cpd05331' }).getAttribute('href')).toBe('/biochem/compounds/cpd05331');
        expect(container.textContent).not.toContain('(1)');
        expect(container.textContent).not.toMatch(/\[0\]|\[1\]/);
        expect(container.querySelector('sub')?.textContent).toBe('2');
    });

    it('does not mark absent or regex-like quick-filter terms', () => {
        const { container } = renderEquation(['missing', '[a-z]+(foo)?']);

        expect(container.querySelectorAll('mark')).toHaveLength(0);
        expect(container.textContent).toContain('Glucoraphanin');
    });
});
