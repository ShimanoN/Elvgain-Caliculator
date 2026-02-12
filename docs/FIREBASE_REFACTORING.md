# Firebase Preparation Refactoring Summary

> Category: Reference (Historical)
>
> This document records the Firebase preparation phase and is kept for migration history.

## Overview

This refactoring prepares the Elevation Loom application for Firebase (Firestore + Auth) integration by:
1. Formalizing the domain model
2. Isolating the persistence layer
3. Documenting the existing architecture

**Important**: This is a structural stabilization pass, NOT a redesign. All existing behavior is preserved.

## Changes Made

### 1. Domain Model Formalization ✅

**Created `js/types.ts`** - Authoritative domain model types
- `WeekData` interface: Complete weekly state representation
  - Contains ISO year/week, date range, target elevation, daily logs, and timestamp
  - This type serves as the single source of truth for weekly data structure
- Re-exports `DayLog` and `WeekTarget` from db.js for convenience

**Verified existing types** already have proper structure:
- `DayLog` interface: Has all required fields including `updated_at`
- `WeekTarget` interface: Has all required fields including `updated_at`

### 2. Persistence Layer Isolation ✅

**Created `js/storage.ts`** - Clean persistence abstraction
- `loadWeekData(iso_year, week_number)`: Load complete week data
- `saveWeekData(data)`: Placeholder for future unified save (not used yet)
- `getSelectedWeek()`: Get currently selected week
- `setSelectedWeek(weekKey)`: Save currently selected week

**Benefits**:
- All localStorage access is now centralized in storage.ts and backup.ts
- Future Firebase integration only requires updating storage.ts
- UI code (app.ts, week-target.ts) is decoupled from storage implementation

**Updated `js/app.ts`**:
- Replaced direct `localStorage.setItem('elv_selected_week', ...)` with `setSelectedWeek()`
- No other changes to business logic or UI rendering

**Updated `js/week-target.ts`**:
- Replaced direct `localStorage.setItem('elv_selected_week', ...)` with `setSelectedWeek()`
- Replaced direct `localStorage.getItem('elv_selected_week')` with `getSelectedWeek()`
- No other changes to business logic or UI rendering

**NOT Changed** (intentional):
- `backup.ts` still uses localStorage directly - this is correct as it IS the backup storage layer
- Individual save operations (`saveDayLog`, `saveWeekTarget`) remain separate - unified saves will come later
- No changes to IndexedDB operations in db.js

### 3. Architecture Documentation

#### Current State Flow (Unchanged)

The application follows this pattern:

```
┌─────────────┐
│  User Input │
│   (DOM)     │
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│ Event Handler    │
│ (blur, change)   │
└────────┬─────────┘
         │
         ▼
┌────────────────────┐
│ Read from DOM      │
│ Validate input     │
│ Build DayLog obj   │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ saveDayLog()       │
│ or saveWeekTarget()│
│ (db.js)            │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ IndexedDB write    │
│ + Backup trigger   │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ Re-render UI       │
│ (updateWeekProgress)│
└────────────────────┘
```

#### Key Patterns

**Data Flow**:
- UI events trigger save operations
- Save operations write to IndexedDB
- After save, UI is re-rendered from latest data
- No implicit global mutable state (state lives in IndexedDB + DOM)

**Separation of Concerns**:
- `db.js`: IndexedDB operations (DayLog, WeekTarget CRUD)
- `storage.ts`: High-level persistence interface (future Firebase gateway)
- `backup.js`: Automatic backup to localStorage
- `app.ts`, `week-target.ts`: UI logic and DOM manipulation
- `calculations.ts`: Pure business logic (week totals, progress)

**State Management**:
- Application state is NOT held in memory
- Single source of truth: IndexedDB
- UI reads from IndexedDB on load/navigation
- UI writes to IndexedDB on user input
- Minimal module-level state (e.g., `weekBaseDate` for UI navigation)

## Firebase Readiness

### What This Achieves

1. **Clean Integration Point**: Future Firebase code only needs to be added in `storage.ts`
2. **Type Safety**: `WeekData` provides structure for Firestore documents
3. **Isolated Changes**: When switching to Firebase, only `storage.ts` needs major updates
4. **Testability**: Storage layer can be easily mocked for testing

### Future Firebase Integration Path

When ready for Firebase:

1. **Add Firebase SDK** to project
2. **Update `storage.ts`**:
   - Replace `loadWeekData()` implementation with Firestore query
   - Replace `saveWeekData()` with Firestore transaction
   - Keep same function signatures
3. **No changes needed** in app.ts, week-target.ts, or other UI code
4. **Consider migration strategy**:
   - Export existing IndexedDB data
   - Import to Firestore
   - Implement sync mechanism if needed

### What Was NOT Changed (Intentional)

✅ **No new libraries added** - Firebase will be added later
✅ **No architectural over-abstraction** - No interfaces, no DI, no Redux patterns
✅ **No breaking changes** - All existing code works identically
✅ **Separate save operations** - `saveDayLog()` and `saveWeekTarget()` remain separate
   - This is fine; they can be unified during Firebase migration if needed
✅ **IndexedDB still primary** - Firebase not yet implemented
✅ **Event-driven UI** - No state management framework needed
✅ **Backup system unchanged** - Still writes to localStorage, which is appropriate

## Testing Results

✅ **Type checking**: Passes (0 errors)
✅ **Unit tests**: All 45 tests pass
✅ **Build**: Successful compilation with Vite
❓ **E2E tests**: Skipped (require system dependencies not available in environment)

## Scope Discipline

This refactoring was intentionally limited to:
- 2 new files (types.ts, storage.ts)
- 2 modified files (app.ts, week-target.ts)
- ~200 lines of code added
- ~15 lines of code changed
- **Zero** feature changes
- **Zero** UI changes
- **Zero** test changes

## Next Steps (NOT Done Yet)

The following were identified but intentionally deferred:

1. **Unified Save Operation**: Could consolidate `saveDayLog`/`saveWeekTarget` into single `saveWeekData`
2. **Firebase SDK Integration**: Add and configure Firebase
3. **Authentication Layer**: Add user authentication
4. **Sync Strategy**: Handle offline/online sync
5. **Migration Tool**: Tool to migrate existing IndexedDB data to Firestore

These are intentionally left for future work to maintain narrow scope.

## Conclusion

This refactoring successfully:
- ✅ Creates clean persistence boundaries
- ✅ Preserves all existing behavior
- ✅ Maintains test coverage
- ✅ Prepares for Firebase with minimal future changes
- ✅ Avoids over-engineering
- ✅ Documents current architecture

The application is now structurally ready for Firebase integration while maintaining its current functionality.
