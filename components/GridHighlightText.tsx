import React from 'react';
import { useGridApiContext, useGridSelector, gridFilterModelSelector } from '@mui/x-data-grid';

export function GridHighlightText({ text }: { text: string | null | undefined }) {
    const apiRef = useGridApiContext();
    const filterModel = useGridSelector(apiRef, gridFilterModelSelector);
    const highlight = filterModel?.quickFilterValues?.join(' ') || '';

    if (!text) return null;
    if (!highlight || highlight.trim() === '') {
        return <>{text}</>;
    }

    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
        <span>
            {parts.map((part, i) =>
                part.toLowerCase() === highlight.toLowerCase() ? (
                    <mark key={i} style={{ backgroundColor: '#fff3cd', color: '#856404', padding: '0 2px', borderRadius: '2px' }}>
                        {part}
                    </mark>
                ) : (
                    part
                )
            )}
        </span>
    );
}

export function GridHighlightHTML({ html }: { html: string | null | undefined }) {
    const apiRef = useGridApiContext();
    const filterModel = useGridSelector(apiRef, gridFilterModelSelector);
    const highlight = filterModel?.quickFilterValues?.join(' ') || '';

    if (!html) return null;
    if (!highlight || highlight.trim() === '') {
        return <span dangerouslySetInnerHTML={{ __html: html }} />;
    }

    // A bit more complex to safely highlight within HTML string without breaking tags
    // Here we'll do a simple text replace not affecting tags:
    const regex = new RegExp(`(?![^<]*>)(?<=\\b|\\W)(${highlight})(?=\\b|\\W)`, 'gi');
    const highlightedHtml = html.replace(regex, '<mark style="background-color: #fff3cd; color: #856404; padding: 0 2px; border-radius: 2px;">$1</mark>');

    return <span dangerouslySetInnerHTML={{ __html: highlightedHtml }} />;
}
