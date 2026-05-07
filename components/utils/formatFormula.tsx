import React from 'react';

/**
 * Formats a chemical formula string by wrapping numbers in <sub> tags.
 * E.g., "H2O" becomes "H<sub>2</sub>O".
 */
export function formatFormula(formula: string | undefined | null): React.ReactNode {
    if (!formula) return 'N/A';

    // Replace sequences of digits with <sub>digits</sub>
    // We split by standard regex group match
    const parts = formula.split(/(\d+)/);

    return (
        <>
            {parts.map((part, i) => {
                if (/\d+/.test(part)) {
                    return <sub key={i}>{part}</sub>;
                }
                return <span key={i}>{part}</span>;
            })}
        </>
    );
}
