import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const cleanedFiles = [
  '.gitignore',
  'README.md',
  'INDEX.md',
  'docs/DEVELOPER_GUIDE.md',
  'eslint.config.mjs',
  'vitest.config.ts',
];
const scaffoldingPath = /^(?:\.gsd|gsd-opencode|\.clauderules)(?:\/|$)/;
const scaffoldingReference = /\.gsd|gsd-opencode|\.clauderules/i;

describe('GSD scaffolding cleanup', () => {
  it('keeps GSD scaffolding out of tracked files', () => {
    const trackedPaths = execSync('git ls-files', { cwd: repositoryRoot, encoding: 'utf8' })
      .split('\n')
      .filter(Boolean);
    const scaffoldingPaths = trackedPaths.filter((trackedPath) => scaffoldingPath.test(trackedPath));

    expect(scaffoldingPaths, `GSD scaffolding must not be tracked: ${scaffoldingPaths.join(', ')}`).toEqual([]);
  });

  it('keeps cleaned files free of scaffolding references', () => {
    for (const cleanedFile of cleanedFiles) {
      const filePath = join(repositoryRoot, cleanedFile);
      expect(existsSync(filePath), `${cleanedFile} must exist so its references can be checked`).toBe(true);
      expect(readFileSync(filePath, 'utf8'), `${cleanedFile} must not reference removed GSD scaffolding`).not.toMatch(scaffoldingReference);
    }
  });
});
