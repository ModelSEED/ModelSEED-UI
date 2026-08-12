import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import AtomMappingSummary from '@/components/ui/AtomMappingSummary';

const VALID_PAIRS = [
    'cpd00001:O#1=cpd00009:O#2',
    'cpd00012:O#1=cpd00009:O#1',
    'cpd00012:O#2=cpd00009:O#2',
    'cpd00012:O#3=cpd00009:O#3',
    'cpd00012:O#4=cpd00009:O#3',
];

describe('AtomMappingSummary', () => {
    it('renders nothing when entries is undefined', () => {
        const { container } = render(<AtomMappingSummary entries={undefined} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders nothing when entries contains only malformed strings', () => {
        const { container } = render(
            <AtomMappingSummary entries={['not-a-pair', 'also-bad=nope', '']} />,
        );
        expect(container.firstChild).toBeNull();
    });

    it('renders the summary count and all compound ids for the five valid pairs', () => {
        const { container } = render(<AtomMappingSummary entries={VALID_PAIRS} />);

        expect(container.textContent).toContain('5 atom mappings across 3 compounds');
        expect(container.textContent).toContain('cpd00001');
        expect(container.textContent).toContain('cpd00009');
        expect(container.textContent).toContain('cpd00012');
    });

    it('renders a success chip for confidence "clean"', () => {
        const { container } = render(<AtomMappingSummary entries={VALID_PAIRS} confidence="clean" />);
        expect(container.textContent).toContain('clean');
    });

    it('renders a warning chip for confidence "salvaged"', () => {
        const { container } = render(<AtomMappingSummary entries={VALID_PAIRS} confidence="salvaged" />);
        expect(container.textContent).toContain('salvaged');
    });

    it('still renders a chip for an unrecognised confidence value', () => {
        const { container } = render(
            <AtomMappingSummary entries={VALID_PAIRS} confidence="mystery-value" />,
        );
        expect(container.textContent).toContain('mystery-value');
    });

    it('hides the raw pair list until the toggle is clicked, then shows it', () => {
        const { container, getByText } = render(<AtomMappingSummary entries={VALID_PAIRS} />);

        expect(container.textContent).not.toContain('cpd00001:O#1=cpd00009:O#2');

        fireEvent.click(getByText('Show all mappings'));

        expect(container.textContent).toContain('cpd00001:O#1=cpd00009:O#2');
        expect(container.textContent).toContain('cpd00012:O#4=cpd00009:O#3');
    });
});
