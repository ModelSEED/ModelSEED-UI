'use client';

import { useState, useMemo } from 'react';
import { PUBLICATIONS, type Publication } from '@/lib/data/publications';
import styles from './publications.module.css';

/** Highlight matching text in a string, returning JSX fragments. */
function highlightText(text: string, query: string): React.ReactNode {
    if (!query || !text) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
        regex.test(part) ? (
            <span key={i} className={styles.highlight}>{part}</span>
        ) : (
            part
        ),
    );
}

export default function PublicationsPage() {
    const [query, setQuery] = useState('');
    const [reversed, setReversed] = useState(false);

    /** Join authors array once for display and filtering. */
    const processedPubs = useMemo(() => {
        return PUBLICATIONS.map((pub) => ({
            ...pub,
            authorsJoined: pub.authors.join('; '),
        }));
    }, []);

    /** Filter by query across title, authors, publication, pages. */
    const filtered = useMemo(() => {
        let results = processedPubs;

        if (query) {
            const lowerQ = query.toLowerCase();
            results = results.filter(
                (pub) =>
                    (pub.title ?? '').toLowerCase().includes(lowerQ) ||
                    pub.authorsJoined.toLowerCase().includes(lowerQ) ||
                    (pub.publication ?? '').toLowerCase().includes(lowerQ) ||
                    (pub.pages ?? '').toLowerCase().includes(lowerQ),
            );
        }

        // Sort by year (descending by default, reversed = ascending)
        results = [...results].sort((a, b) => {
            const yearA = a.year ?? 0;
            const yearB = b.year ?? 0;
            return reversed ? yearA - yearB : yearB - yearA;
        });

        return results;
    }, [processedPubs, query, reversed]);

    return (
        <div className={styles.container}>
            <h3>Publications</h3>
            <hr className={styles.noMargin} />
            <br />

            <div className={styles.searchRow}>
                <span className={styles.searchIcon}>🔍</span>
                <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Search publications"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <div
                    className={styles.yearToggle}
                    onClick={() => setReversed(!reversed)}
                >
                    Year {reversed ? '▲' : '▼'}
                </div>
            </div>

            <table className={styles.pubTable}>
                <thead>
                    <tr />
                </thead>
                <tbody>
                    {filtered.map((pub, idx) => (
                        <tr key={idx} className={styles.publication}>
                            <td>
                                <div className={styles.title}>
                                    {highlightText(pub.title, query)}
                                </div>
                                <div className={styles.author}>
                                    {highlightText(pub.authorsJoined, query)}
                                </div>
                                <div className={styles.source}>
                                    <span>{highlightText(pub.publication ?? '', query)}</span>
                                    {pub.volumn && <span> {pub.volumn}</span>}
                                    {pub.number && <span> ({pub.number})</span>}
                                    {pub.pages && (
                                        <span> {highlightText(pub.pages, query)}</span>
                                    )}
                                </div>
                            </td>
                            <td>
                                <div className={styles.year}>{pub.year}</div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {filtered.length === 0 && (
                <div className={styles.noResults}>No publications found</div>
            )}
        </div>
    );
}
