import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Chip from '@mui/material/Chip';
import ThermodynamicsTable, { EvidenceSummary } from '@/components/ui/ThermodynamicsTable';
import type { ThermodynamicsRecord } from '@/lib/api/biochem';
import { ReversibilityCell } from '@/app/(reference-data)/biochem/reactions/page';
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

    it.each(['gold', 'silver', 'bronze'])('renders %s evidence in an ordered grade-colored frame with focusable tooltips', (grade) => {
        const { container } = render(<EvidenceSummary item={{ grade, assessment: 'unconfident', cross_source: 'outvoted', source: 'eQ' }} />);
        const summary = container.querySelector(`[data-grade="${grade}"]`);
        expect(summary?.textContent).not.toContain('/');
        expect(summary?.textContent).toContain('Thermodynamics evidence');
        expect([...container.querySelectorAll('dt')].map((label) => label.textContent)).toEqual(['Grade', 'Assessment', 'Cross-source', 'Source']);
        expect(container.querySelectorAll('.thermo-evidence__item')).toHaveLength(4);
        expect(container.querySelector('.thermo-evidence__title')).toBeTruthy();
        expect(container.querySelector('.thermo-evidence__list')).toBeTruthy();
        expect(container.querySelectorAll('[tabindex="0"]')).toHaveLength(4);
        expect(summary?.className).toContain(`thermo-evidence--${grade}`);
        expect(container.querySelector(`[aria-label="grade ${grade}"]`)).toBeTruthy();
        expect(container.querySelector('[aria-label="assessment unconfident"]')).toBeTruthy();
        expect(container.querySelector('[aria-label="cross-source outvoted"]')).toBeTruthy();
        expect(container.querySelector('[aria-label="source eQ"]')).toBeTruthy();
    });

    it.each([
        ['GOLD', '#fff8e1', '#b88900'],
        ['silver', '#f5f7fa', '#7b8794'],
        ['Bronze', '#f8eee8', '#b87333'],
    ])('renders %s reaction reversibility as an accessible color-only swatch', (grade, backgroundColor, borderColor) => {
        const { container } = render(<ReversibilityCell reaction={{ id: 'rxn1', reversibility: '>', thermo_evidence: [{ grade }] } as never} />);
        const badge = container.querySelector(`[data-grade="${grade.toLowerCase()}"]`) as HTMLElement;
        const label = `Reversibility >; evidence grade ${grade.toLowerCase()}`;
        expect(badge.textContent).toBe('');
        expect(badge.getAttribute('title')).toBe(label);
        expect(badge.getAttribute('aria-label')).toBe(label);
        expect(badge.style.backgroundColor).toBe(backgroundColor);
        expect(badge.style.borderColor).toBe(borderColor);
    });

    it.each(['>', '<', '?', '='])('keeps the %s operator in swatch accessibility metadata', (reversibility) => {
        const { container } = render(<ReversibilityCell reaction={{ id: 'rxn1', reversibility, thermo_evidence: [{ grade: 'gold' }] } as never} />);
        const badge = container.querySelector('[data-testid="reversibility-badge"]');
        const label = `Reversibility ${reversibility}; evidence grade gold`;
        expect(badge?.textContent).toBe('');
        expect(badge?.getAttribute('title')).toBe(label);
        expect(badge?.getAttribute('aria-label')).toBe(label);
    });

    it('renders reaction reversibility as a white swatch with a neutral border when evidence has no recognized grade', () => {
        const { container } = render(<ReversibilityCell reaction={{ id: 'rxn1', reversibility: '<', thermo_evidence: [{ grade: 'unknown' }] } as never} />);
        const badge = container.querySelector('[data-testid="reversibility-badge"]') as HTMLElement;
        expect(badge.getAttribute('data-grade')).toBeNull();
        expect(badge.textContent).toBe('');
        expect(badge.getAttribute('title')).toBe('Reversibility <; evidence grade no grade');
        expect(badge.getAttribute('aria-label')).toBe('Reversibility <; evidence grade no grade');
        expect(badge.style.backgroundColor).toBe('#fff');
        expect(badge.style.borderColor).toBe('#757575');
    });

    it('omits absent cross-source evidence while retaining the ordered remaining fields and accessible values', () => {
        const { container } = render(<EvidenceSummary item={{ grade: 'silver', assessment: 'self-confident', source: 'eQ' }} />);
        expect([...container.querySelectorAll('dt')].map((label) => label.textContent)).toEqual(['Grade', 'Assessment', 'Source']);
        expect(container.querySelectorAll('.thermo-evidence__item')).toHaveLength(3);
        expect(container.querySelector('[aria-label="cross-source (absent)"]')).toBeNull();
        expect(container.querySelector('[aria-label="Thermo evidence, grade silver, assessment self-confident, source eQ"]')).toBeTruthy();
        expect(container.querySelectorAll('[tabindex="0"]')).toHaveLength(3);
    });

    it('retains unpaired cross-source evidence', () => {
        const { container } = render(<EvidenceSummary item={{ grade: 'silver', assessment: 'self-confident', cross_source: 'unpaired', source: 'eQ' }} />);
        expect(container.querySelector('[aria-label="cross-source unpaired"]')?.textContent).toBe('unpaired');
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
