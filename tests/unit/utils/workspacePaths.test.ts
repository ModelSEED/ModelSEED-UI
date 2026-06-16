import { describe, it, expect } from 'vitest';
import { expandOwnerRef, normalizeWorkspaceRef } from '@/lib/utils/workspacePaths';

describe('expandOwnerRef', () => {
    it('applies the owner @bvbrc realm to a bare-owner ref', () => {
        expect(expandOwnerRef('/compchemist726/modelseed/Ecoli', 'compchemist726@bvbrc'))
            .toBe('/compchemist726@bvbrc/modelseed/Ecoli');
    });

    it('applies an @patricbrc.org realm', () => {
        expect(expandOwnerRef('/alice/modelseed/M', 'alice@patricbrc.org'))
            .toBe('/alice@patricbrc.org/modelseed/M');
    });

    it('leaves an already-qualified ref unchanged', () => {
        expect(expandOwnerRef('/compchemist726@bvbrc/modelseed/Ecoli', 'compchemist726@bvbrc'))
            .toBe('/compchemist726@bvbrc/modelseed/Ecoli');
    });

    it('no-ops when the owner carries no realm', () => {
        expect(expandOwnerRef('/bob/modelseed/M', 'bob')).toBe('/bob/modelseed/M');
    });

    it('no-ops without an owner', () => {
        expect(expandOwnerRef('/bob/modelseed/M', null)).toBe('/bob/modelseed/M');
        expect(expandOwnerRef('/bob/modelseed/M')).toBe('/bob/modelseed/M');
    });

    it('normalizes a missing leading slash before expanding', () => {
        expect(expandOwnerRef('compchemist726/modelseed/M', 'compchemist726@bvbrc'))
            .toBe('/compchemist726@bvbrc/modelseed/M');
    });

    it('only rewrites owner-rooted modelseed refs', () => {
        expect(expandOwnerRef('/some/other/path', 'x@bvbrc')).toBe('/some/other/path');
    });
});

describe('normalizeWorkspaceRef', () => {
    it('adds a leading slash', () => {
        expect(normalizeWorkspaceRef('a/b')).toBe('/a/b');
    });

    it('keeps an existing leading slash', () => {
        expect(normalizeWorkspaceRef('/a/b')).toBe('/a/b');
    });

    it('returns empty string for empty input', () => {
        expect(normalizeWorkspaceRef('')).toBe('');
    });
});
