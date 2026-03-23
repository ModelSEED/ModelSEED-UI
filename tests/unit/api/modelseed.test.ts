import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as modelseedApi from '@/lib/api/modelseed';

const token = process.env.PATRIC_TOKEN;

const setupAuth = () => {
  localStorage.setItem('auth', JSON.stringify({
    user_id: 'seaver',
    token: token,
    method: 'PATRIC',
  }));
};

describe('ModelSEED API Integration Tests', () => {
  let isApiAvailable = true;

  beforeAll(async () => {
    if (!token) {
      console.warn('PATRIC_TOKEN not found in environment, skipping ModelSEED API tests');
      isApiAvailable = false;
      return;
    }

    setupAuth();

    try {
      await modelseedApi.listUserModelsFromApi();
    } catch (e: any) {
      console.warn('ModelSEED API is unavailable, skipping tests:', e?.message || e);
      isApiAvailable = false;
    }
  });

  afterAll(() => {
    localStorage.removeItem('auth');
  });

  it('should list public media', async () => {
    if (!isApiAvailable) return;

    const media = await modelseedApi.listPublicMediaFromApi();
    expect(Array.isArray(media)).toBe(true);
  });

  it('should list user models', async () => {
    if (!isApiAvailable) return;

    const models = await modelseedApi.listUserModelsFromApi();
    expect(Array.isArray(models)).toBe(true);
  });

  it('should get jobs gracefully', async () => {
      if (!isApiAvailable) return;
      const jobs = await modelseedApi.getJobsFromApi([]);
      expect(Array.isArray(jobs)).toBe(true);
  });
});
