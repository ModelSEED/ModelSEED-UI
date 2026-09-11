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
    ['bronze', 'Weakest evidence: below 70% likely, or contradicted by the other sources.'],
    ['unconfident', 'Below 70% likely. Most reactions sit here.'],
    ['outvoted', 'The other sources disagree by more than their error bars allow, and this one is the outlier. Costs a tier.'],
    ['eQ', "eQuilibrator's component-contribution estimate."],
] as const;

const thermoEvidence = {
    grade: 'bronze',
    assessment: 'unconfident',
    source: 'eQ',
    cross_source: 'outvoted',
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
                        deltag: -3.2,
                        deltagerr: 0.2,
                        thermodynamics: [
                            { source_name: 'eQuilibrator', energy: -1, error: 0.1 },
                            { source_name: 'Group contribution', energy: -1.1, error: 0.2 },
                        ],
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

        expect(screen.getByText('eQuilibrator')).toBeTruthy();
        expect(screen.getByText('Group contribution')).toBeTruthy();
        expect(screen.queryByText('ΔG: -3.2 ± 0.2 kcal/mol')).toBeNull();
    });

    it('keeps per-source reaction thermodynamics while omitting aggregate dG and dGErr', async () => {
        mockUseQuery.mockReturnValue({
            data: {
                id: 'rxn00001',
                name: 'Water reaction',
                definition: 'H2O <=> H2O',
                equation: 'H2O <=> H2O',
                reversibility: '=',
                is_obsolete: '0',
                deltag: -7.5,
                deltagerr: 0.4,
                thermodynamics: [
                    { source_name: 'eQuilibrator', energy: -7.5, error: 0.4, operator: '>' },
                    { source_name: 'Alberty', energy: -7.2, error: 0.5, operator: '=' },
                ],
                thermo_evidence: [thermoEvidence],
                llm_council_proposals: [{ source_name: 'LLMs', proposed_direction: '>' }],
            },
            isLoading: false,
            error: null,
        });

        render(<ReactionDetailPage />);

        expect(screen.getByText('Thermodynamics')).toBeTruthy();
        const recommendedReversibility = screen.getByTestId('thermo-summary-band');
        expect(recommendedReversibility.getAttribute('role')).toBeNull();
        expect(recommendedReversibility.textContent).toContain('Recommended reversibility');
        expect(recommendedReversibility.querySelector('.thermo-evidence--bronze')).toBeTruthy();
        expect(recommendedReversibility.querySelector('.thermo-evidence__title')?.textContent).toBe('Thermodynamics evidence');
        expect(recommendedReversibility.querySelectorAll('.thermo-evidence__item')).toHaveLength(4);
        const recommendedOperator = recommendedReversibility.querySelector('.thermo-direction-operator');
        expect(recommendedOperator?.textContent).toBe('=');
        expect(recommendedOperator?.getAttribute('data-direction')).toBe('=');
        expect(recommendedOperator?.getAttribute('aria-label')).toBe('=');
        expect(screen.queryByTestId('direction-agreement')).toBeNull();
        expect(screen.queryByText(['Sources could', 'agree on direction'].join(' '))).toBeNull();
        expect(screen.getByText('eQuilibrator')).toBeTruthy();
        expect(screen.getByText('Alberty')).toBeTruthy();
        expect(screen.getByText('LLM Council')).toBeTruthy();
        expect(screen.getAllByText('>')).toHaveLength(2);
        expect(screen.getByText('ΔG (kcal/mol)')).toBeTruthy();
        expect(screen.queryByText('LLM Council Proposal: >')).toBeNull();
        expect(screen.queryByText('ΔG: -7.5 ± 0.4 kcal/mol')).toBeNull();
        await expectThermodynamicsTooltips();
    });
});
