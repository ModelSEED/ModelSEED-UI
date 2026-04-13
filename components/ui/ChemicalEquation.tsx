'use client';

import React from 'react';
import Link from 'next/link';

function formatSubscripts(text: string, baseOffset = 0, scope = 'txt'): React.ReactNode[] {
    const parts: React.ReactNode[] = [];

    // Split into segments but keep track of context
    // A simple approach: use a regex that captures segments of letters and digits
    const segmentRegex = /([A-Za-z]+)|(\d+(?:\.\d+)?)|([^A-Za-z\d]+)/g;
    let match;
    let lastTokenWasLetter = false;

    while ((match = segmentRegex.exec(text)) !== null) {
        const [, letters, digits, other] = match;
        const keyBase = `${scope}-${baseOffset + match.index}-${segmentRegex.lastIndex}`;

        if (letters) {
            parts.push(<span key={`${keyBase}-letters`}>{letters}</span>);
            lastTokenWasLetter = true;
        } else if (digits) {
            // ONLY subscript if it follows a letter directly (no spaces/parens in between)
            // This correctly identifies H2O vs (2) Phosphate or 2.5 H2O
            if (lastTokenWasLetter) {
                parts.push(<sub key={`${keyBase}-sub`}>{digits}</sub>);
            } else {
                parts.push(<span key={`${keyBase}-digits`}>{digits}</span>);
            }
            lastTokenWasLetter = false;
        } else {
            parts.push(<span key={`${keyBase}-other`}>{other}</span>);
            // If we hit a space or punctuation, the next digit is not a subscript
            if (other.trim().length > 0 || /\s/.test(other)) {
                lastTokenWasLetter = false;
            }
        }
    }

    return parts;
}

function formatChemicalText(text: string): React.ReactNode[] {
    const result: React.ReactNode[] = [];

    const compoundRegex = /(cpd\d{5})/g;
    let lastIndex = 0;
    let match;

    while ((match = compoundRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            const before = text.slice(lastIndex, match.index);
            result.push(...formatSubscripts(before, lastIndex, 'before'));
        }

        result.push(
            <Link
                key={`cpd-${match.index}-${match[1]}`}
                href={`/biochem/compounds/${match[1]}`}
                style={{ color: '#1976d2', textDecoration: 'none' }}
            >
                {match[1]}
            </Link>
        );

        lastIndex = match.index + match[1].length;
    }

    if (lastIndex < text.length) {
        const after = text.slice(lastIndex);
        result.push(...formatSubscripts(after, lastIndex, 'after'));
    }

    return result;
}

interface ChemicalEquationProps {
    equation: string | undefined | null;
}

export default function ChemicalEquation({ equation }: ChemicalEquationProps) {
    if (!equation) return 'N/A';

    const cleaned = equation
        .replace(/\[\d+\]/g, '')
        .replace(/\(1\)\s*/g, '');

    return (
        <span style={{ fontFamily: 'monospace' }}>
            {formatChemicalText(cleaned)}
        </span>
    );
}
