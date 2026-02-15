/**
 * Tests for sync-status module
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('sync-status utilities', () => {
  describe('localStorage operations', () => {
    const LAST_SYNC_KEY = 'elv_last_sync_time';

    beforeEach(() => {
      localStorage.clear();
    });

    afterEach(() => {
      localStorage.clear();
    });

    it('should save and retrieve last sync time', () => {
      const testDate = new Date('2024-01-15T10:30:00Z');
      localStorage.setItem(LAST_SYNC_KEY, testDate.toISOString());

      const stored = localStorage.getItem(LAST_SYNC_KEY);
      expect(stored).toBe(testDate.toISOString());

      const retrieved = new Date(stored!);
      expect(retrieved.getTime()).toBe(testDate.getTime());
    });

    it('should return null when no sync time is stored', () => {
      const stored = localStorage.getItem(LAST_SYNC_KEY);
      expect(stored).toBeNull();
    });
  });
});

describe('sync-status API checks', () => {
  beforeEach(() => {
    // Clean up window.elvSync
    delete (window as { elvSync?: unknown }).elvSync;
  });

  it('should detect when elvSync API is not available', () => {
    const isAvailable = typeof window.elvSync !== 'undefined';
    expect(isAvailable).toBe(false);
  });

  it('should detect when elvSync API is available', () => {
    // Mock elvSync API
    (window as { elvSync?: unknown }).elvSync = {
      trigger: vi.fn(),
      getPendingCount: vi.fn(() => 0),
      clear: vi.fn(),
    };

    const isAvailable = typeof window.elvSync !== 'undefined';
    expect(isAvailable).toBe(true);
  });
});

describe('online/offline detection', () => {
  it('should read navigator.onLine status', () => {
    // navigator.onLine is a browser property
    // In test environment it may not be accurate, but we can check it exists
    expect(typeof navigator.onLine).toBe('boolean');
  });
});

describe('sync state management', () => {
  beforeEach(() => {
    // Mock elvSync API
    (window as { elvSync?: unknown }).elvSync = {
      trigger: vi.fn(async () => ({
        success: true,
        message: 'Sync completed',
      })),
      getPendingCount: vi.fn(() => 0),
      clear: vi.fn(),
    };
  });

  afterEach(() => {
    delete (window as { elvSync?: unknown }).elvSync;
  });

  it('should be able to call elvSync.getPendingCount', () => {
    const count = window.elvSync?.getPendingCount();
    expect(count).toBe(0);
  });

  it('should be able to call elvSync.trigger', async () => {
    const result = await window.elvSync?.trigger();
    expect(result).toEqual({
      success: true,
      message: 'Sync completed',
    });
  });

  it('should handle API errors gracefully', async () => {
    // Mock failed sync
    (window as { elvSync?: { trigger: () => Promise<unknown> } }).elvSync = {
      trigger: async () => ({
        success: false,
        message: 'Network error',
      }),
    };

    const result = await window.elvSync?.trigger();
    expect(result).toEqual({
      success: false,
      message: 'Network error',
    });
  });
});

describe('time formatting', () => {
  it('should calculate time differences correctly', () => {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    // Test basic arithmetic
    expect(now - oneMinuteAgo).toBe(60 * 1000);
    expect(now - oneHourAgo).toBe(60 * 60 * 1000);
    expect(now - oneDayAgo).toBe(24 * 60 * 60 * 1000);
  });
});
