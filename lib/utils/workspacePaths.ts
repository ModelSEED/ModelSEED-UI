// lib/utils/workspacePaths.ts
/**
 * Helpers for constructing PATRIC / BV-BRC workspace reference paths.
 *
 * The workspace owner segment is sensitive: PATRIC/BV-BRC auth tokens carry the
 * fully-qualified owner in their `un=` field (e.g. `user@patricbrc.org`,
 * `user@bvbrc`, `user@patricbrc.org` …). That value must be used verbatim when
 * building paths — never stripped, split on `@`, or rewritten with a hardcoded
 * realm. A user whose `un=` is `compchemist726@bvbrc` owns
 * `/compchemist726@bvbrc/...`; emitting `/compchemist726/...` (stripped) or
 * `/compchemist726@patricbrc.org/...` (wrong realm) makes the workspace reject
 * the request with "Insufficient permissions".
 */

/**
 * Normalize a workspace ref to a leading-slash absolute path.
 *
 * @param value - A workspace ref, with or without a leading slash
 * @returns The ref guaranteed to start with `/`, or `''` for empty input
 */
export function normalizeWorkspaceRef(value: string): string {
    if (!value) return '';
    return value.startsWith('/') ? value : `/${value}`;
}

/**
 * Apply the authenticated owner's realm to a bare-owner workspace ref.
 *
 * Some refs reach the UI with a bare owner segment (`/user/modelseed/Model`) —
 * e.g. from a typed path or a legacy link. The correct realm is whatever the
 * logged-in user's token `un=` carries, so we copy the realm suffix from
 * `owner` (the verbatim `un=` value) rather than guessing `@patricbrc.org`.
 *
 * No-ops (returns the normalized ref unchanged) when:
 *  - there is no owner / the owner has no realm to copy, or
 *  - the ref already carries a realm, or isn't an owner-rooted modelseed ref.
 *
 * @param ref - Workspace ref, possibly with a bare owner segment
 * @param owner - Authenticated owner from `un=` verbatim (e.g. `user@bvbrc`)
 * @returns The ref with the owner's realm applied, or unchanged
 *
 * @example
 * expandOwnerRef('/compchemist726/modelseed/Ecoli', 'compchemist726@bvbrc')
 * // → '/compchemist726@bvbrc/modelseed/Ecoli'
 */
export function expandOwnerRef(ref: string, owner?: string | null): string {
    const normalized = normalizeWorkspaceRef(ref);
    if (!normalized || !owner) return normalized;

    const at = owner.indexOf('@');
    if (at <= 0) return normalized; // owner carries no realm to apply

    const realm = owner.slice(at); // includes the leading '@'
    // Only expand a bare-owner modelseed ref; leave qualified refs intact.
    const match = normalized.match(/^\/([^/@]+)\/modelseed\/(.+)$/);
    if (!match) return normalized;

    return `/${match[1]}${realm}/modelseed/${match[2]}`;
}
