import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Chip from '@mui/material/Chip';
import ThermodynamicsTable from '@/components/ui/ThermodynamicsTable';
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

        expect(screen.getByText('Sources could agree on direction')).toBeTruthy();
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
