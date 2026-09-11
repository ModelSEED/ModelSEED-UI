import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Chip from '@mui/material/Chip';
import ThermodynamicsTable, { EvidenceSummary } from '@/components/ui/ThermodynamicsTable';
import type { ThermodynamicsRecord } from '@/lib/api/biochem';
import {
    directionAgreementFromRecords,
    DIRECTION_AGREEMENT_COLOR,
    DIRECTION_AGREEMENT_LABEL,
} from '@/lib/utils/reactionDirection';

describe('ThermodynamicsTable', () => {
    it('renders nothing for an empty array', () => {
        const { container } = render(<ThermodynamicsTable records={[]} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders one body row per record, in the given order', () => {
        const records: ThermodynamicsRecord[] = [
            { source_name: 'eQuilibrator', energy: -12.3, error: 0.5 },
            { source_name: 'Alberty', energy: -10.1, error: 1.2 },
            { source_name: 'Jankowski', energy: -8.4, error: 0.9 },
        ];
        const { container } = render(<ThermodynamicsTable records={records} />);

        const rows = container.querySelectorAll('tbody tr');
        expect(rows).toHaveLength(3);
        expect(rows[0].textContent).toContain('eQuilibrator');
        expect(rows[1].textContent).toContain('Alberty');
        expect(rows[2].textContent).toContain('Jankowski');
    });

    it('renders N/A for null energy and null error', () => {
        const records: ThermodynamicsRecord[] = [
            { source_name: 'eQuilibrator', energy: null, error: null },
        ];
        const { container } = render(<ThermodynamicsTable records={records} />);

        const row = container.querySelector('tbody tr');
        expect(row?.textContent).toContain('N/A');
    });

    it('hides the Operator column when showOperator is false', () => {
        const records: ThermodynamicsRecord[] = [
            { source_name: 'eQuilibrator', energy: -1, error: 0.1, operator: '=' },
        ];
        const { container } = render(<ThermodynamicsTable records={records} showOperator={false} />);

        expect(container.textContent).not.toContain('Operator');
    });

    it('shows the Operator column with its value when showOperator is true', () => {
        const records: ThermodynamicsRecord[] = [
            { source_name: 'eQuilibrator', energy: -1, error: 0.1, operator: '=' },
        ];
        const { container } = render(<ThermodynamicsTable records={records} showOperator />);

        expect(container.textContent).toContain('Operator');
        const row = container.querySelector('tbody tr');
        expect(row?.textContent).toContain('=');
    });

    it('renders both rows when source_name is duplicated across records', () => {
        const records: ThermodynamicsRecord[] = [
            { source_name: 'eQuilibrator', energy: -1, error: 0.1 },
            { source_name: 'eQuilibrator', energy: -2, error: 0.2 },
        ];
        const { container } = render(<ThermodynamicsTable records={records} />);

        const rows = container.querySelectorAll('tbody tr');
        expect(rows).toHaveLength(2);
        expect(rows[0].textContent).toContain('-1');
        expect(rows[1].textContent).toContain('-2');
    });

    it('keeps record order and puts each proposal evidence in its LLM Council row', () => {
        const records: ThermodynamicsRecord[] = [
            { source_name: 'eQuilibrator', energy: -1, error: 0.1, operator: '=' },
            { source_name: 'Alberty', energy: -2, error: 0.2, operator: '>' },
        ];
        const { container } = render(
            <ThermodynamicsTable
                records={records}
                showOperator
                llmCouncilProposals={[{ source_name: 'LLMs', proposed_direction: '<' }]}
                evidence={[{ grade: 'bronze', assessment: 'unconfident', cross_source: 'outvoted', source: 'eQ' }]}
            />,
        );

        const rows = container.querySelectorAll('tbody tr');
        expect(rows).toHaveLength(3);
        expect(rows[0].textContent).toContain('eQuilibrator');
        expect(rows[1].textContent).toContain('Alberty');
        expect(rows[2].textContent).toBe('LLM Council--<');
        expect(rows[2].querySelectorAll('td')).toHaveLength(4);
        expect(rows[2].querySelectorAll('td')[1]?.textContent).toBe('-');
        expect(rows[2].querySelectorAll('td')[2]?.textContent).toBe('-');
        expect(rows[2].querySelector('.thermo-direction-operator')?.textContent).toBe('<');
        expect(container.querySelector('[data-grade="bronze"]')).toBeNull();
        expect(container.textContent).not.toContain('Grade:');
    });

    it('renders exact evidence tooltips, including absent and unknown fallback', () => {
        const { container } = render(<EvidenceSummary item={{ grade: 'bronze', assessment: 'unconfident', cross_source: 'outvoted', source: 'eQ' }} />);
        expect(container.textContent).toBe('bronze/unconfident/outvoted/eQ');
        expect(container.querySelectorAll('[tabindex="0"]')).toHaveLength(4);
        expect(container.querySelector('[data-grade="bronze"]')?.getAttribute('style')).toContain('background-color: #78350f');
        expect(container.querySelector('[data-grade="bronze"]')?.className).toContain('thermo-evidence--bronze');
        expect(container.querySelector('[aria-label="grade bronze"]')).toBeTruthy();
        expect(container.querySelector('[aria-label="assessment unconfident"]')).toBeTruthy();
        expect(container.querySelector('[aria-label="cross-source outvoted"]')).toBeTruthy();
        expect(container.querySelector('[aria-label="source eQ"]')).toBeTruthy();
    });

    it('renders record, heuristic, recommended, and LLM operators as literal labeled badges without arrow decoration', () => {
        const { container } = render(
            <ThermodynamicsTable
                records={[
                    { source_name: 'Heuristic', energy: -1, error: 0.1, operator: '>' },
                    { source_name: 'Recommended reversibility', energy: -2, error: 0.2, operator: '<' },
                    { source_name: 'Other source', energy: -3, error: 0.3, operator: '=' },
                ]}
                showOperator
                llmCouncilProposals={[
                    { source_name: 'LLMs', proposed_direction: '>' },
                    { source_name: 'LLMs', proposed_direction: '<' },
                ]}
            />,
        );

        const operators = container.querySelectorAll('.thermo-direction-operator');
        expect(operators).toHaveLength(5);
        expect([...operators].map((operator) => operator.getAttribute('data-direction'))).toEqual(['>', '<', '=', '>', '<']);
        expect([...operators].map((operator) => operator.getAttribute('aria-label'))).toEqual(['>', '<', '=', '>', '<']);
        expect([...operators].map((operator) => operator.textContent)).toEqual(['>', '<', '=', '>', '<']);
        expect([...operators].every((operator) => operator.classList.contains('thermo-direction-operator'))).toBe(true);
        expect([...operators].every((operator) => operator.querySelector('svg, [data-arrow]') === null)).toBe(true);
        expect(container.querySelectorAll('tbody tr').length).toBe(5);
    });
});

describe('direction agreement labels', () => {
    it('shows Seaver rule 1 when all sources use equals operators', () => {
        const records: ThermodynamicsRecord[] = [
            { source_name: 'eQuilibrator', energy: -12.3, error: 0.5, operator: '=' },
            { source_name: 'Alberty', energy: -10.1, error: 1.2, operator: '=' },
            { source_name: 'Jankowski', energy: -8.4, error: 0.9, operator: '=' },
        ];
        const agreement = directionAgreementFromRecords(records);

        render(
            <>
                <Chip
                    size="small"
                    label={DIRECTION_AGREEMENT_LABEL[agreement!]}
                    color={DIRECTION_AGREEMENT_COLOR[agreement!]}
                />
                <ThermodynamicsTable records={records} showOperator />
            </>,
        );

        expect(screen.getByText('Sources agree on direction')).toBeTruthy();
        records.forEach(({ source_name }) => expect(screen.getByText(source_name)).toBeTruthy());
    });

    it('shows Seaver rule 2 when greater-than and equals operators are present', () => {
        const records: ThermodynamicsRecord[] = [
            { source_name: 'eQuilibrator', energy: -12.3, error: 0.5, operator: '>' },
            { source_name: 'Alberty', energy: -10.1, error: 1.2, operator: '=' },
        ];
        const agreement = directionAgreementFromRecords(records);

        render(
            <>
                <Chip
                    size="small"
                    label={DIRECTION_AGREEMENT_LABEL[agreement!]}
                    color={DIRECTION_AGREEMENT_COLOR[agreement!]}
                />
                <ThermodynamicsTable records={records} showOperator />
            </>,
        );

        expect(screen.getByText('Sources share a compatible direction')).toBeTruthy();
        records.forEach(({ source_name }) => expect(screen.getByText(source_name)).toBeTruthy());
    });

    it('shows Seaver rule 3 when greater-than, less-than, and equals operators are present', () => {
        const records: ThermodynamicsRecord[] = [
            { source_name: 'eQuilibrator', energy: -12.3, error: 0.5, operator: '>' },
            { source_name: 'Alberty', energy: -10.1, error: 1.2, operator: '<' },
            { source_name: 'Jankowski', energy: -8.4, error: 0.9, operator: '=' },
        ];
        const agreement = directionAgreementFromRecords(records);

        render(
            <>
                <Chip
                    size="small"
                    label={DIRECTION_AGREEMENT_LABEL[agreement!]}
                    color={DIRECTION_AGREEMENT_COLOR[agreement!]}
                />
                <ThermodynamicsTable records={records} showOperator />
            </>,
        );

        expect(screen.getByText('Sources disagree on direction')).toBeTruthy();
        records.forEach(({ source_name }) => expect(screen.getByText(source_name)).toBeTruthy());
    });
});
