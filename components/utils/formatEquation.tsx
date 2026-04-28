import React from 'react';
import Link from 'next/link';

/**
 * Formats a reaction equation/definition string.
 * Finds all occurrences of valid compound IDs (e.g., cpd00001)
 * and turns them into clickable links pointing to /biochem/compounds/[id].
 * It also cleans up compartment brackets like [0] or stoichiometric coefficients like (1).
 */
export function formatEquation(equation: string | undefined | null): React.ReactNode {
    if (!equation) return 'N/A';

    // Basic cleanup of ModelSEED equation syntax for display
    const cleaned = equation
        // Remove compartment tags like [0]
        .replace(/\[\d+\]/g, '')
        // Clean stoichiometry parentheses like (1) or (1.0). Keep the numbers but strip parens, 
        // actually in UI it usually looks better to keep the multiplier before the compound.
        // Let's just remove (1) when it's just '1' for clarity, or leave it alone.
        .replace(/\(1\)\s*/g, '');

    // Find compound IDs (cpd followed by 5 digits)
    const compoundRegex = /(cpd\d{5})/g;

    // Split the cleaned string by compound IDs
    const parts = cleaned.split(compoundRegex);

    return (
        <span style={{ fontFamily: 'monospace' }}>
            {parts.map((part, index) => {
                if (compoundRegex.test(part)) {
                    // It's a compound ID, wrap it in a Link
                    return (
                        <Link
                            key={index}
                            href={`/biochem/compounds/${part}`}
                            style={{ color: '#1976d2', textDecoration: 'none' }}
                        >
                            {part}
                        </Link>
                    );
                }

                // For other text (like '+', '<=>', multipliers), render as normal span
                return <span key={index}>{part}</span>;
            })}
        </span>
    );
}
