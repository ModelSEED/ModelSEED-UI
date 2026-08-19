import { describe, expect, it } from 'vitest';
import {
    classifyDirectionAgreement,
    directionAgreementFromRecords,
    DIRECTION_AGREEMENT_LABEL,
} from '@/lib/utils/reactionDirection';

describe('classifyDirectionAgreement', () => {
    it.each([
        [['='], 'agree'],
        [['>'], 'agree'],
        [['<'], 'agree'],
        [['=', '='], 'agree'],
        [['>', '>', '>'], 'agree'],
        [['=', '>'], 'could-agree'],
        [['>', '='], 'could-agree'],
        [['=', '<'], 'could-agree'],
        [['=', '<', '='], 'could-agree'],
        [['>', '<'], 'disagree'],
        [['<', '>'], 'disagree'],
        [['=', '>', '<'], 'disagree'],
        [[], null],
        [[undefined, null, '', '  '], null],
        [['=', undefined, '>'], 'could-agree'],
        [['>', '>'], 'agree'],
        [['<', '=', '<'], 'could-agree'],
        [['=', '='], 'agree'],
        [['<', '='], 'could-agree'],
        [['=', '>', '<'], 'disagree'],
    ] as const)('classifies %j as %s', (directions, expected) => {
        expect(classifyDirectionAgreement(directions)).toBe(expected);
    });

    it("classifies a set containing both '>' and '<' as disagree when '=' is also present", () => {
        expect(classifyDirectionAgreement(['>', '<', '='])).toBe('disagree');
    });

    it('uses the literal rule for multi-character operators pending real multi-character data', () => {
        expect(classifyDirectionAgreement(['<=>'])).toBe('agree');
        expect(classifyDirectionAgreement(['<=>', '='])).toBe('disagree');
    });
});

describe('directionAgreementFromRecords', () => {
    it('adapts thermodynamics records', () => {
        const disagreeingRecords = [
            { source_name: 'a', operator: '>' },
            { source_name: 'b', operator: '<' },
        ];
        const recordsWithoutOperator: Array<{
            source_name: string;
            operator?: string;
        }> = [{ source_name: 'a' }];

        expect(directionAgreementFromRecords(disagreeingRecords)).toBe('disagree');
        expect(directionAgreementFromRecords(recordsWithoutOperator)).toBeNull();
    });
});

describe('DIRECTION_AGREEMENT_LABEL', () => {
    it('uses the exact direction labels', () => {
        expect(DIRECTION_AGREEMENT_LABEL).toEqual({
            agree: 'Sources agree on direction',
            'could-agree': 'Sources could agree on direction',
            disagree: 'Sources disagree on direction',
        });
    });
});
