# Cloud-Native Architecture Guide

> Category: Reference
> 
> Current architecture guidance. Daily navigation starts from `docs/DOCUMENTATION_INDEX.md`.

## Overview

This project has been refactored to follow a **Firestore-authoritative architecture** where:
- **Firestore** is the single source of truth
- **IndexedDB** acts as a read-through/write-through cache
- **localStorage** stores only ephemeral UI state
- **Result types** provide type-safe error handling

## Architecture Principles

### 1. Firestore as Single Source of Truth

All persistent data MUST be stored in Firestore. No other layer may act as authoritative storage.

```
┌─────────────┐
│     UI      │ ← Never imports Firebase/IndexedDB directly
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  storage.ts │ ← ONLY persistence gateway
└──────┬──────┘
       │
       ├────────→ Firestore (Authoritative)
       │
       └────────→ IndexedDB (Cache)
```

### 2. Data Model

All week-related data is stored as a single atomic document:

**Path**: `users/{uid}/weeks/{isoYear-weekNumber}`

**Schema**:
```typescript
WeekData {
  isoYear: number
  isoWeek: number
  target: {
    value: number
    unit: string
  }
  dailyLogs: Array<{
    date: string
    value: number
    memo?: string
  }>
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### 3. Cache Strategy

**Read-through cache**:
1. Try IndexedDB cache first
2. If cache miss or stale (>5 min) → fetch from Firestore
3. Update cache with fresh data

**Write-through cache**:
1. Write to Firestore first (authoritative)
2. On success → update IndexedDB cache
3. On failure → return error (no silent local-only success)

### 4. Error Handling

All persistence operations return `Result<T, E>` types:

```typescript
const result = await loadWeekData(2026, 7);

if (result.ok) {
  console.log('Data:', result.value);
} else {
  console.error('Error:', result.error);
}
```

## Key Files

### Core Architecture

- **`js/storage.ts`** - Unified storage gateway (Firestore + cache)
- **`js/firebase-config.ts`** - Firebase initialization and configuration
- **`js/result.ts`** - Result type system for error handling
- **`js/types.ts`** - Core domain model types

### Compatibility Layer

- **`js/storage-compat.ts`** - Compatibility adapters for legacy code
- **`js/migration-adapter.ts`** - Data migration utilities
- **`js/db.ts`** - Facade over new storage layer (maintains old API)

### Backup Files (Reference Only)

- **`js/db-old.ts`** - Original IndexedDB implementation
- **`js/storage-old.ts`** - Original storage implementation

## Environment Configuration

Create a `.env` file based on `.env.example`:

```bash
# Production Firebase configuration
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_PROJECT_ID=your-project-id
# ... etc

# Development: Use emulator
VITE_USE_FIREBASE_EMULATOR=true
VITE_FIREBASE_EMULATOR_HOST=localhost
VITE_FIREBASE_EMULATOR_PORT=8080
```

**Demo Mode**: If Firebase credentials are not configured, the app runs in demo mode with a mock user ID. **WARNING**: In demo mode, all users share the same data. This is intended for development only and should NOT be used in production. Implement Firebase Authentication for production deployment.

## Migration Guide

### For Existing Users

1. **Data Migration**: Use the migration adapter to move existing IndexedDB data to Firestore:

```typescript
import { migrateAllData } from './js/migration-adapter.js';

const result = await migrateAllData();
console.log(`Migrated ${result.migratedWeeks} weeks`);
if (result.errors.length > 0) {
  console.error('Errors:', result.errors);
}
```

2. **Backup**: The old backup system (localStorage-based) is deprecated. Firestore provides automatic backups.

### For Developers

1. **Never Import Firebase Directly**: UI components must only use `storage.ts`
2. **Use Result Types**: All persistence operations return `Result<T, E>`
3. **Atomic Updates**: Always update entire week documents, never partial
4. **Handle Offline**: Firestore SDK handles offline mode automatically

## API Reference

### Storage Layer (`js/storage.ts`)

#### `loadWeekData(isoYear, isoWeek)`
Load complete week data with read-through caching.

```typescript
const result = await loadWeekData(2026, 7);
if (result.ok) {
  const weekData = result.value;
  console.log('Target:', weekData.target.value);
  console.log('Logs:', weekData.dailyLogs);
}
```

#### `saveWeekData(data)`
Save complete week data atomically.

```typescript
const result = await saveWeekData({
  isoYear: 2026,
  isoWeek: 7,
  target: { value: 5000, unit: 'm' },
  dailyLogs: [
    { date: '2026-02-10', value: 800 },
    { date: '2026-02-11', value: 1200 },
  ],
});

if (!result.ok) {
  console.error('Save failed:', result.error);
}
```

#### `saveDayLog(date, logEntry)`
Update a single day's log (loads week, updates, saves atomically).

```typescript
const result = await saveDayLog('2026-02-10', {
  date: '2026-02-10',
  value: 800,
  memo: 'Morning climb',
});
```

#### `saveWeekTarget(isoYear, isoWeek, targetValue)`
Update week target (loads week, updates target, saves atomically).

```typescript
const result = await saveWeekTarget(2026, 7, 5000);
```

#### `clearAllCache()`
Clear IndexedDB cache (e.g., on logout).

```typescript
await clearAllCache();
```

### Ephemeral UI State

#### `getSelectedWeek()` / `setSelectedWeek(weekKey)`
Persist currently selected week in localStorage (UI state only).

```typescript
setSelectedWeek('2026-W07');
const current = getSelectedWeek(); // '2026-W07'
```

## Testing

### Run All Tests
```bash
npm run test
```

### Run Specific Test
```bash
npm run test:run -- test/result.test.js
```

### Test Coverage
```bash
npm run test:coverage
```

## Known Limitations

### Deprecated Functions

The following functions are deprecated and return empty arrays:
- `getAllDayLogs()` - Not scalable with Firestore
- `getAllWeekTargets()` - Not scalable with Firestore

**Workaround**: Query specific weeks or date ranges from Firestore.

### Backup System

The old `backup.ts` system (localStorage-based) needs redesign:
- **Issue**: Relies on `getAllDayLogs()` which doesn't work with Firestore
- **Solution**: Use Firestore's built-in backup features or implement export functionality

## Security

### Firestore Rules (Example)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/weeks/{weekId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Data Validation

All writes validate:
- User authentication
- Document structure (enforced by TypeScript types)
- Atomic updates (entire week document)

## Deployment

### Build
```bash
npm run build
```

### Environment Variables

Set the following in your deployment platform:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

## Troubleshooting

### "User not authenticated" error
- In demo mode, this should not happen (uses `demo-user`)
- In production, ensure Firebase Auth is configured

### Cache is stale
- Cache TTL is 5 minutes
- Clear cache: `await clearAllCache()`

### Firestore offline errors
- Firestore SDK handles offline mode automatically
- Data is synced when connection restored

## Future Enhancements

1. **Authentication**: Implement Firebase Auth (currently uses demo mode)
2. **Real-time Sync**: Use Firestore onSnapshot for live updates
3. **Backup Export**: Implement user-initiated data export
4. **Bulk Operations**: Batch writes for multiple weeks
5. **Analytics**: Track usage patterns with Firestore queries

## Contributing

When making changes:
1. Never break the storage abstraction
2. Always use Result types for persistence
3. Update tests for new functionality
4. Document any API changes

## License

MIT
