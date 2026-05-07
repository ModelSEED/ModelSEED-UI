import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { formatEquation } from '@/components/utils/formatEquation';

describe('formatEquation', () => {
    describe('handles null/undefined/empty values', () => {
        it('returns N/A for undefined', () => {
            const result = formatEquation(undefined);
            expect(result).toBe('N/A');
        });

        it('returns N/A for null', () => {
            const result = formatEquation(null);
            expect(result).toBe('N/A');
        });

        it('returns N/A for empty string', () => {
            const result = formatEquation('');
            expect(result).toBe('N/A');
        });
    });

    describe('formats equation strings', () => {
        it('renders plain text without compounds', () => {
            const { container } = render(formatEquation('H2O + ATP'));
            expect(container.textContent).toContain('H2O');
            expect(container.textContent).toContain('ATP');
        });

        it('creates links for compound IDs', () => {
            const { container } = render(formatEquation('cpd00001 + cpd00002'));
            
            const links = container.querySelectorAll('a');
            expect(links).toHaveLength(2);
            expect(links[0].getAttribute('href')).toBe('/biochem/compounds/cpd00001');
            expect(links[1].getAttribute('href')).toBe('/biochem/compounds/cpd00002');
        });

        it('removes compartment tags like [0]', () => {
            const { container } = render(formatEquation('cpd00001[0] + cpd00002[1]'));
            
            expect(container.textContent).not.toContain('[0]');
            expect(container.textContent).not.toContain('[1]');
            expect(container.textContent).toContain('cpd00001');
            expect(container.textContent).toContain('cpd00002');
        });

        it('removes (1) stoichiometry notation', () => {
            const { container } = render(formatEquation('(1) cpd00001 + (1) cpd00002'));
            
            expect(container.textContent).not.toContain('(1)');
            expect(container.textContent).toContain('cpd00001');
        });

        it('preserves non-(1) stoichiometry', () => {
            const { container } = render(formatEquation('(2) cpd00001 + (0.5) cpd00002'));
            
            expect(container.textContent).toContain('(2)');
            expect(container.textContent).toContain('(0.5)');
        });

        it('preserves reaction arrows', () => {
            const { container } = render(formatEquation('cpd00001 <=> cpd00002'));
            
            expect(container.textContent).toContain('<=>');
        });

        it('preserves plus signs', () => {
            const { container } = render(formatEquation('cpd00001 + cpd00002'));
            
            expect(container.textContent).toContain('+');
        });
    });

    describe('renders styled output', () => {
        it('wraps output in monospace span', () => {
            const { container } = render(formatEquation('cpd00001'));
            
            const outerSpan = container.querySelector('span');
            expect(outerSpan).not.toBeNull();
            expect(outerSpan?.style.fontFamily).toBe('monospace');
        });

        it('styles links with appropriate color', () => {
            const { container } = render(formatEquation('cpd00001'));
            
            const link = container.querySelector('a');
            expect(link).not.toBeNull();
            expect(link?.style.color).toBe('#1976d2');
        });
    });
});
