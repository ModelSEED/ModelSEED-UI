import { describe, it, expect, beforeAll } from 'vitest';
import * as biochemApi from '@/lib/api/biochem';

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

describe('Biochem API Integration Tests', () => {
  let isApiAvailable = true;

  beforeAll(async () => {
    try {
      const res = await biochemApi.getReactions({ limit: 1 });
      expect(res.docs).toBeDefined();
    } catch (e: unknown) {
      console.warn('Biochem API is unavailable, skipping tests:', getErrorMessage(e));
      isApiAvailable = false;
    }
  });

  it('should perform a basic compound search', async () => {
    if (!isApiAvailable) return;

    const result = await biochemApi.getCompounds({ limit: 5 });
    expect(result).toBeDefined();
    expect(Array.isArray(result.docs)).toBe(true);
    expect(result.docs.length).toBeLessThanOrEqual(5);
  });

  it('should fetch a specific reaction by ID', async () => {
    if (!isApiAvailable) return;

    const result = await biochemApi.getReactionById('rxn00001');
    expect(result).toBeDefined();
    expect(result.id).toBe('rxn00001');
  });

  it('should fetch compounds for reaction rendering with structure fields', async () => {
    if (!isApiAvailable) return;

    const result = await biochemApi.getCompoundsForReaction(['cpd00001', 'cpd00002', 'cpd00008']);
    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBeGreaterThan(0);

    const atp = result.get('cpd00002');
    if (atp) {
      expect(atp.name).toBeDefined();
      expect('smiles' in atp).toBe(true);
    }
  });
});
