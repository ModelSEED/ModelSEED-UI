import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { parseAtomMappings } from '@/lib/utils/atomMapping';
import { getCompoundsForReaction, type Compound } from '@/lib/api/biochem';
import { getStructuresByIds } from '@/lib/api/structures';
import ReactionStructureEquation from '@/components/ui/ReactionStructureEquation';

const rendererCalls: Array<Record<string, unknown>> = [];
const suppressedInventories = new Set<string>();
const compound = (data: Partial<Compound>) => data as Compound;
const compounds = new Map([
    ['cpd00001', compound({ name: 'Water', smiles: 'O', formula: 'H2O', charge: 0 })],
    ['cpd00012', compound({ name: 'Phosphate donor', smiles: 'OP(=O)(O)O', formula: 'H4O7P2', charge: -2 })],
    ['cpd00009', compound({ name: 'Phosphate', smiles: 'OP(=O)(O)O', formula: 'H3O4P', charge: -1 })],
]);

vi.mock('@/lib/api/biochem', () => ({ getCompoundsForReaction: vi.fn(async () => compounds) }));
vi.mock('@/lib/api/structures', () => ({ getStructuresByIds: vi.fn(async () => new Map()) }));
vi.mock('@/components/ui/MoleculeRenderer', () => ({
    default: (props: Record<string, unknown>) => {
        rendererCalls.push(props);
        const inventories: Record<string, Record<string, number>> = {
            cpd00001: { O: 1, H: 2 }, cpd00012: { P: 2, O: 7, H: 4 }, cpd00009: { P: 1, O: 4, H: 3 },
            cpd00002: { C: 1, O: 2 }, cpd00003: { C: 1, O: 2 }, cpd00011: { C: 1, O: 2 }, cpd00013: { N: 1, H: 4 },
            cpd00067: { H: 1 }, cpd00742: { C: 2, H: 3, N: 2, O: 3 },
        };
        if (!suppressedInventories.has(props.compoundId as string)) {
            (props.onInventory as ((inventory: Record<string, number>) => void) | undefined)?.(inventories[props.compoundId as string] ?? { C: 4 });
        }
        if (!props.smiles) return <div data-testid={`structure-${props.compoundId as string}`} style={{ width: props.width as number, height: props.height as number }}>Compound image unavailable</div>;
        return <div data-testid={`structure-${props.compoundId as string}`} />;
    },
}));

function renderEquation(props: Partial<React.ComponentProps<typeof ReactionStructureEquation>> = {}) {
    rendererCalls.length = 0;
    suppressedInventories.clear();
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
        expect(container.textContent).toContain('individual atom pairing is not determined by the data');
        expect(rendererCalls.some((call) => call.elementColors)).toBe(false);
    });

    it('colours cpd00009 phosphorus separately from its oxygens after its graph arrives', async () => {
        vi.mocked(getStructuresByIds).mockResolvedValueOnce(new Map([
            ['cpd00009', { id: 'cpd00009', inchi: 'InChI=1S/H3O4P/c1-5(2,3)4', smiles: 'O=P([O-])([O-])O' }],
        ]));
        renderEquation({ atomMappingPairs: pairs });
        await waitFor(() => expect(rendererCalls.some((call) => call.compoundId === 'cpd00009')).toBe(true));
        const initial = rendererCalls.filter((call) => call.compoundId === 'cpd00009').at(-1)!;
        (initial.onGraph as (graph: unknown) => void)({ elements: ['O', 'P', 'O', 'O', 'O'], bonds: [[0, 1], [1, 2], [1, 3], [1, 4]] });
        await waitFor(() => {
            const colors = rendererCalls.filter((call) => call.compoundId === 'cpd00009').at(-1)?.atomColors as Record<number, string>;
            expect(colors[1]).not.toBe(colors[0]);
            expect(colors[1]).not.toBe(colors[2]);
            expect(colors[1]).not.toBe(colors[3]);
            expect(colors[1]).not.toBe(colors[4]);
        });
    });

    it('renders without orbit colours when structures are absent', async () => {
        vi.mocked(getStructuresByIds).mockResolvedValueOnce(new Map());
        const { container } = renderEquation({ atomMappingPairs: pairs });
        await waitFor(() => expect(container.querySelector('[data-testid="structure-cpd00009"]')).toBeTruthy());
        const result = rendererCalls.filter((call) => call.compoundId === 'cpd00009').at(-1)?.atomColors as Record<number, string>;
        expect(result ?? {}).toEqual({});
    });

    it('passes stored SVG fallback when compound SMILES is absent', async () => {
        vi.mocked(getCompoundsForReaction).mockResolvedValueOnce(new Map([
            ['cpd00009', compound({ name: 'Phosphate', formula: 'H3O4P', charge: -1 })],
        ]));
        vi.mocked(getStructuresByIds).mockResolvedValueOnce(new Map([
            ['cpd00009', { id: 'cpd00009', svg: '<svg data-stored="true" />' }],
        ]));
        renderEquation({ equation: 'cpd00009[c] => cpd00009[c]' });
        await waitFor(() => expect(rendererCalls.filter((call) => call.compoundId === 'cpd00009').at(-1)?.fallbackSvg).toBe('<svg data-stored="true" />'));
        expect(rendererCalls.filter((call) => call.compoundId === 'cpd00009').at(-1)?.smiles).toBeUndefined();
    });

    it('keeps repeated equivalent graph reports idempotent', async () => {
        renderEquation({ atomMappingPairs: pairs });
        await waitFor(() => expect(rendererCalls.some((call) => call.compoundId === 'cpd00009')).toBe(true));
        const initial = rendererCalls.filter((call) => call.compoundId === 'cpd00009').at(-1)!;
        const graph = { elements: ['O', 'P', 'O', 'O', 'O'], bonds: [[0, 1], [1, 2], [1, 3], [1, 4]] };
        (initial.onGraph as (graph: unknown) => void)(graph);
        await waitFor(() => expect(rendererCalls.filter((call) => call.compoundId === 'cpd00009').length).toBeGreaterThan(1));
        const rendersAfterFirstGraph = rendererCalls.length;
        (rendererCalls.filter((call) => call.compoundId === 'cpd00009').at(-1)?.onGraph as (graph: unknown) => void)(graph);
        await new Promise((resolve) => setTimeout(resolve, 20));
        expect(rendererCalls.length).toBe(rendersAfterFirstGraph);
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
            await waitFor(() => expect(rendererCalls.some((call) => call.compoundId === 'cpd00011' && call.onGraph)).toBe(true));
            const water = getByTestId('structure-cpd00001');
            const allophanate = getByTestId('structure-cpd00742');
            expect(Boolean(water.compareDocumentPosition(allophanate) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
            expect(getAllByText('H+', { selector: 'a p' }).length).toBeGreaterThan(0);
        });

        it('lets a legend group highlight matching tokens and toggles it off', async () => {
            const rxnPairs = parseAtomMappings([
                'cpd00001:O#1=cpd00011:(O#1;O#2)', 'cpd00742:(O#2;O#3)=cpd00011:(O#1;O#2)',
                'cpd00742:C#1=cpd00011:C#1', 'cpd00742:C#2=cpd00011:C#1',
                'cpd00742:N#1=cpd00013:N#1', 'cpd00742:N#2=cpd00013:N#1', 'cpd00742:O#1=cpd00011:(O#1;O#2)',
            ]);
            vi.mocked(getCompoundsForReaction).mockResolvedValueOnce(new Map([
                ['cpd00001', compound({ name: 'Water', smiles: 'O', formula: 'H2O', charge: 0 })], ['cpd00742', compound({ name: 'Allophanate', smiles: 'NC(=O)NC(=O)[O-]', formula: 'C2H3N2O3', charge: -1 })],
                ['cpd00011', compound({ name: 'CO2', smiles: 'O=C=O', formula: 'CO2', charge: 0 })], ['cpd00013', compound({ name: 'NH3', smiles: '[NH4+]', formula: 'H4N', charge: 1 })], ['cpd00067', compound({ name: 'H+', smiles: '[H+]', formula: 'H', charge: 1 })],
            ]));
            const { container, getByRole } = renderEquation({ equation: 'cpd00001[c] + cpd00742[c] => cpd00011[c] + cpd00013[c] + cpd00067[c]', atomMappingPairs: rxnPairs });
            await waitFor(() => expect(getByRole('button', { name: /^C:/ })).toBeTruthy());
            expect(container.querySelectorAll('[data-mapping-dimmed="true"]')).toHaveLength(0);
            const carbon = getByRole('button', { name: /^C:/ });
            fireEvent.click(carbon);
            expect(carbon.getAttribute('aria-pressed')).toBe('true');
            for (const id of ['cpd00011', 'cpd00742']) expect(container.querySelector(`[data-mapping-token="${id}"]`)?.getAttribute('data-mapping-dimmed')).toBe('false');
            for (const id of ['cpd00001', 'cpd00013', 'cpd00067']) expect(container.querySelector(`[data-mapping-token="${id}"]`)?.getAttribute('data-mapping-dimmed')).toBe('true');
            fireEvent.click(carbon);
            expect(container.querySelectorAll('[data-mapping-dimmed="true"]')).toHaveLength(0);
        });

        it('highlights on focus and Escape clears a sticky legend selection', async () => {
            const rxnPairs = parseAtomMappings(['cpd00742:C#1=cpd00011:C#1', 'cpd00742:C#2=cpd00011:C#1']);
            vi.mocked(getCompoundsForReaction).mockResolvedValueOnce(new Map([['cpd00742', compound({ name: 'Allophanate', smiles: 'NC(=O)NC(=O)[O-]', formula: 'C2H3N2O3', charge: -1 })], ['cpd00011', compound({ name: 'CO2', smiles: 'O=C=O', formula: 'CO2', charge: 0 })]]));
            const { container, getByRole } = renderEquation({ equation: 'cpd00742[c] => cpd00011[c]', atomMappingPairs: rxnPairs });
            await waitFor(() => expect(getByRole('button', { name: /^C:/ })).toBeTruthy());
            const carbon = getByRole('button', { name: /^C:/ });
            fireEvent.focus(carbon);
            expect(container.querySelector('[data-mapping-token="cpd00011"]')?.getAttribute('data-mapping-dimmed')).toBe('false');
            fireEvent.click(carbon);
            fireEvent.keyDown(container.firstElementChild!, { key: 'Escape' });
            expect(carbon.getAttribute('aria-pressed')).toBe('false');
        });

        it('exposes element indicators as named mapping-group buttons', async () => {
            const rxnPairs = parseAtomMappings(['cpd00742:C#1=cpd00011:C#1', 'cpd00742:C#2=cpd00011:C#1']);
            vi.mocked(getCompoundsForReaction).mockResolvedValueOnce(new Map([['cpd00742', compound({ name: 'Allophanate', smiles: 'NC(=O)NC(=O)[O-]', formula: 'C2H3N2O3', charge: -1 })], ['cpd00011', compound({ name: 'CO2', smiles: 'O=C=O', formula: 'CO2', charge: 0 })]]));
            const { getAllByRole } = renderEquation({ equation: 'cpd00742[c] => cpd00011[c]', atomMappingPairs: rxnPairs });
            await waitFor(() => expect(getAllByRole('button', { name: 'Highlight C mapping group' }).length).toBeGreaterThan(0));
        });

        it('keeps the selected group after pointer hover leaves another control', async () => {
            const rxnPairs = parseAtomMappings(['cpd00742:C#1=cpd00011:C#1', 'cpd00742:C#2=cpd00011:C#1']);
            vi.mocked(getCompoundsForReaction).mockResolvedValueOnce(new Map([['cpd00742', compound({ name: 'Allophanate', smiles: 'NC(=O)NC(=O)[O-]', formula: 'C2H3N2O3', charge: -1 })], ['cpd00011', compound({ name: 'CO2', smiles: 'O=C=O', formula: 'CO2', charge: 0 })]]));
            const { container, getByRole } = renderEquation({ equation: 'cpd00742[c] => cpd00011[c]', atomMappingPairs: rxnPairs });
            await waitFor(() => expect(getByRole('button', { name: /^C:/ })).toBeTruthy());
            const carbon = getByRole('button', { name: /^C:/ });
            fireEvent.click(carbon);
            fireEvent.mouseLeave(carbon);
            expect(carbon.getAttribute('aria-pressed')).toBe('true');
            expect(container.querySelector('[data-mapping-token="cpd00011"]')?.getAttribute('data-mapping-dimmed')).toBe('false');
        });

        it('does not formula-seed a drawn structure before RDKit inventory arrives', async () => {
            vi.mocked(getCompoundsForReaction).mockResolvedValueOnce(new Map([['cpd00742', compound({ name: 'Allophanate', smiles: 'NC(=O)NC(=O)[O-]', formula: 'C2H3N2O3', charge: -1 })], ['cpd00013', compound({ name: 'NH3', smiles: '[NH4+]', formula: 'H4N', charge: 1 })], ['cpd00067', compound({ name: 'H+', smiles: '[H+]', formula: 'H', charge: 1 })]]));
            suppressedInventories.add('cpd00013');
            const { container } = render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><ReactionStructureEquation equation="cpd00742[c] + cpd00067[c] => cpd00013[c]" atomMappingPairs={parseAtomMappings(['cpd00742:N#1=cpd00013:N#1', 'cpd00742:N#2=cpd00013:N#1'])} /></QueryClientProvider>);
            await waitFor(() => expect(container.querySelector('[data-testid="structure-cpd00013"]')).toBeTruthy());
            expect(rendererCalls.filter((call) => call.compoundId === 'cpd00013').at(-1)?.elementColors).toBeUndefined();
            expect(container.querySelector('[data-testid="structure-cpd00067"]')).toBeNull();
        });
    });


});

    describe('mapping precision disclosure', () => {
        const graphFor = (compoundId: string) => ({
            cpd00001: { elements: ['O'], bonds: [] },
            cpd00009: { elements: ['O', 'P', 'O', 'O', 'O'], bonds: [[0, 1], [1, 2], [1, 3], [1, 4]] },
        }[compoundId]);

        async function provideGraphs() {
            await waitFor(() => expect(rendererCalls.some((call) => graphFor(call.compoundId as string))).toBe(true));
            for (const call of rendererCalls.slice()) {
                const graph = graphFor(call.compoundId as string);
                if (graph) (call.onGraph as (value: typeof graph) => void)(graph);
            }
        }

        it('renders exact, symmetry-orbit, element-level, and unresolved precision labels', async () => {
            vi.mocked(getStructuresByIds).mockResolvedValueOnce(new Map([
                ['cpd00001', { id: 'cpd00001', inchi: 'InChI=1S/H2O/h1H2' }],
                ['cpd00009', { id: 'cpd00009', inchi: 'InChI=1S/H3O4P/c1-5(2,3)4/h(H3,1,2,3,4)/p-2' }],
            ]));
            const { getByRole, container } = renderEquation({ equation: 'cpd00001[c] => cpd00009[c]', atomMappingPairs: parseAtomMappings(['cpd00001:O#1=cpd00009:O#1']) });
            await provideGraphs();
            await waitFor(() => expect(getByRole('button', { name: 'Water: Exact atom mapping' })).toBeTruthy());
            expect(getByRole('button', { name: 'Phosphate: Symmetry-equivalent atoms' })).toBeTruthy();
            const precisionSummary = Array.from(container.querySelectorAll('.MuiTypography-caption')).find((node) => node.textContent?.startsWith('Precision:'));
            expect(precisionSummary?.textContent).toContain('Precision:');
            expect(precisionSummary?.textContent).not.toContain('0 ');

            // Unsupported InChI can honestly colour a complete element block, while absent structure remains unresolved.
            vi.mocked(getStructuresByIds).mockResolvedValueOnce(new Map([['cpd00001', { id: 'cpd00001', inchi: 'InChI=1S/p+1' }]]));
            const elementBlock = renderEquation({ equation: 'cpd00001[c] => cpd00009[c]', atomMappingPairs: parseAtomMappings(['cpd00001:O#1=cpd00009:O#1']) });
            await provideGraphs();
            await waitFor(() => expect(elementBlock.getByRole('button', { name: 'Water: Element-level mapping' })).toBeTruthy());
            expect(elementBlock.getByRole('button', { name: 'Phosphate: No atom mapping shown' })).toBeTruthy();
        });

        it('associates a keyboard-activated precision control with its explanation', async () => {
            vi.mocked(getStructuresByIds).mockResolvedValueOnce(new Map([['cpd00001', { id: 'cpd00001', inchi: 'InChI=1S/H2O/h1H2' }]]));
            const { getAllByRole } = renderEquation({ equation: 'cpd00001[c] => cpd00001[c]', atomMappingPairs: parseAtomMappings(['cpd00001:O#1=cpd00001:O#1']) });
            await provideGraphs();
            const control = await waitFor(() => getAllByRole('button', { name: 'Water: Exact atom mapping' })[0]);
            fireEvent.keyDown(control, { key: 'Enter' });
            expect(control.getAttribute('aria-expanded')).toBe('true');
            expect(document.getElementById(control.getAttribute('aria-describedby') ?? '')?.textContent).toContain('exact mapped atom');
        });

        it('keeps participants visible and reports a structures-query error while preserving honest element-level colours', async () => {
            vi.mocked(getStructuresByIds).mockRejectedValueOnce(new Error('structure fetch failed'));
            const { container, getByRole } = renderEquation({ atomMappingPairs: pairs });
            await waitFor(() => expect(getByRole('status').textContent).toContain('Structure data could not be loaded, so atom-level mapping precision is unavailable and any colours shown are element-level at best.'));
            expect(container.querySelector('[data-testid="structure-cpd00009"]')).toBeTruthy();
            const phosphate = rendererCalls.filter((call) => call.compoundId === 'cpd00009').at(-1)!;
            (phosphate.onGraph as (graph: unknown) => void)({ elements: ['O', 'P', 'O', 'O', 'O'], bonds: [[0, 1], [1, 2], [1, 3], [1, 4]] });
            await waitFor(() => expect(Object.keys(rendererCalls.filter((call) => call.compoundId === 'cpd00009').at(-1)?.atomColors as Record<number, string>)).not.toHaveLength(0));
        });

        it('renders no mapping legend or precision controls when no mapping pairs exist', async () => {
            const { container, queryByRole } = renderEquation();
            await waitFor(() => expect(container.querySelector('[data-testid="structure-cpd00009"]')).toBeTruthy());
            expect(queryByRole('list', { name: 'Atom mapping legend' })).toBeNull();
            expect(queryByRole('button', { name: /mapping$/ })).toBeNull();
        });
    });
