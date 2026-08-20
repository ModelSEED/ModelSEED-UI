import { describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { parseAtomMappings } from '@/lib/utils/atomMapping';
import { getCompoundsForReaction, type Compound } from '@/lib/api/biochem';
import ReactionStructureEquation from '@/components/ui/ReactionStructureEquation';

const rendererCalls: Array<Record<string, unknown>> = [];
const compound = (data: Partial<Compound>) => data as Compound;
const compounds = new Map([
    ['cpd00001', compound({ name: 'Water', smiles: 'O', formula: 'H2O', charge: 0 })],
    ['cpd00012', compound({ name: 'Phosphate donor', smiles: 'OP(=O)(O)O', formula: 'H4O7P2', charge: -2 })],
    ['cpd00009', compound({ name: 'Phosphate', smiles: 'OP(=O)(O)O', formula: 'H3O4P', charge: -1 })],
]);

vi.mock('@/lib/api/biochem', () => ({ getCompoundsForReaction: vi.fn(async () => compounds) }));
vi.mock('@/components/ui/MoleculeRenderer', () => ({
    default: (props: Record<string, unknown>) => {
        rendererCalls.push(props);
        const inventories: Record<string, Record<string, number>> = {
            cpd00001: { O: 1, H: 2 }, cpd00012: { P: 2, O: 7, H: 4 }, cpd00009: { P: 1, O: 4, H: 3 },
            cpd00002: { C: 1, O: 2 }, cpd00003: { C: 1, O: 2 }, cpd00011: { C: 1, O: 2 }, cpd00013: { N: 1, H: 4 },
            cpd00067: { H: 1 }, cpd00742: { C: 2, H: 3, N: 2, O: 3 },
        };
        (props.onInventory as ((inventory: Record<string, number>) => void) | undefined)?.(inventories[props.compoundId as string] ?? { C: 4 });
        if (!props.smiles) return <div data-testid={`structure-${props.compoundId as string}`} style={{ width: props.width as number, height: props.height as number }}>Compound image unavailable</div>;
        return <div data-testid={`structure-${props.compoundId as string}`} />;
    },
}));

function renderEquation(props: Partial<React.ComponentProps<typeof ReactionStructureEquation>> = {}) {
    rendererCalls.length = 0;
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<QueryClientProvider client={client}><ReactionStructureEquation equation="cpd00001[c] + cpd00012[c] => cpd00009[c]" {...props} /></QueryClientProvider>);
}

const pairs = parseAtomMappings([
    'cpd00001:O#1=cpd00009:(O#1;O#2;O#3;O#4)',
    'cpd00012:(O#1;O#2;O#3;O#4;O#5;O#6)=cpd00009:(O#1;O#2;O#3;O#4)',
    'cpd00012:(P#1;P#2)=cpd00009:P#1',
    'cpd00012:O#7=cpd00009:(O#1;O#2;O#3;O#4)',
]);

describe('ReactionStructureEquation', () => {
    it('renders an open equation with operators and prominent linked names', async () => {
        const { container, getByText } = renderEquation();
        await waitFor(() => expect(getByText('Water')).toBeTruthy());
        expect(container.querySelector('[data-testid="structure-cpd00001"]')).toBeTruthy();
        expect(container.textContent).toContain('+');
        expect(container.textContent).toContain('⇒');
        expect(getByText('Water', { selector: 'a p' }).closest('a')?.getAttribute('href')).toBe('/biochem/compounds/cpd00001');
        expect(container.textContent).toContain('cpd00001');
    });

    it('uses one phosphorus colour on both compounds and discloses ambiguous mappings', async () => {
        const { container } = renderEquation({ atomMappingPairs: pairs });
        await waitFor(() => expect(container.textContent).toContain('Atom mapping'));
        expect(container.querySelectorAll('[aria-label="Atom mapping legend"] li').length).toBeGreaterThan(0);
        await waitFor(() => expect(rendererCalls.filter((call) => call.elementColors).length).toBeGreaterThan(0));
        const donor = rendererCalls.filter((call) => call.compoundId === 'cpd00012').at(-1)?.elementColors as Record<string, string>;
        const product = rendererCalls.filter((call) => call.compoundId === 'cpd00009').at(-1)?.elementColors as Record<string, string>;
        expect(donor.P).toBe(product.P);
        expect(container.textContent).toContain('individual atom pairing is not determined by the data');
    });

    it('keeps legacy atom colours and hides new mapping affordances without pairs', async () => {
        renderEquation({ atomMapping: { cpd00001: { 0: '#123456' } }, atomMappingConfidence: 'clean' });
        await waitFor(() => expect(rendererCalls.length).toBeGreaterThan(0));
        expect(rendererCalls.find((call) => call.compoundId === 'cpd00001')?.atomColors).toEqual({ 0: '#123456' });
        expect(document.body.textContent).not.toContain('Atom mapping');
        expect(document.body.textContent).not.toContain('clean');
    });

    it('settles inventory effects without a maximum-depth update error', async () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const { container } = renderEquation({ atomMappingPairs: pairs });
        await waitFor(() => expect(container.textContent).toContain('Atom mapping'));
        expect(error.mock.calls.flat().join(' ')).not.toContain('Maximum update depth');
        error.mockRestore();
    });

    it('renders no bordered card surface around a compound', async () => {
        const { container } = renderEquation();
        await waitFor(() => expect(container.querySelector('[aria-label^="Chemical equation:"]')).toBeTruthy());
        const equation = container.querySelector('[aria-label^="Chemical equation:"]');
        expect(equation?.querySelectorAll('.MuiCard-root')).toHaveLength(0);
        expect(equation?.querySelectorAll('.MuiPaper-root')).toHaveLength(0);
    });

    it('renders a plus between same-side compounds and exactly one reaction operator', async () => {
        const { container } = renderEquation({ equation: 'cpd00001[c] + cpd00012[c] => cpd00009[c] + cpd00012[c]' });
        await waitFor(() => expect(container.querySelector('[aria-label^="Chemical equation:"]')?.textContent).toContain('⇒'));
        const equation = container.querySelector('[aria-label^="Chemical equation:"]');
        const pluses = Array.from(equation?.querySelectorAll('h6') ?? []).filter((node) => node.textContent === '+');
        const arrows = Array.from(equation?.querySelectorAll('h5') ?? []).filter((node) => node.textContent === '⇒');
        expect(pluses).toHaveLength(2);
        expect(arrows).toHaveLength(1);
        expect([...pluses, ...arrows].every((node) => node.getAttribute('aria-hidden') === 'true')).toBe(true);
    });

    it('renders the compound ID and formula as secondary text beneath the prominent name', async () => {
        const { container, getByText } = renderEquation();
        await waitFor(() => expect(getByText('Phosphate donor')).toBeTruthy());
        const caption = Array.from(container.querySelectorAll('.MuiTypography-caption'))
            .find((node) => node.textContent?.includes('cpd00012') && node.textContent.includes('H4O7P2'));
        const name = getByText('Phosphate donor', { selector: 'a p' });
        expect(caption).toBeTruthy();
        expect(caption?.textContent).toContain('cpd00012');
        expect(caption?.textContent).toContain('H4O7P2');
        expect(name).not.toBe(caption);
    });

    it('draws a compound with a structural SMILES and at least one heavy formula atom', async () => {
        const { container } = renderEquation();
        await waitFor(() => expect(container.querySelector('[data-testid="structure-cpd00001"]')).toBeTruthy());
        expect(container.querySelector('[data-testid="structure-cpd00012"]')).toBeTruthy();
    });

    it('preserves parsed token order within each equation side', async () => {
        const { container } = renderEquation({ equation: 'cpd00001[c] + cpd00012[c] => cpd00009[c]' });
        await waitFor(() => expect(container.querySelector('[data-testid="structure-cpd00012"]')).toBeTruthy());
        const water = container.querySelector('[data-testid="structure-cpd00001"]');
        const structure = container.querySelector('[data-testid="structure-cpd00012"]');
        expect(water && structure && Boolean(water.compareDocumentPosition(structure) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    });

    it('uses the compound ID when a compound name is missing', async () => {
        vi.mocked(getCompoundsForReaction).mockResolvedValueOnce(new Map([
            ['cpd00001', compound({ smiles: 'O', formula: 'H2O', charge: 0 })],
            ['cpd00012', compound({ name: 'Phosphate donor', smiles: 'OP(=O)(O)O', formula: 'H4O7P2', charge: -2 })],
            ['cpd00009', compound({ name: 'Phosphate', smiles: 'OP(=O)(O)O', formula: 'H3O4P', charge: -1 })],
        ]));
        const { container, getByText } = renderEquation();
        await waitFor(() => expect(getByText('cpd00001', { selector: 'a p' })).toBeTruthy());
        expect(container.textContent).not.toContain('undefined');
    });

    it('renders missing-SMILES compounds textually with their name visible', async () => {
        vi.mocked(getCompoundsForReaction).mockResolvedValueOnce(new Map([
            ['cpd00001', compound({ name: 'Water', smiles: 'O', formula: 'H2O', charge: 0 })],
            ['cpd00012', compound({ name: 'Phosphate donor', formula: 'H4O7P2', charge: -2 })],
            ['cpd00009', compound({ name: 'Phosphate', smiles: 'OP(=O)(O)O', formula: 'H3O4P', charge: -1 })],
        ]));
        const { queryByTestId, getAllByText } = renderEquation();
        await waitFor(() => expect(getAllByText('Phosphate donor', { selector: 'a p' }).length).toBeGreaterThan(0));
        expect(queryByTestId('structure-cpd00012')).toBeNull();
    });

    it('renders an unparseable formula without SMILES textually with its name visible', async () => {
        vi.mocked(getCompoundsForReaction).mockResolvedValueOnce(new Map([
            ['cpd00001', compound({ name: 'Water', smiles: 'O', formula: 'H2O', charge: 0 })],
            ['cpd00012', compound({ name: 'Unstructured donor', formula: 'R-group', charge: -2 })],
            ['cpd00009', compound({ name: 'Phosphate', smiles: 'OP(=O)(O)O', formula: 'H3O4P', charge: -1 })],
        ]));
        const { getAllByText, queryByTestId } = renderEquation();
        await waitFor(() => expect(getAllByText('Unstructured donor', { selector: 'a p' }).length).toBeGreaterThan(0));
        expect(queryByTestId('structure-cpd00012')).toBeNull();
    });

    it('draws a compound with SMILES and an unparseable formula', async () => {
        vi.mocked(getCompoundsForReaction).mockResolvedValueOnce(new Map([
            ['cpd99999', compound({ name: 'Weird thing', smiles: 'CCO', formula: 'C6H12O6(+)', charge: 0 })],
        ]));
        const { getAllByTestId } = renderEquation({ equation: 'cpd99999[c] => cpd99999[c]' });
        await waitFor(() => expect(getAllByTestId('structure-cpd99999')).toHaveLength(2));
    });

    it('keeps a proven heavy-atom-free SMILES compound textual', async () => {
        vi.mocked(getCompoundsForReaction).mockResolvedValueOnce(new Map([
            ['cpd00067', compound({ name: 'H+', smiles: '[H+]', formula: 'H', charge: 1 })],
        ]));
        const { getAllByText, queryByTestId } = renderEquation({ equation: 'cpd00067[c] => cpd00067[c]' });
        await waitFor(() => expect(getAllByText('H+', { selector: 'a p' }).length).toBeGreaterThan(0));
        expect(queryByTestId('structure-cpd00067')).toBeNull();
    });

    it('draws a compound with SMILES but no formula', async () => {
        vi.mocked(getCompoundsForReaction).mockResolvedValueOnce(new Map([
            ['cpd00001', compound({ name: 'Water', smiles: 'O', charge: 0 })],
            ['cpd00012', compound({ name: 'Phosphate donor', smiles: 'OP(=O)(O)O', formula: 'H4O7P2', charge: -2 })],
            ['cpd00009', compound({ name: 'Phosphate', smiles: 'OP(=O)(O)O', formula: 'H3O4P', charge: -1 })],
        ]));
        const { getByTestId } = renderEquation();
        await waitFor(() => expect(getByTestId('structure-cpd00001')).toBeTruthy());
    });

    it('formats zero and negative compound charges as intended', async () => {
        const { container } = renderEquation();
        await waitFor(() => expect(container.querySelector('[data-testid="structure-cpd00012"]')).toBeTruthy());
        const captions = Array.from(container.querySelectorAll('.MuiTypography-caption')).map((node) => node.textContent);
        expect(captions.some((caption) => caption === 'cpd00001 · H2O')).toBe(true);
        expect(captions.some((caption) => caption?.includes('cpd00012 · H4O7P2 · 2-'))).toBe(true);
    });

    it('does not render a stoichiometry coefficient of one', async () => {
        const { container } = renderEquation({ equation: '1 cpd00001[c] + cpd00012[c] => cpd00009[c]' });
        await waitFor(() => expect(container.querySelector('[aria-label^="Chemical equation:"]')).toBeTruthy());
        const waterLink = container.querySelector('a[href="/biochem/compounds/cpd00001"]');
        expect(waterLink?.parentElement?.previousElementSibling?.textContent).not.toBe('1');
    });

    it('keeps token placeholders stable until compound details resolve', async () => {
        let resolveCompounds!: (value: Map<string, Compound>) => void;
        vi.mocked(getCompoundsForReaction).mockImplementationOnce(() => new Promise((resolve) => {
            resolveCompounds = resolve;
        }));
        const { container, getByTestId } = renderEquation();
        expect(container.querySelectorAll('.MuiSkeleton-root')).toHaveLength(6);
        expect(container.textContent).toContain('cpd00001');
        expect(container.querySelector('[aria-label="Atom mapping legend"]')).toBeNull();
        resolveCompounds(compounds);
        await waitFor(() => expect(getByTestId('structure-cpd00001')).toBeTruthy());
    });

    it('explains when compound details could not be loaded', async () => {
        vi.mocked(getCompoundsForReaction).mockRejectedValueOnce(new Error('fetch failed'));
        const { getByText } = renderEquation();
        await waitFor(() => expect(getByText('Compound details could not be loaded.')).toBeTruthy());
    });

    describe('rxn00002', () => {
        it('draws every structured participant in equation order and explains grouped mappings', async () => {
            vi.mocked(getCompoundsForReaction).mockResolvedValueOnce(new Map([
                ['cpd00001', compound({ name: 'Water', smiles: 'O', formula: 'H2O', charge: 0 })],
                ['cpd00742', compound({ name: 'Allophanate', smiles: 'NC(=O)NC(=O)[O-]', formula: 'C2H3N2O3', charge: -1 })],
                ['cpd00011', compound({ name: 'CO2', smiles: 'O=C=O', formula: 'CO2', charge: 0 })],
                ['cpd00013', compound({ name: 'NH3', smiles: '[NH4+]', formula: 'H4N', charge: 1 })],
                ['cpd00067', compound({ name: 'H+', smiles: '[H+]', formula: 'H', charge: 1 })],
            ]));
            const rxnPairs = parseAtomMappings([
                'cpd00001:O#1=cpd00011:(O#1;O#2)',
                'cpd00742:(O#2;O#3)=cpd00011:(O#1;O#2)',
                'cpd00742:C#1=cpd00011:C#1',
                'cpd00742:C#2=cpd00011:C#1',
                'cpd00742:N#1=cpd00013:N#1',
                'cpd00742:N#2=cpd00013:N#1',
                'cpd00742:O#1=cpd00011:(O#1;O#2)',
            ]);
            const { container, getByTestId, getByText, getAllByText, queryByTestId } = renderEquation({
                equation: '(1) cpd00001[c] + (1) cpd00742[c] => (2) cpd00011[c] + (1) cpd00013[c] + (1) cpd00067[c]',
                atomMappingPairs: rxnPairs, atomMappingConfidence: 'clean', atomMappingHasSymmetryGroups: true,
            });
            await waitFor(() => expect(getByTestId('structure-cpd00011')).toBeTruthy());
            for (const id of ['cpd00001', 'cpd00011', 'cpd00013', 'cpd00742']) expect(getByTestId(`structure-${id}`)).toBeTruthy();
            expect(queryByTestId('structure-cpd00067')).toBeNull();
            for (const id of ['cpd00001', 'cpd00742', 'cpd00011', 'cpd00013', 'cpd00067']) {
                expect(container.textContent).toContain(id);
                expect(container.querySelector(`a[href="/biochem/compounds/${id}"]`)).toBeTruthy();
            }
            expect(getByText(/O: cpd00001, cpd00011 and cpd00742 — grouped/)).toBeTruthy();
            expect(container.textContent).toContain('individual atom pairing is not determined by the data');
            await waitFor(() => expect(rendererCalls.some((call) => call.compoundId === 'cpd00011' && Object.keys(call.elementColors as object ?? {}).includes('C') && Object.keys(call.elementColors as object ?? {}).includes('O'))).toBe(true));
            const water = getByTestId('structure-cpd00001');
            const allophanate = getByTestId('structure-cpd00742');
            expect(Boolean(water.compareDocumentPosition(allophanate) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
            expect(getAllByText('H+', { selector: 'a p' }).length).toBeGreaterThan(0);
        });
    });


});
