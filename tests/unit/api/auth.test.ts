import { describe, it, expect, vi, beforeEach } from 'vitest';

// We'll test the auth module by mocking fetch

describe('auth API', () => {
  // Mock global fetch
  const mockFetch = vi.fn();
  vi.stubGlobal('fetch', mockFetch);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PATRIC login flow', () => {
    it('should call PATRIC auth endpoint with correct parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('test|un=testuser|meth=PATRIC'),
      });

      const { loginPatric } = await import('@/lib/api/auth');
      const result = await loginPatric('testuser', 'testpass');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://user.patricbrc.org/authenticate',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
          }),
          body: expect.stringContaining('username=testuser'),
        })
      );
      expect(result.token).toBe('test|un=testuser|meth=PATRIC');
      expect(result.method).toBe('PATRIC');
    });

    it('should throw error on invalid credentials', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Invalid credentials' }),
      });

      const { loginPatric } = await import('@/lib/api/auth');
      
      await expect(loginPatric('baduser', 'badpass')).rejects.toThrow('Invalid credentials');
    });

    it('should return developer bypass token', async () => {
      const { loginPatric } = await import('@/lib/api/auth');
      const result = await loginPatric('developer', 'developer');

      expect(result.user_id).toBe('developer');
      expect(result.method).toBe('PATRIC');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('uses a fully-qualified un= verbatim (@bvbrc — no strip, no re-suffix)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('tok|un=compchemist726@bvbrc|tokenid=x|expiry=1'),
      });

      const { loginPatric } = await import('@/lib/api/auth');
      const result = await loginPatric('compchemist726', 'pw');

      // Regression: the workspace lives at /compchemist726@bvbrc/... — the
      // suffix must survive so output paths aren't rejected for permissions.
      expect(result.user_id).toBe('compchemist726@bvbrc');
    });

    it('does not append @patricbrc.org to a bare un=', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('tok|un=plainuser|tokenid=x|expiry=1'),
      });

      const { loginPatric } = await import('@/lib/api/auth');
      const result = await loginPatric('plainuser', 'pw');

      expect(result.user_id).toBe('plainuser');
    });
  });

  describe('RAST login flow', () => {
    it('should call RAST auth endpoint with correct parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          token: 'rast|un=rastuser|meth=RAST',
          user_id: 'rastuser',
        }),
      });

      const { loginRast } = await import('@/lib/api/auth');
      const result = await loginRast('rastuser', 'rastpass');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://p3.theseed.org/Sessions/Login',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
          }),
          body: expect.stringContaining('user_id=rastuser'),
        })
      );
      expect(result.token).toBe('rast|un=rastuser|meth=RAST');
      expect(result.method).toBe('RAST');
    });

    it('should return developer bypass token for RAST', async () => {
      const { loginRast } = await import('@/lib/api/auth');
      const result = await loginRast('developer', 'developer');

      expect(result.user_id).toBe('developer');
      expect(result.method).toBe('RAST');
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('storage helpers', () => {
    beforeEach(() => {
      // Mock localStorage
      const store: Record<string, string> = {};
      vi.stubGlobal('localStorage', {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => { store[key] = value; },
        removeItem: (key: string) => { delete store[key]; },
      });
    });

    it('should persist auth to localStorage', async () => {
      const { persistAuth } = await import('@/lib/api/auth');
      
      persistAuth({
        user_id: 'testuser',
        token: 'test|un=testuser',
        method: 'PATRIC',
      });

      expect(localStorage.getItem('auth')).toContain('testuser');
    });

    it('should retrieve stored auth from localStorage', async () => {
      localStorage.setItem('auth', JSON.stringify({
        user_id: 'storeduser',
        token: 'stored|token',
        method: 'PATRIC',
      }));

      const { getStoredAuth } = await import('@/lib/api/auth');
      const auth = getStoredAuth();

      expect(auth?.user_id).toBe('storeduser');
    });

    it('should clear auth from localStorage', async () => {
      localStorage.setItem('auth', 'test');
      
      const { clearAuth } = await import('@/lib/api/auth');
      clearAuth();

      expect(localStorage.getItem('auth')).toBeNull();
    });
  });
});
