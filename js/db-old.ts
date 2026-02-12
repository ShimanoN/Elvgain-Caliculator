/**
 * IndexedDB operations for Elevation Loom application
 * Database structure:
 * - DayLog: Daily elevation tracking records
 * - WeekTarget: Weekly target elevation values
 */

// ============================================================
// Type Definitions
// ============================================================

/**
 * Daily elevation log record
 */
export interface DayLog {
  /** Date in YYYY-MM-DD format (primary key) */
  date: string;
  /** Elevation gained in part 1 (nullable) */
  elevation_part1: number | null;
  /** Elevation gained in part 2 (nullable) */
  elevation_part2: number | null;
  /** Total elevation gained (sum of part1 and part2) */
  elevation_total: number | null;
  /** Subjective condition rating */
  subjective_condition: 'good' | 'normal' | 'bad' | null;
  /** Planned elevation for part 1 (optional, added in v3.2) */
  daily_plan_part1?: number | null;
  /** Planned elevation for part 2 (optional, added in v3.2) */
  daily_plan_part2?: number | null;
  /** ISO year for indexing */
  iso_year: number;
  /** ISO week number for indexing */
  week_number: number;
  /** Timezone for record */
  timezone?: string;
  /** Creation timestamp */
  created_at?: string;
  /** Last update timestamp */
  updated_at?: string;
}

/**
 * Weekly target elevation record
 */
export interface WeekTarget {
  /** Week identifier in YYYY-Wnn format (primary key) */
  key: string;
  /** ISO year */
  iso_year?: number;
  /** ISO week number */
  week_number?: number;
  /** Week start date in YYYY-MM-DD format */
  start_date?: string;
  /** Week end date in YYYY-MM-DD format */
  end_date?: string;
  /** Target elevation for the week (nullable) */
  target_elevation: number | null;
  /** Creation timestamp */
  created_at?: string;
  /** Last update timestamp */
  updated_at?: string;
}

// ============================================================
// Database Constants and State
// ============================================================

const DB_NAME = 'TrainingMirrorDB';
const DB_VERSION = 1;

let db: IDBDatabase | null = null;

// ============================================================
// Database Initialization
// ============================================================

/**
 * Initializes the IndexedDB connection and creates object stores if needed
 * @returns Promise resolving to the IDBDatabase instance
 */
export async function initDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // DayLog Store
      // Fields:
      // - date (key)
      // - elevation_part1
      // - elevation_part2
      // - elevation_total
      // - subjective_condition
      // - daily_plan_part1 (New: implemented in v3.2)
      // - daily_plan_part2 (New: implemented in v3.2)
      // - iso_year, week_number (index)
      if (!db.objectStoreNames.contains('DayLog')) {
        const dayLogStore = db.createObjectStore('DayLog', { keyPath: 'date' });
        dayLogStore.createIndex('week', ['iso_year', 'week_number'], {
          unique: false,
        });
      }

      // WeekTarget Store
      if (!db.objectStoreNames.contains('WeekTarget')) {
        db.createObjectStore('WeekTarget', { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

// ============================================================
// DayLog Operations
// ============================================================

/**
 * Gets a DayLog by date
 * @param date - Date in YYYY-MM-DD format
 * @returns Promise resolving to DayLog or undefined if not found
 */
export async function getDayLog(date: string): Promise<DayLog | undefined> {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['DayLog'], 'readonly');
      const store = transaction.objectStore('DayLog');
      const request = store.get(date);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.error('Error getting day log:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Failed to get day log:', error);
    throw error;
  }
}

/**
 * Saves a DayLog record
 * @param data - DayLog record to save
 */
export async function saveDayLog(data: DayLog): Promise<void> {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['DayLog'], 'readwrite');
      const store = transaction.objectStore('DayLog');
      const request = store.put(data);
      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error('Error saving day log:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Failed to save day log:', error);
    throw error;
  }
}

/**
 * Deletes a DayLog by date
 * @param date - Date in YYYY-MM-DD format
 */
export async function deleteDayLog(date: string): Promise<void> {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['DayLog'], 'readwrite');
      const store = transaction.objectStore('DayLog');
      const request = store.delete(date);
      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error('Error deleting day log:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Failed to delete day log:', error);
    throw error;
  }
}

/**
 * Gets all DayLogs for a specific week
 * @param iso_year - ISO year
 * @param week_number - ISO week number (1-53)
 * @returns Promise resolving to array of DayLog records
 */
export async function getDayLogsByWeek(
  iso_year: number,
  week_number: number
): Promise<DayLog[]> {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['DayLog'], 'readonly');
      const store = transaction.objectStore('DayLog');
      const index = store.index('week');
      const request = index.getAll([iso_year, week_number]);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.error('Error getting day logs by week:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Failed to get day logs by week:', error);
    throw error;
  }
}

/**
 * Gets all DayLogs from the database
 * @returns Promise resolving to array of all DayLog records
 */
export async function getAllDayLogs(): Promise<DayLog[]> {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['DayLog'], 'readonly');
      const store = transaction.objectStore('DayLog');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.error('Error getting all day logs:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Failed to get all day logs:', error);
    throw error;
  }
}

// ============================================================
// WeekTarget Operations
// ============================================================

/**
 * Gets a WeekTarget by key
 * @param key - Week key in YYYY-Wnn format
 * @returns Promise resolving to WeekTarget or undefined if not found
 */
export async function getWeekTarget(
  key: string
): Promise<WeekTarget | undefined> {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['WeekTarget'], 'readonly');
      const store = transaction.objectStore('WeekTarget');
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.error('Error getting week target:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Failed to get week target:', error);
    throw error;
  }
}

/**
 * Saves a WeekTarget record
 * @param data - WeekTarget record to save
 */
export async function saveWeekTarget(data: WeekTarget): Promise<void> {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['WeekTarget'], 'readwrite');
      const store = transaction.objectStore('WeekTarget');
      const request = store.put(data);
      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error('Error saving week target:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Failed to save week target:', error);
    throw error;
  }
}

/**
 * Gets all WeekTargets from the database
 * @returns Promise resolving to array of all WeekTarget records
 */
export async function getAllWeekTargets(): Promise<WeekTarget[]> {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['WeekTarget'], 'readonly');
      const store = transaction.objectStore('WeekTarget');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.error('Error getting all week targets:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Failed to get all week targets:', error);
    throw error;
  }
}

// ============================================================
// Test Helper (For Unit Tests)
// ============================================================

/**
 * Reset internal db reference for testing purposes
 * This allows tests to reopen a clean database
 * @internal
 */
export function __resetDB(): void {
  db = null;
}
