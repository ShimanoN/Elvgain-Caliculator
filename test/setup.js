import './mocks/indexedDB.js';

// Import TypeScript modules and attach to globalThis for backward compatibility with tests
import * as db from '../js/db.ts';
import * as isoWeek from '../js/iso-week.ts';
import * as calculations from '../js/calculations.ts';

// Attach to globalThis for tests that expect globals
Object.assign(globalThis, db);
Object.assign(globalThis, isoWeek);
Object.assign(globalThis, calculations);
