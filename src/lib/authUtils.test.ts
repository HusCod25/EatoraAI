import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cleanupAuthState, signOutRobustly, signOutRobustly as signOut } from './authUtils';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as any;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.sessionStorage = sessionStorageMock as any;

describe('authUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('cleanupAuthState', () => {
    it('should clear localStorage auth items', () => {
      cleanupAuthState();
      expect(localStorageMock.removeItem).toHaveBeenCalled();
    });

    it('should clear sessionStorage auth items', () => {
      cleanupAuthState();
      expect(sessionStorageMock.removeItem).toHaveBeenCalled();
    });
  });

  describe('signOutRobustly', () => {
    it('should be defined', () => {
      expect(signOutRobustly).toBeDefined();
      expect(typeof signOutRobustly).toBe('function');
    });
  });
});

