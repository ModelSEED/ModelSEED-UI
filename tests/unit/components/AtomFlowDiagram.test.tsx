import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import AtomFlowDiagram from '@/components/ui/AtomFlowDiagram';
import { parseAtomMappings } from '@/lib/utils/atomMapping';

const RXN00001_PAIRS = parseAtomMappings([
    'rxn00001 cpd00001:O#1=cpd00009:O#2',
    'rxn00001 cpd00012:O#1=cpd00009:O#1',
    'rxn00001 cpd00012:O#2=cpd00009:O#2',
    'rxn00001 cpd00012:O#3=cpd00009:O#3',
    'rxn00001 cpd00012:O#4=cpd00009:O#3',
    'rxn00001 cpd00012:O#5=cpd00009:O#1',
    'rxn00001 cpd00012:O#6=cpd00009:O#4',
    'rxn00001 cpd00012:O#7=cpd00009:O#4',
    'rxn00001 cpd00012:P#1=cpd00009:P#1',
    'rxn00001 cpd00012:P#2=cpd00009:P#1',
]);

describe('AtomFlowDiagram', () => {
    it('renders nothing for an empty pair list', () => {
        const { container } = render(<AtomFlowDiagram pairs={[]} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders compound ids, totals, links, and element breakdowns', () => {
        const { container, getByText } = render(<AtomFlowDiagram pairs={RXN00001_PAIRS} />);

        expect(container.textContent).toContain('cpd00001');
        expect(container.textContent).toContain('cpd00009');
        expect(container.querySelector('title')?.textContent).toContain('1 atoms (O 1)');
        expect(container.querySelectorAll('title')[1]?.textContent).toContain('9 atoms (O 7, P 2)');
        expect(getByText('cpd00009').closest('a')?.getAttribute('href')).toBe(
            '/biochem/compounds/cpd00009',
        );
    });
});
