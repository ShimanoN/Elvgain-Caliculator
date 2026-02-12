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
  setDoc,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';
import { getFirestoreInstance, getCurrentUserId } from './firebase-config.js';
import { getISOWeekInfo } from './iso-week.js';
import type { WeekData, WeekDataWithMeta, DailyLogEntry } from './types.js';
import { Result, Ok, Err } from './result.js';

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
async function saveToCache(weekKey: string, data: WeekData): Promise<void> {
  try {
    const db = await initCacheDB();
    return new Promise((resolve) => {
      const transaction = db.transaction([CACHE_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(CACHE_STORE_NAME);
      const cached: CachedWeekData = {
        key: weekKey,
        data,
        cachedAt: Date.now(),
      };
      const request = store.put(cached);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.warn('Cache write failed:', request.error);
        resolve(); // Non-critical failure
      };
    });
  } catch (error) {
    console.warn('Cache write failed:', error);
    // Non-critical failure, don't throw
  }
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
 */
function getWeekDocRef(isoYear: number, isoWeek: number) {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User not authenticated');
  }

  const db = getFirestoreInstance();
  const weekKey = getWeekDocKey(isoYear, isoWeek);
  return doc(db, `users/${userId}/weeks/${weekKey}`);
}

/**
 * Convert Firestore Timestamp to Date
 */
function timestampToDate(timestamp: Timestamp | Date): Date {
  if (timestamp instanceof Date) {
    return timestamp;
  }
  return timestamp.toDate();
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
// Public API
// ============================================================

/**
 * Load complete week data (read-through cache)
 *
 * Strategy:
 * 1. Try cache first
 * 2. If cache miss or stale, fetch from Firestore
 * 3. Update cache with fresh data
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

    // Cache miss or stale - fetch from Firestore
    const docRef = getWeekDocRef(isoYear, isoWeek);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      // No data exists - return empty week with null timestamp
      // The timestamp will be set when the document is first saved
      const emptyWeek: WeekData = {
        isoYear,
        isoWeek,
        target: { value: 0, unit: 'm' },
        dailyLogs: [],
        createdAt: new Date(0), // Epoch timestamp indicates not yet persisted
        updatedAt: new Date(0), // Epoch timestamp indicates not yet persisted
      };

      return Ok(addMetadata(emptyWeek));
    }

    // Parse Firestore data
    const firestoreData = docSnap.data() as WeekData;

    // Update cache
    await saveToCache(weekKey, firestoreData);

    return Ok(addMetadata(firestoreData));
  } catch (error) {
    console.error('Failed to load week data:', error);
    return Err(
      error instanceof Error
        ? error
        : new Error('Unknown error loading week data')
    );
  }
}

/**
 * Save complete week data (write-through cache)
 *
 * Strategy:
 * 1. Write to Firestore first (authoritative)
 * 2. On success, update cache
 * 3. On failure, return error (NO silent local-only success)
 *
 * @param data - WeekData to save (must be complete atomic document)
 * @returns Result indicating success or error
 */
export async function saveWeekData(
  data: Omit<WeekData, 'createdAt' | 'updatedAt'>
): Promise<Result<void, Error>> {
  try {
    const docRef = getWeekDocRef(data.isoYear, data.isoWeek);
    const weekKey = getWeekDocKey(data.isoYear, data.isoWeek);

    // Check if document exists to set createdAt correctly
    const docSnap = await getDoc(docRef);
    const exists = docSnap.exists();
    const existingCreatedAt = exists
      ? timestampToDate((docSnap.data() as WeekData).createdAt)
      : new Date(); // Use current time for new documents (will be replaced by server)

    // Prepare document with timestamps
    const fullData: WeekData = {
      ...data,
      createdAt: exists
        ? existingCreatedAt
        : (serverTimestamp() as unknown as Date),
      updatedAt: serverTimestamp() as unknown as Date,
    };

    // Write to Firestore (authoritative)
    await setDoc(docRef, fullData);

    // On success, update cache with actual timestamps
    // Note: serverTimestamp() is a sentinel that Firestore replaces with actual time
    // For cache, we use current time as an approximation
    const cacheData: WeekData = {
      ...fullData,
      createdAt: exists ? existingCreatedAt : new Date(),
      updatedAt: new Date(),
    };
    await saveToCache(weekKey, cacheData);

    return Ok(undefined);
  } catch (error) {
    console.error('Failed to save week data:', error);
    return Err(
      error instanceof Error
        ? error
        : new Error('Unknown error saving week data')
    );
  }
}

/**
 * Update a single day's log within a week (atomic operation)
 *
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
    const dateObj = new Date(date + 'T00:00:00');
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
