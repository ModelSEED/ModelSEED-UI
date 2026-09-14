import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CompoundDetailPage from '@/app/(reference-data)/biochem/compounds/[id]/page';
import ReactionDetailPage from '@/app/(reference-data)/biochem/reactions/[id]/page';

const { mockUseQuery } = vi.hoisted(() => ({
    mockUseQuery: vi.fn(),
}));

vi.mock('next/navigation', () => ({
    useParams: () => ({ id: 'test-id' }),
}));

vi.mock('@tanstack/react-query', () => ({
    useQuery: mockUseQuery,
}));

const tooltipCases = [
    ['A', 'Grade is an evidence confidence tier.'],
    ['curated', 'Assessment is a thermodynamic assessment.'],
    ['ModelSEED', 'Source identifies the database or source.'],
    ['consistent', 'Cross-source indicates agreement across sources.'],
] as const;

const thermoEvidence = {
    grade: 'A',
    assessment: 'curated',
    source: 'ModelSEED',
    cross_source: 'consistent',
};

async function expectThermodynamicsTooltips() {
    for (const [label, explanation] of tooltipCases) {
        fireEvent.mouseOver(screen.getByText(label));
        expect(await screen.findByText(explanation)).toBeTruthy();
        fireEvent.mouseLeave(screen.getByText(label));
    }
}

describe('biochemistry detail thermodynamics tooltips', () => {
    beforeEach(() => {
        mockUseQuery.mockReset();
    });

    it('explains thermodynamics evidence on the compound detail page', async () => {
        mockUseQuery.mockImplementation(({ queryKey }: { queryKey: string[] }) => {
            if (queryKey[0] === 'compound') {
                return {
                    data: {
                        id: 'cpd00001',
                        name: 'Water',
                        formula: 'H2O',
                        mass: 18,
                        charge: 0,
                        is_obsolete: '0',
                        thermo_evidence: [thermoEvidence],
                    },
                    isLoading: false,
                    error: null,
                };
            }

            return {
                data: { docs: [], numFound: 0 },
                isLoading: false,
                error: null,
            };
        });

        render(<CompoundDetailPage />);

        await expectThermodynamicsTooltips();
    });

    it('shows the LLM council direction separately from thermodynamics evidence on the reaction detail page', async () => {
        mockUseQuery.mockReturnValue({
            data: {
                id: 'rxn00001',
                name: 'Water reaction',
                definition: 'H2O <=> H2O',
                equation: 'H2O <=> H2O',
                reversibility: '=',
                is_obsolete: '0',
                thermo_evidence: [thermoEvidence],
                llm_council_proposals: [{ source_name: 'LLMs', proposed_direction: '>' }],
            },
            isLoading: false,
            error: null,
        });

        render(<ReactionDetailPage />);

        expect(screen.getByText('LLM council proposal')).toBeTruthy();
        expect(screen.getByText('LLMs')).toBeTruthy();
        expect(screen.getByText('Proposed direction: >')).toBeTruthy();
        expect(screen.queryByText('ΔG (kcal/mol)')).toBeNull();
        await expectThermodynamicsTooltips();
    });
});
