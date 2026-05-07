import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as workspaceApi from '@/lib/api/workspace';

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const token = process.env.PATRIC_TOKEN;

const setupAuth = () => {
  localStorage.setItem('auth', JSON.stringify({
    user_id: 'seaver',
    token: token,
    method: 'PATRIC',
  }));
};

describe('Workspace API Integration Tests', () => {
  let isApiAvailable = true;

  beforeAll(async () => {
    if (!token) {
      console.warn('PATRIC_TOKEN not found in environment, skipping Workspace API tests');
      isApiAvailable = false;
      return;
    }

    setupAuth();

    try {
      await workspaceApi.workspaceLs(['/seaver/']);
    } catch (e: unknown) {
      console.warn('Workspace API is unavailable, skipping tests:', getErrorMessage(e));
      isApiAvailable = false;
    }
  });

  afterAll(() => {
    localStorage.removeItem('auth');
  });

  it('should list contents of the user workspace', async () => {
    if (!isApiAvailable) return;

    const result = await workspaceApi.workspaceLs(['/seaver/']);
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  it('should get objects gracefully or fail cleanly if not found', async () => {
    if (!isApiAvailable) return;

    try {
        const result = await workspaceApi.workspaceGet(['/seaver/nonexistent']);
        expect(result).toBeDefined();
    } catch (e) {
        expect(e).toBeDefined();
    }
  });
});
