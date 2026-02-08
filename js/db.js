const DB_NAME = 'TrainingMirrorDB';
const DB_VERSION = 1;

/** @type {IDBDatabase | null} */
let db = null;

/**
 * Initializes the IndexedDB.
 * @returns {Promise<IDBDatabase>}
 */
async function initDB() {
    if (db) return db;

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

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
                dayLogStore.createIndex('week', ['iso_year', 'week_number'], { unique: false });
            }

            // WeekTarget Store
            if (!db.objectStoreNames.contains('WeekTarget')) {
                db.createObjectStore('WeekTarget', { keyPath: 'key' });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

/**
 * Gets a DayLog by date.
 * @param {string} date "YYYY-MM-DD"
 * @returns {Promise<any>}
 */
async function getDayLog(date) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['DayLog'], 'readonly');
        const store = transaction.objectStore('DayLog');
        const request = store.get(date);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Saves a DayLog.
 * @param {any} data 
 * @returns {Promise<void>}
 */
async function saveDayLog(data) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['DayLog'], 'readwrite');
        const store = transaction.objectStore('DayLog');
        const request = store.put(data);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

/**
 * Gets all DayLogs for a specific week.
 * @param {number} iso_year 
 * @param {number} week_number 
 * @returns {Promise<any[]>}
 */
async function getDayLogsByWeek(iso_year, week_number) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['DayLog'], 'readonly');
        const store = transaction.objectStore('DayLog');
        const index = store.index('week');
        const request = index.getAll([iso_year, week_number]);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Gets all DayLogs.
 * @returns {Promise<any[]>}
 */
async function getAllDayLogs() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['DayLog'], 'readonly');
        const store = transaction.objectStore('DayLog');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Gets a WeekTarget by key.
 * @param {string} key "YYYY-Wnn"
 * @returns {Promise<any>}
 */
async function getWeekTarget(key) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['WeekTarget'], 'readonly');
        const store = transaction.objectStore('WeekTarget');
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Saves a WeekTarget.
 * @param {any} data 
 * @returns {Promise<void>}
 */
async function saveWeekTarget(data) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['WeekTarget'], 'readwrite');
        const store = transaction.objectStore('WeekTarget');
        const request = store.put(data);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

/**
 * Gets all WeekTargets.
 * @returns {Promise<any[]>}
 */
async function getAllWeekTargets() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['WeekTarget'], 'readonly');
        const store = transaction.objectStore('WeekTarget');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}
