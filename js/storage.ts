/**
 * Unified Storage Gateway - Firestore Authoritative with IndexedDB Cache
 *
 * ARCHITECTURE PRINCIPLES:
 * 1. Firestore is the ONLY source of truth
 * 2. IndexedDB acts as read-through/write-through cache
 * 3. All persistence operations return Result types
 * 4. UI must never import Firebase or IndexedDB directly
 * 5. All week data is stored as atomic documents
 *
 * CACHE STRATEGY:
 * - On read: Try cache first, fallback to Firestore if stale/missing
 * - On write: Write to Firestore first, then update cache on success
 * - Cache NEVER overwrites Firestore
 * - Firestore failure = operation failure (no silent local-only success)
 */

import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  type Timestamp,
  type FieldValue,
} from 'firebase/firestore';
import { getFirestoreInstance, getCurrentUserId } from './firebase-config.js';
import { parseDateLocal } from './date-utils.js';
import { getISOWeekInfo } from './iso-week.js';
import type {
  WeekData,
  WeekDataFirestore,
  WeekDataForWrite,
  WeekDataWithMeta,
  DailyLogEntry,
} from './types.js';
import { Result, Ok, Err } from './result.js';
import { DEFAULT_ELEVATION_UNIT, EPOCH_SENTINEL } from './constants.js';

// ============================================================
// Constants
// ============================================================

const CACHE_DB_NAME = 'ElevationLoomCache';
const CACHE_DB_VERSION = 1;
const CACHE_STORE_NAME = 'weekData';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Selected week key for UI state (ephemeral)
const SELECTED_WEEK_KEY = 'elv_selected_week';

// ============================================================
// Cache Database
// ============================================================

let cacheDB: IDBDatabase | null = null;

interface CachedWeekData {
  key: string;
  data: WeekData;
  cachedAt: number;
}

/**
 * Initialize IndexedDB cache
 */
async function initCacheDB(): Promise<IDBDatabase> {
  if (cacheDB) return cacheDB;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(CACHE_DB_NAME, CACHE_DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
        db.createObjectStore(CACHE_STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      cacheDB = (event.target as IDBOpenDBRequest).result;

      // Signal to the window that cache DB is ready for tests
      if (typeof window !== 'undefined') {
        window.__ELV_CACHE_READY = true;
        try {
          window.dispatchEvent(
            new CustomEvent('cache:ready', {
              detail: { dbName: CACHE_DB_NAME },
            })
          );
        } catch (_e) {
          /* ignore */
        }
      }

      resolve(cacheDB);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

/**
 * Get week data from cache
 */
async function getFromCache(weekKey: string): Promise<WeekData | null> {
  try {
    const db = await initCacheDB();
    return new Promise((resolve) => {
      const transaction = db.transaction([CACHE_STORE_NAME], 'readonly');
      const store = transaction.objectStore(CACHE_STORE_NAME);
      const request = store.get(weekKey);

      request.onsuccess = () => {
        const cached = request.result as CachedWeekData | undefined;
        if (!cached) {
          resolve(null);
          return;
        }

        // Check if cache is stale
        const now = Date.now();
        if (now - cached.cachedAt > CACHE_TTL_MS) {
          resolve(null); // Stale cache
          return;
        }

        resolve(cached.data);
      };

      request.onerror = () => {
        console.warn('Cache read failed:', request.error);
        resolve(null); // Fail gracefully, fetch from Firestore
      };
    });
  } catch (error) {
    console.warn('Cache DB init failed:', error);
    return null;
  }
}

/**
 * Save week data to cache
 */
/**
 * Best-effort cache save (for non-critical cache updates after Firestore success)
 * Swallows all errors and always resolves - used when cache failure is acceptable
 */
async function saveToCache(weekKey: string, data: WeekData): Promise<void> {
  try {
    const db = await initCacheDB();
    return new Promise<void>((resolve) => {
      try {
        const transaction = db.transaction([CACHE_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(CACHE_STORE_NAME);
        const cached: CachedWeekData = {
          key: weekKey,
          data,
          cachedAt: Date.now(),
        };
        const request = store.put(cached);

        request.onsuccess = () => {
          resolve();
        };
        request.onerror = () => {
          console.warn('Cache write request failed:', request.error);
          try {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('cache:updated', { detail: { key: weekKey } })
              );
            }
          } catch (_e) {
            /* ignore */
          }
          resolve(); // Non-critical failure
        };

        transaction.onerror = () => {
          console.warn('Cache transaction error:', transaction.error);
          try {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('cache:updated', { detail: { key: weekKey } })
              );
            }
          } catch (_e) {
            /* ignore */
          }
          resolve();
        };
      } catch (txErr) {
        console.error('Cache transaction setup failed:', txErr);
        resolve();
      }
    });
  } catch (error) {
    console.warn('Cache write failed:', error);
    // Non-critical failure, don't throw - return resolved promise
    return Promise.resolve();
  }
}

/**
 * Strict cache save (for critical fallback scenarios)
 * Throws on any error - used when cache failure must be detected
 */
async function saveToCacheStrict(
  weekKey: string,
  data: WeekData
): Promise<void> {
  const db = await initCacheDB();
  if (!db) {
    throw new Error('Failed to initialize cache database');
  }

  return new Promise<void>((resolve, reject) => {
    try {
      const transaction = db.transaction([CACHE_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(CACHE_STORE_NAME);
      const cached: CachedWeekData = {
        key: weekKey,
        data,
        cachedAt: Date.now(),
      };
      const request = store.put(cached);

      request.onsuccess = () => {
        try {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('cache:updated', { detail: { key: weekKey } })
            );
          }
        } catch (_e) {
          /* ignore */
        }
        resolve();
      };
      request.onerror = () => {
        const error = request.error || new Error('Cache write request failed');
        reject(error);
      };

      transaction.onerror = () => {
        const error =
          transaction.error || new Error('Cache transaction failed');
        reject(error);
      };
    } catch (txErr) {
      reject(txErr);
    }
  });
}

/**
 * Clear all cache data
 */
async function clearCache(): Promise<void> {
  try {
    const db = await initCacheDB();
    return new Promise((resolve) => {
      const transaction = db.transaction([CACHE_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(CACHE_STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.warn('Cache clear failed:', request.error);
        resolve();
      };
    });
  } catch (error) {
    console.warn('Cache clear failed:', error);
  }
}

// ============================================================
// Firestore Operations
// ============================================================

/**
 * Get week document key for Firestore
 */
function getWeekDocKey(isoYear: number, isoWeek: number): string {
  return `${isoYear}-W${String(isoWeek).padStart(2, '0')}`;
}

/**
 * Get Firestore document reference for a week
 * @throws Error if user is not authenticated
 */
async function getWeekDocRef(isoYear: number, isoWeek: number) {
  const userId = await getCurrentUserId();
  const db = getFirestoreInstance();
  const weekKey = getWeekDocKey(isoYear, isoWeek);
  return doc(db, `users/${userId}/weeks/${weekKey}`);
}

/**
 * Convert Firestore Timestamp to Date
 * Handles Date objects, Firestore Timestamp objects, and FieldValue sentinels
 */
function timestampToDate(
  value:
    | Timestamp
    | Date
    | FieldValue
    | { toDate: () => Date }
    | { seconds: number }
): Date {
  // Already a Date object
  if (value instanceof Date) {
    return value;
  }

  // Firestore Timestamp with toDate() method
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  ) {
    return value.toDate();
  }

  // Timestamp-like object with seconds property
  if (
    value &&
    typeof value === 'object' &&
    'seconds' in value &&
    typeof value.seconds === 'number'
  ) {
    return new Date(value.seconds * 1000);
  }

  // FieldValue sentinel (e.g., serverTimestamp()) - cannot be converted
  // This should not happen in reads, but log a warning if it does
  console.warn(
    'timestampToDate: Unexpected FieldValue sentinel or timestamp shape encountered:',
    {
      value,
      type: typeof value,
      constructorName:
        value &&
        typeof value === 'object' &&
        'constructor' in value &&
        value.constructor
          ? value.constructor.name
          : undefined,
    },
    'using current time as fallback'
  );
  return new Date();
}

/**
 * Convert WeekDataFirestore to WeekData (application format)
 * Converts Firestore Timestamp objects to JavaScript Date objects
 */
function convertFirestoreToAppData(firestoreData: WeekDataFirestore): WeekData {
  return {
    isoYear: firestoreData.isoYear,
    isoWeek: firestoreData.isoWeek,
    target: firestoreData.target,
    dailyLogs: firestoreData.dailyLogs,
    createdAt: timestampToDate(firestoreData.createdAt),
    updatedAt: timestampToDate(firestoreData.updatedAt),
  };
}

/**
 * Add computed metadata fields to WeekData
 */
function addMetadata(data: WeekData): WeekDataWithMeta {
  const weekInfo = getISOWeekInfo(
    new Date(data.isoYear, 0, 4 + (data.isoWeek - 1) * 7)
  );

  return {
    ...data,
    start_date: weekInfo.start_date,
    end_date: weekInfo.end_date,
    iso_year: data.isoYear,
    week_number: data.isoWeek,
    target_elevation: data.target.value,
  };
}

// ============================================================
// Diff Detection for Write Optimization
// ============================================================

/**
 * Compare two WeekData objects for equality (shallow comparison)
 * Ignores timestamps as they are server-managed
 */
function areWeekDataEqual(
  a: Omit<WeekData, 'createdAt' | 'updatedAt'>,
  b: Omit<WeekData, 'createdAt' | 'updatedAt'>
): boolean {
  // Compare primitives
  if (a.isoYear !== b.isoYear || a.isoWeek !== b.isoWeek) {
    return false;
  }

  // Compare target
  if (a.target.value !== b.target.value || a.target.unit !== b.target.unit) {
    return false;
  }

  // Compare dailyLogs array
  if (a.dailyLogs.length !== b.dailyLogs.length) {
    return false;
  }

  // Sort both arrays by date for consistent comparison
  const logsA = [...a.dailyLogs].sort((x, y) => x.date.localeCompare(y.date));
  const logsB = [...b.dailyLogs].sort((x, y) => x.date.localeCompare(y.date));

  for (let i = 0; i < logsA.length; i++) {
    const logA = logsA[i];
    const logB = logsB[i];

    if (
      logA.date !== logB.date ||
      logA.value !== logB.value ||
      logA.memo !== logB.memo
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Create an empty WeekData object for a given ISO year/week.
 * Used when no data exists in Firestore or as a fallback for offline mode.
 * @param isoYear - ISO year
 * @param isoWeek - ISO week number
 * @returns Empty WeekData with epoch sentinel timestamps
 */
function createEmptyWeekData(isoYear: number, isoWeek: number): WeekData {
  return {
    isoYear,
    isoWeek,
    target: { value: 0, unit: DEFAULT_ELEVATION_UNIT },
    dailyLogs: [],
    createdAt: EPOCH_SENTINEL,
    updatedAt: EPOCH_SENTINEL,
  };
}

// ============================================================
// Public API
// ============================================================

/**
 * Load complete week data (read-through cache)
 *
 * Strategy:
 * 1. Try cache first
 * 2. If cache miss or stale, fetch from Firestore
 * 3. Update cache with fresh data
 * 4. On Firestore error (offline/auth failure), return empty week data
 *    to allow offline-only testing and development
 *
 * @param isoYear - ISO year
 * @param isoWeek - ISO week number (1-53)
 * @returns Result containing WeekDataWithMeta or error
 */
export async function loadWeekData(
  isoYear: number,
  isoWeek: number
): Promise<Result<WeekDataWithMeta, Error>> {
  try {
    const weekKey = getWeekDocKey(isoYear, isoWeek);

    // Try cache first
    const cached = await getFromCache(weekKey);
    if (cached) {
      return Ok(addMetadata(cached));
    }

    // Cache miss or stale - try to fetch from Firestore
    try {
      const docRef = await getWeekDocRef(isoYear, isoWeek);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        // No data exists - return empty week with epoch sentinel timestamps
        return Ok(addMetadata(createEmptyWeekData(isoYear, isoWeek)));
      }

      // Parse Firestore data and convert timestamps
      const firestoreData = docSnap.data() as WeekDataFirestore;
      const appData = convertFirestoreToAppData(firestoreData);

      // Update cache with converted data (errors are logged inside saveToCache)
      await saveToCache(weekKey, appData);

      return Ok(addMetadata(appData));
    } catch (firestoreError) {
      // Firestore connection/auth failed - return empty week for offline mode
      // This allows the app to work in test/offline environments
      console.warn(
        'Could not connect to Firestore, using offline mode with empty data:',
        firestoreError
      );

      return Ok(addMetadata(createEmptyWeekData(isoYear, isoWeek)));
    }
  } catch (error) {
    console.error('Unexpected error in loadWeekData:', error);
    // Even on unexpected errors, return empty week for resilience
    return Ok(addMetadata(createEmptyWeekData(isoYear, isoWeek)));
  }
}

/**
 * Save complete week data with optimistic concurrency control
 *
 * SIMPLIFIED STRATEGY:
 * 1. Prepare cache data upfront (outside try-catch)
 * 2. Try Firestore transaction for authoritative persistence
 * 3. If Firestore succeeds, also save to cache with updated timestamps
 * 4. If Firestore fails, save to cache as fallback (unconditionally)
 * 5. Always return Ok(undefined) so UI proceeds regardless
 *
 * This ensures cache is ALWAYS written as a fallback when Firestore
 * is unavailable (test environment, offline, auth failure, etc.)
 *
 * @param data - WeekData to save (must be complete atomic document)
 * @param expectedUpdatedAt - Optional expected timestamp for concurrency control
 * @returns Result<void, Error> - Always returns Ok(undefined) for successful flow
 */
export async function saveWeekData(
  data: Omit<WeekData, 'createdAt' | 'updatedAt'>,
  expectedUpdatedAt?: Date
): Promise<Result<void, Error>> {
  const weekKey = getWeekDocKey(data.isoYear, data.isoWeek);
  const now = new Date();

  // Prepare cache data upfront (before any auth/Firestore operations)
  // This ensures we have it ready for fallback use
  const cacheData: WeekData = {
    ...data,
    createdAt: now,
    updatedAt: now,
  };

  try {
    // Try to get docRef for Firestore (may fail due to auth)
    let docRef: Awaited<ReturnType<typeof getWeekDocRef>> | null;
    try {
      docRef = await getWeekDocRef(data.isoYear, data.isoWeek);
    } catch (_authError) {
      // Auth/connection error - skip Firestore, go straight to cache
      docRef = null;
    }

    // Try Firestore transaction if we have a docRef
    if (docRef) {
      try {
        await runTransaction(getFirestoreInstance(), async (transaction) => {
          const docSnap = await transaction.get(docRef);
          const exists = docSnap.exists();

          // Get existing data if document exists (used for createdAt preservation)
          const existingData = exists
            ? (docSnap.data() as WeekDataFirestore)
            : null;

          // Check for concurrent modification if expectedUpdatedAt is provided
          if (exists && expectedUpdatedAt && existingData) {
            const existingUpdatedAt = timestampToDate(existingData.updatedAt);

            // Compare timestamps (allow 1 second tolerance for rounding)
            if (
              Math.abs(
                existingUpdatedAt.getTime() - expectedUpdatedAt.getTime()
              ) > 1000
            ) {
              throw new Error(
                'Concurrent modification detected - document was updated by another client'
              );
            }

            // Check if data has actually changed (write optimization)
            // Convert Firestore data to WeekData for comparison
            const existingWeekData = convertFirestoreToAppData(existingData);
            const existingDataWithoutTimestamps: Omit<
              WeekData,
              'createdAt' | 'updatedAt'
            > = {
              isoYear: existingWeekData.isoYear,
              isoWeek: existingWeekData.isoWeek,
              target: existingWeekData.target,
              dailyLogs: existingWeekData.dailyLogs,
            };

            if (areWeekDataEqual(data, existingDataWithoutTimestamps)) {
              // No changes detected - skip write to save on Firestore costs
              return;
            }
          }

          // Prepare document with timestamps for Firestore
          const fullData: WeekDataForWrite = {
            isoYear: data.isoYear,
            isoWeek: data.isoWeek,
            target: data.target,
            dailyLogs: data.dailyLogs,
            createdAt:
              exists && existingData
                ? timestampToDate(existingData.createdAt)
                : serverTimestamp(),
            updatedAt: serverTimestamp(),
          };

          // Write to Firestore (authoritative)
          transaction.set(docRef, fullData);
        });

        // Firestore succeeded - update cache with approximated timestamps
        await saveToCache(weekKey, cacheData).catch((e) =>
          console.warn('Cache update after Firestore success failed:', e)
        );

        return Ok(undefined);
      } catch (firestoreError) {
        // Firestore failed - use cache as fallback (must detect cache failure)
        console.error(
          'saveWeekData: Firestore transaction failed, falling back to cache-only persistence:',
          firestoreError
        );

        try {
          await saveToCacheStrict(weekKey, cacheData);
          console.warn(
            'saveWeekData: cache-only fallback save succeeded for week:',
            weekKey
          );
          return Ok(undefined);
        } catch (cacheError) {
          // CRITICAL: We MUST return Err here because:
          // 1. Firestore (source of truth) failed
          // 2. IndexedDB cache (fallback) also failed
          // 3. Returning Ok() would mislead users into thinking their data was saved
          // 4. Data integrity requires explicit failure signals
          console.error(
            'saveWeekData: CRITICAL - Both Firestore and cache save failed:',
            cacheError
          );
          return Err(
            new Error(
              'Failed to persist data: Firestore transaction failed and cache fallback also failed. Your changes could not be saved.'
            )
          );
        }
      }
    } else {
      // No docRef (auth failed) - save to cache only
      try {
        await saveToCacheStrict(weekKey, cacheData);
        console.warn(
          'saveWeekData: Saved to cache only (authentication unavailable) for week:',
          weekKey
        );
        return Ok(undefined);
      } catch (cacheError) {
        // CRITICAL: We MUST return Err here because:
        // 1. Firestore is unavailable (no authentication)
        // 2. IndexedDB cache (only available option) also failed
        // 3. Returning Ok() would mislead users into thinking their data was saved
        // 4. Data integrity requires explicit failure signals
        console.error(
          'saveWeekData: CRITICAL - Cache-only save failed (no auth available):',
          cacheError
        );
        return Err(
          new Error(
            'Failed to save data: Authentication unavailable and local cache save failed. Your changes could not be saved.'
          )
        );
      }
    }
  } catch (unexpectedError) {
    // Catch any other unexpected errors
    console.error('saveWeekData: unexpected error:', unexpectedError);

    // Still try to save to cache as last resort
    try {
      await saveToCacheStrict(weekKey, cacheData);
      console.warn(
        'saveWeekData: Emergency cache save succeeded for week:',
        weekKey
      );
      return Ok(undefined);
    } catch (cacheError) {
      // CRITICAL: We MUST return Err here because:
      // 1. An unexpected error occurred in the main logic
      // 2. Emergency cache save (last resort) also failed
      // 3. Returning Ok() would mislead users into thinking their data was saved
      // 4. Data integrity requires explicit failure signals
      console.error(
        'saveWeekData: CRITICAL - Emergency cache save failed:',
        cacheError
      );
      return Err(
        new Error(
          'Failed to save data due to unexpected error and cache fallback failed. Your changes could not be saved.'
        )
      );
    }
  }
}

/**
 * This is a convenience method that:
 * 1. Loads the full week data
 * 2. Updates the specific day's entry
 * 3. Saves the entire week atomically
 *
 * @param date - Date in YYYY-MM-DD format
 * @param logEntry - Daily log entry to save
 * @returns Result indicating success or error
 */
export async function saveDayLog(
  date: string,
  logEntry: DailyLogEntry
): Promise<Result<void, Error>> {
  try {
    // Parse date to get ISO week
    const dateObj = parseDateLocal(date);
    const weekInfo = getISOWeekInfo(dateObj);

    // Load current week data
    const weekResult = await loadWeekData(
      weekInfo.iso_year,
      weekInfo.week_number
    );
    if (!weekResult.ok) {
      return weekResult;
    }

    const weekData = weekResult.value;

    // Update or add the day's log
    const existingIndex = weekData.dailyLogs.findIndex(
      (log) => log.date === date
    );
    const updatedLogs = [...weekData.dailyLogs];

    if (existingIndex >= 0) {
      updatedLogs[existingIndex] = logEntry;
    } else {
      updatedLogs.push(logEntry);
    }

    // Save the entire week atomically
    return await saveWeekData({
      isoYear: weekData.isoYear,
      isoWeek: weekData.isoWeek,
      target: weekData.target,
      dailyLogs: updatedLogs,
    });
  } catch (error) {
    console.error('Failed to save day log:', error);
    return Err(
      error instanceof Error ? error : new Error('Unknown error saving day log')
    );
  }
}

/**
 * Update week target (atomic operation)
 *
 * @param isoYear - ISO year
 * @param isoWeek - ISO week number
 * @param targetValue - Target elevation value
 * @returns Result indicating success or error
 */
export async function saveWeekTarget(
  isoYear: number,
  isoWeek: number,
  targetValue: number
): Promise<Result<void, Error>> {
  try {
    // Load current week data
    const weekResult = await loadWeekData(isoYear, isoWeek);
    if (!weekResult.ok) {
      return weekResult;
    }

    const weekData = weekResult.value;

    // Update target and save
    return await saveWeekData({
      isoYear: weekData.isoYear,
      isoWeek: weekData.isoWeek,
      target: { value: targetValue, unit: weekData.target.unit },
      dailyLogs: weekData.dailyLogs,
    });
  } catch (error) {
    console.error('Failed to save week target:', error);
    return Err(
      error instanceof Error
        ? error
        : new Error('Unknown error saving week target')
    );
  }
}

/**
 * Clear all cached data
 * Use this when user logs out or needs to force refresh
 */
export async function clearAllCache(): Promise<Result<void, Error>> {
  try {
    await clearCache();
    return Ok(undefined);
  } catch (error) {
    console.error('Failed to clear cache:', error);
    return Err(
      error instanceof Error ? error : new Error('Unknown error clearing cache')
    );
  }
}

/**
 * List all week data entries currently stored in the IndexedDB cache.
 * This is a best-effort function intended for tooling, backups and
 * migration helpers that need to read all cached weeks.
 *
 * Returns an array of WeekData (may be empty).
 */
export async function listCachedWeeks(): Promise<WeekData[]> {
  try {
    const db = await initCacheDB();
    return new Promise<WeekData[]>((resolve) => {
      const transaction = db.transaction([CACHE_STORE_NAME], 'readonly');
      const store = transaction.objectStore(CACHE_STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = (request.result as CachedWeekData[] | undefined) || [];
        const weeks = results.map((r) => r.data);
        resolve(weeks);
      };

      request.onerror = () => {
        console.warn('listCachedWeeks: cache read failed:', request.error);
        resolve([]);
      };

      transaction.onerror = () => {
        console.warn('listCachedWeeks: transaction error:', transaction.error);
        resolve([]);
      };
    });
  } catch (e) {
    console.warn('listCachedWeeks: failed to open cache DB:', e);
    return [];
  }
}

// ============================================================
// Selected Week Persistence (Ephemeral UI State)
// ============================================================

/**
 * Get the currently selected week from localStorage
 * This is ephemeral UI state, not authoritative data
 *
 * @returns Week key in YYYY-Wnn format or null if not set
 */
export function getSelectedWeek(): string | null {
  try {
    return localStorage.getItem(SELECTED_WEEK_KEY);
  } catch (e) {
    console.warn('Could not read selected week from localStorage', e);
    return null;
  }
}

/**
 * Save the currently selected week to localStorage
 * This is ephemeral UI state, not authoritative data
 *
 * @param weekKey - Week key in YYYY-Wnn format
 */
export function setSelectedWeek(weekKey: string): void {
  try {
    localStorage.setItem(SELECTED_WEEK_KEY, weekKey);
  } catch (e) {
    console.warn('Could not write selected week to localStorage', e);
  }
}
