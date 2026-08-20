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
            cpd00002: { C: 1, O: 2 }, cpd00003: { C: 1, O: 2 },
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
        expect(container.querySelector('.mol-wrapper')).toBeNull();
        expect(container.querySelector('[data-testid="structure-cpd00001"]')).toBeNull();
        expect(container.textContent).toContain('+');
        expect(container.textContent).toContain('⇒');
        expect(getByText('Water', { selector: 'a p' }).closest('a')?.getAttribute('href')).toBe('/biochem/compounds/cpd00001');
        expect(container.textContent).toContain('cpd00001');
    });

    it('uses one phosphorus colour on both compounds and discloses ambiguous mappings', async () => {
        const { container } = renderEquation({ atomMappingPairs: pairs });
        await waitFor(() => expect(container.textContent).toContain('Atom mapping'));
        expect(container.querySelectorAll('[aria-label="Atom mapping legend"] li')).toHaveLength(1);
        await waitFor(() => expect(rendererCalls.filter((call) => call.elementColors).length).toBeGreaterThan(0));
        const donor = rendererCalls.filter((call) => call.compoundId === 'cpd00012').at(-1)?.elementColors as Record<string, string>;
        const product = rendererCalls.filter((call) => call.compoundId === 'cpd00009').at(-1)?.elementColors as Record<string, string>;
        expect(donor.P).toBe(product.P);
        expect(container.textContent).toContain('atoms split across multiple products');
        expect(container.textContent).toContain('the corresponding atoms could not be resolved');
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

    it('renders a compound with three or fewer heavy atoms as a text token instead of a structure', async () => {
        const { container } = renderEquation();
        await waitFor(() => expect(container.querySelector('[data-testid="structure-cpd00012"]')).toBeTruthy());
        expect(container.querySelector('[data-testid="structure-cpd00001"]')).toBeNull();
        expect(container.querySelector('a[href="/biochem/compounds/cpd00001"]')).toBeTruthy();
        expect(container.querySelector('[data-testid="structure-cpd00012"]')).toBeTruthy();
    });

    it('orders drawn structures before simple ion text tokens on the same side', async () => {
        const { container, getByText } = renderEquation({ equation: 'cpd00001[c] + cpd00012[c] => cpd00009[c]' });
        await waitFor(() => expect(container.querySelector('[data-testid="structure-cpd00012"]')).toBeTruthy());
        const equation = container.querySelector('[aria-label^="Chemical equation:"]');
        const structure = container.querySelector('[data-testid="structure-cpd00012"]');
        const water = getByText('Water', { selector: 'a p' });
        expect(structure && water && Boolean(structure.compareDocumentPosition(water) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
        expect(equation?.textContent).toContain('Phosphate donor');
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

    it('renders an unboxed placeholder when a compound SMILES is missing', async () => {
        vi.mocked(getCompoundsForReaction).mockResolvedValueOnce(new Map([
            ['cpd00001', compound({ name: 'Water', smiles: 'O', formula: 'H2O', charge: 0 })],
            ['cpd00012', compound({ name: 'Phosphate donor', formula: 'H4O7P2', charge: -2 })],
            ['cpd00009', compound({ name: 'Phosphate', smiles: 'OP(=O)(O)O', formula: 'H3O4P', charge: -1 })],
        ]));
        const { getByTestId, getByText } = renderEquation();
        await waitFor(() => expect(getByText('Compound image unavailable')).toBeTruthy());
        expect(getByTestId('structure-cpd00012').getAttribute('style')).not.toContain('border');
    });

    it('formats zero and negative compound charges as intended', async () => {
        const { container } = renderEquation();
        await waitFor(() => expect(container.textContent).toContain('cpd00012'));
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

    it('explains when compound details could not be loaded', async () => {
        vi.mocked(getCompoundsForReaction).mockRejectedValueOnce(new Error('fetch failed'));
        const { getByText } = renderEquation();
        await waitFor(() => expect(getByText('Compound details could not be loaded.')).toBeTruthy());
    });

    it('leaves multi-element simple ions uncoloured and explains the ambiguity', async () => {
        vi.mocked(getCompoundsForReaction).mockResolvedValueOnce(new Map([
            ['cpd00002', compound({ name: 'Carbon dioxide', smiles: 'O=C=O', formula: 'CO2', charge: 0 })],
            ['cpd00003', compound({ name: 'Carbon dioxide product', smiles: 'O=C=O', formula: 'CO2', charge: 0 })],
        ]));
        const multiElementPairs = parseAtomMappings([
            'cpd00002:C#1=cpd00003:C#1',
            'cpd00002:(O#1;O#2)=cpd00003:(O#1;O#2)',
        ]);
        const { getByText } = renderEquation({ equation: 'cpd00002[c] => cpd00003[c]', atomMappingPairs: multiElementPairs });
        await waitFor(() => expect(getByText(/simple ions with multiple independently mapped elements/)).toBeTruthy());
        expect(getByText('Carbon dioxide', { selector: 'a p' }).getAttribute('style')).toBeNull();
    });

});
