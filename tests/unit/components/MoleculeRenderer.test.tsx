import { describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import MoleculeRenderer from '@/components/ui/MoleculeRenderer';

const getMol = vi.fn(() => ({
    get_json: () => JSON.stringify({ molecules: [{ atoms: [{ z: 8 }, { z: 15 }], bonds: [{ atoms: [0, 1] }] }] }),
    get_svg: vi.fn(() => "<svg><path class='bond-0 atom-0 atom-1' style='stroke:#000000' /><path class='atom-0' fill='#000000'/></svg>"),
    get_svg_with_highlights: vi.fn(() => "<svg><path class='bond-0 atom-0 atom-1' style='stroke:#000000' /><path class='atom-0' fill='#000000'/></svg>"),
    delete: vi.fn(),
}));

vi.mock('@/lib/rdkit', () => ({ getRDKit: vi.fn(async () => ({ get_mol: getMol })) }));

describe('MoleculeRenderer', () => {
    it('applies explicit bond colours to locally produced SVG output', async () => {
        const { container } = render(<MoleculeRenderer compoundId="cpd00009" smiles="OP" bondColors={{ 0: '#123456' }} />);
        await waitFor(() => expect(container.innerHTML).toContain('stroke:#123456'));
    });

    it('colours atom labels without requesting RDKit highlights', async () => {
        const { container } = render(<MoleculeRenderer compoundId="cpd00009" smiles="OP" atomColors={{ 0: '#123456' }} />);
        await waitFor(() => expect(container.querySelector('[class="atom-0"]')?.getAttribute('fill')).toBe('#123456'));
        const mol = getMol.mock.results.at(-1)?.value;
        expect(mol.get_svg).toHaveBeenCalled();
        expect(mol.get_svg_with_highlights).not.toHaveBeenCalled();
    });

    it('renders a stored SVG unmodified when no SMILES is available', () => {
        const fallbackSvg = '<svg data-stored="true"><path style="stroke:#000000" /></svg>';
        const { container } = render(<MoleculeRenderer compoundId="cpd00009" fallbackSvg={fallbackSvg} />);
        expect(container.querySelector('svg')?.getAttribute('data-stored')).toBe('true');
        expect(container.innerHTML).toContain('stroke:#000000');
    });
});
