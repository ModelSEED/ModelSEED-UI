'use client';

import React from 'react';
import Link from 'next/link';
import type { Reaction, StoichiometryParticipant } from '@/lib/api/biochem';

const markStyle = { backgroundColor: '#fff3cd', color: '#856404', padding: '0 2px', borderRadius: '2px' };

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatSubscripts(text: string, baseOffset = 0, scope = 'txt'): React.ReactNode[] {
    const parts: React.ReactNode[] = [];
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
            if (lastTokenWasLetter) {
                parts.push(<sub key={`${keyBase}-sub`}>{digits}</sub>);
            } else {
                parts.push(<span key={`${keyBase}-digits`}>{digits}</span>);
            }
            lastTokenWasLetter = false;
        } else {
            parts.push(<span key={`${keyBase}-other`}>{other}</span>);
            if (other.trim().length > 0 || /\s/.test(other)) {
                lastTokenWasLetter = false;
            }
        }
    }

    return parts;
}

function formatHighlightedText(text: string, highlights: string[], baseOffset: number, scope: string): React.ReactNode[] {
    if (highlights.length === 0) return formatSubscripts(text, baseOffset, scope);

    const pattern = highlights.map(escapeRegExp).join('|');
    const parts = text.split(new RegExp(`(${pattern})`, 'gi'));
    const result: React.ReactNode[] = [];

    parts.forEach((part, index) => {
        const offset = baseOffset + parts.slice(0, index).join('').length;
        const key = `${scope}-${offset}`;
        if (highlights.some((highlight) => part.toLowerCase() === highlight.toLowerCase())) {
            result.push(<mark key={key} style={markStyle}>{formatSubscripts(part, offset, key)}</mark>);
        } else {
            result.push(...formatSubscripts(part, offset, key));
        }
    });

    return result;
}

function formatChemicalText(text: string, highlights: string[]): React.ReactNode[] {
    const result: React.ReactNode[] = [];
    const compoundRegex = /(cpd\d{5})/g;
    let lastIndex = 0;
    let match;

    while ((match = compoundRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            const before = text.slice(lastIndex, match.index);
            result.push(...formatHighlightedText(before, highlights, lastIndex, 'before'));
        }

        const compound = match[1];
        const hasExactCompoundHighlight = highlights.some((highlight) => compound.toLowerCase() === highlight.toLowerCase());
        const hasPartialCompoundHighlight = highlights.some((highlight) => compound.toLowerCase().includes(highlight.toLowerCase()));
        result.push(
            <Link
                key={`cpd-${match.index}-${compound}`}
                href={`/biochem/compounds/${compound}`}
                style={{ color: '#00acc1', textDecoration: 'none' }}
            >
                {hasExactCompoundHighlight
                    ? <mark style={markStyle}>{compound}</mark>
                    : hasPartialCompoundHighlight ? formatHighlightedText(compound, highlights, match.index, 'compound') : compound}
            </Link>
        );

        lastIndex = match.index + compound.length;
    }

    if (lastIndex < text.length) {
        const after = text.slice(lastIndex);
        result.push(...formatHighlightedText(after, highlights, lastIndex, 'after'));
    }

    return result;
}

function getStringTerms(value: unknown): string[] {
    if (Array.isArray(value)) return value.flatMap(getStringTerms);
    if (typeof value === 'string' && value.trim().length > 0) return [value.trim()];
    if (typeof value === 'number' && Number.isFinite(value)) return [String(value)];
    return [];
}

function getAliasTerms(value: unknown): string[] {
    return getStringTerms(value)
        .flatMap((entry) => entry.split(/[;|]/))
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => {
            const separator = entry.indexOf(':');
            return separator > 0 ? entry.slice(separator + 1).trim() : entry;
        })
        .filter(Boolean);
}

interface ParticipantAssociation {
    searchTerms: string[];
    displayTerms: string[];
}

function normalizeParticipantAssociation(participant: unknown): ParticipantAssociation | null {
    if (!participant || typeof participant !== 'object') return null;
    const record = participant as Record<string, unknown>;
    const compoundTerms = getStringTerms(record.compound);
    const displayTerms = getStringTerms(record.participant_name ?? record.name ?? record.compound);
    if (displayTerms.length === 0) return null;
    return {
        searchTerms: [
            ...compoundTerms,
            ...getStringTerms(record.participant_name),
            ...getStringTerms(record.name),
            ...getAliasTerms(record.participant_aliases),
            ...getAliasTerms(record.aliases),
        ],
        displayTerms: [...displayTerms, ...compoundTerms],
    };
}

function getEquationHighlights(equation: string, participants: StoichiometryParticipant[] | unknown, quickFilterValues: string[] | unknown): string[] {
    const terms = getStringTerms(quickFilterValues)
        .flatMap((value) => value.split(/\s+/))
        .map((term) => term.trim())
        .filter(Boolean);
    const associations = (Array.isArray(participants) ? participants : [])
        .map(normalizeParticipantAssociation)
        .filter((association): association is ParticipantAssociation => association !== null);
    const equationLower = equation.toLowerCase();
    const highlights = new Set<string>();

    for (const term of terms) {
        const termLower = term.toLowerCase();
        if (equationLower.includes(termLower)) highlights.add(term);
        // Reaction metadata is intentionally not mapped to a participant. It can
        // only mark its literal Equation text through the check above.
        for (const association of associations) {
            if (!association.searchTerms.some((value) => value.toLowerCase().includes(termLower))) continue;
            for (const displayTerm of association.displayTerms) {
                if (equationLower.includes(displayTerm.toLowerCase())) highlights.add(displayTerm);
            }
        }
    }

    return [...highlights].sort((a, b) => b.length - a.length);
}

interface ChemicalEquationProps {
    equation: string | undefined | null;
    participants?: StoichiometryParticipant[];
    reaction?: Pick<Reaction, 'id' | 'name' | 'aliases'>;
    quickFilterValues?: string[];
}

export default function ChemicalEquation({ equation, participants = [], reaction, quickFilterValues = [] }: ChemicalEquationProps) {
    // Reaction metadata is intentionally not mapped to a participant; only literal
    // quick-filter matches in the equation are highlighted.
    void reaction;
    if (!equation) return 'N/A';

    const cleaned = equation
        .replace(/\[\d+\]/g, '')
        .replace(/\(1\)\s*/g, '');
    const highlights = getEquationHighlights(cleaned, participants, quickFilterValues);

    return (
        <span style={{ fontFamily: 'monospace' }}>
            {formatChemicalText(cleaned, highlights)}
        </span>
    );
}
