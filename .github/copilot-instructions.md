# Elevation Loom (Elvgain Calculator) - Copilot Instructions

## Project Overview

This is a **web application for tracking elevation gain (climbing) progress with weekly targets**. Users log daily elevation gains across multiple sessions and track progress toward weekly goals.

**Target Audience**: The project is specifically designed for **PLC (Programmable Logic Controller) engineers** transitioning to web development. Documentation uses PLC/ST terminology mappings and analogies (e.g., IndexedDB = 保持型メモリ, async = flag waiting).

## Tech Stack

### Frontend
- **Vanilla JavaScript** (ES5+, no frameworks or ES6 modules)
- **HTML5** (two pages: `index.html` and `week-target.html`)
- **CSS3** (traditional styling in `css/style.css`)
- **Canvas API** + **html2canvas** library for chart rendering and image export

### Storage
- **IndexedDB** (primary browser storage, no backend server)
- **LocalStorage** (backup/restore functionality)

### Development Tools
- **Node.js** ≥20.19.0 (required for ESLint 10)
- **ESLint v10** with flat config format (`eslint.config.js`)
- **Prettier** for code formatting
- **Husky** + **lint-staged** for pre-commit hooks

### Testing
- **Vitest** (unit/integration tests with jsdom environment)
- **Playwright** (e2e tests with HTML reports)
- **fake-indexeddb** (mocking IndexedDB in tests)

## Key Architecture Patterns

### Critical: No ES6 Modules (Global Scope Pattern)

This application **does NOT use ES6 modules**. All JavaScript files share functions via **global scope**.

**Important implications:**
1. Functions are declared globally and must be unique across all files
2. HTML `<script>` tag load order is **critical** (dependencies must load first)
3. Document dependencies at the top of each file with comments like:
   ```javascript
   // Dependencies: getDayLog, saveWeekTarget (from db.js)
   ```

**Required script load order:**
```
iso-week.js → date-utils.js → db.js → calculations.js → 
backup.js → chart.js → export-image.js → app.js/week-target.js
```

### Async/Await Pattern
- All database operations use `async/await`
- Always wrap DB operations in `try-catch` blocks with `console.error` logging
- Example:
  ```javascript
  try {
    const dayLog = await getDayLog(date);
  } catch (error) {
    console.error('Error loading day log:', error);
  }
  ```

### Event-Driven Architecture
- Form inputs trigger `blur` events that call `saveData()` functions
- Navigation uses CustomEvent for date changes
- Backup system wraps save functions to schedule automatic backups

## Coding Guidelines

### Code Style (Enforced by ESLint + Prettier)
- **Indentation**: 2 spaces (never tabs)
- **Quotes**: Single quotes for strings
- **Semicolons**: Required
- **Line width**: 80 characters max
- **Trailing commas**: ES5 style (objects/arrays only, not function params)

### Naming Conventions
- **Functions**: camelCase (e.g., `getDayLog`, `calculateWeekTotal`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `DB_NAME`, `DB_VERSION`)
- **Variables**: camelCase with descriptive names
- **Database fields**: snake_case (e.g., `elevation_part1`, `iso_year`)

### Documentation Requirements
- Add JSDoc comments for all functions:
  ```javascript
  /**
   * Get day log data for a specific date
   * @param {string} dateStr - Date in YYYY-MM-DD format
   * @returns {Promise<Object|null>} Day log object or null
   */
  async function getDayLog(dateStr) { ... }
  ```

### Input Validation (Security Critical)
- **Always validate numeric inputs** with `isNaN()` checks
- **Check for negative values** before processing
- **Use date utilities** from `date-utils.js`:
  - `formatDateLocal(date)` - Format dates for display/storage
  - `parseDateLocal(dateStr)` - Parse date strings with validation
  - **NEVER** use `new Date("YYYY-MM-DD")` directly

### Error Handling
- All database operations must have try-catch blocks
- Log errors with `console.error` including context
- Provide user feedback for errors (alerts or UI messages)

## Data Model

### IndexedDB Stores

**DayLog** (primary key: `date` string in YYYY-MM-DD format):
```javascript
{
  date: "2024-03-15",
  elevation_part1: 500,
  elevation_part2: 300,
  elevation_total: 800,
  subjective_condition: "good",
  iso_year: 2024,
  week_number: 11,
  // ... other fields
}
```

**WeekTarget** (primary key: `key` as "YYYY-Www" format):
```javascript
{
  key: "2024-W11",
  target_elevation: 3000,
  iso_year: 2024,
  week_number: 11
}
```

## Testing Requirements

### Unit Tests (Vitest)
- Test files: `test/*.test.js`
- Use fake-indexeddb for mocking
- Target: 89%+ code coverage (current level)
- Run with: `npm test` or `npm run test:coverage`

### E2E Tests (Playwright)
- Test files: `e2e/*.spec.js`
- Uses Python HTTP server on localhost:8000
- Tests Chrome + Firefox browsers
- Run with: `npm run e2e` or `npm run e2e:ui`

### Testing Guidelines
- Write tests for new functions/features
- Mock IndexedDB using fake-indexeddb in unit tests
- Use descriptive test names: `test('should calculate week total correctly', ...)`
- Test edge cases: null values, invalid dates, negative numbers

## Security Practices

### Input Sanitization
- Validate all user inputs before processing or storing
- Check for NaN on numeric inputs
- Sanitize data before database operations

### Data Validation
```javascript
// Example validation pattern
const elevation = parseFloat(input.value);
if (isNaN(elevation) || elevation < 0) {
  console.error('Invalid elevation value');
  return;
}
```

### No Secrets in Code
- No API keys or sensitive data (this is a client-side only app)
- LocalStorage used only for non-sensitive backup data

## File Organization

### Directory Structure
```
/js/              - Core application JavaScript
/js/dev/          - Development-only files (not in production)
/css/             - Stylesheets
/docs/            - Documentation (PLC engineer focused)
/test/            - Unit/integration tests
/e2e/             - End-to-end tests
/scripts/         - Build/utility scripts
```

### Development Files
- Development-only files (like test utilities) go in `js/dev/` directory
- Do not place development files in the main `js/` directory

## Build/Run/Test Commands

### Setup
```bash
npm install  # Install dependencies and setup Git hooks
```

### Development
```bash
# Open index.html or week-target.html in browser (no build step needed)
# Or use a local HTTP server:
python -m http.server 8000
```

### Code Quality
```bash
npm run lint          # Check ESLint errors
npm run lint:fix      # Auto-fix ESLint errors
npm run format        # Format code with Prettier
npm run format:check  # Check formatting without changes
```

### Testing
```bash
npm test              # Run Vitest tests (watch mode)
npm run test:ui       # Run Vitest with UI
npm run test:coverage # Generate coverage report
npm run e2e           # Run Playwright e2e tests
npm run e2e:ui        # Run Playwright with UI
```

### Pre-commit Hooks
- Husky automatically runs ESLint + Prettier on staged files
- Fixes are applied automatically when possible
- Commit will fail if unfixable linting errors exist

## Documentation for PLC Engineers

The project has extensive documentation tailored for PLC/ladder logic engineers:

- **docs/QUICK_START_FOR_PLC_ENGINEERS.md** - 30-minute onboarding guide
- **docs/CODE_WALKTHROUGH.md** - Detailed code explanation with PLC analogies
- **docs/LEARNING_PATH.md** - Phase-based learning progression
- **docs/DOCUMENTATION_INDEX.md** - Central hub for all documentation

### PLC Terminology Mappings
When writing documentation or comments for this audience:
- **Function Block (FB)** → JavaScript function
- **保持型メモリ (Retentive Memory)** → IndexedDB
- **スキャン実行 (Scan Execution)** → Event-driven execution
- **モニタリング (Monitoring)** → Browser DevTools
- **テストモード (Test Mode)** → Console commands
- **フラグ待ち (Flag Waiting)** → async/await

## Special Conventions

### 30-Day Navigation Boundary
- Date navigation is restricted to the last 30 days for data safety
- Implemented in app.js and week-target.js

### ISO Week Handling
- Uses ISO 8601 week dates (Monday start, week 1 = first week with Thursday)
- `iso-week.js` provides utilities: `getISOYear()`, `getISOWeek()`
- Critical for week-based features and data organization

### Backup System
- `backup.js` wraps `saveDayLog`/`saveWeekTarget` functions
- Automatic backups scheduled to localStorage
- Exposes `window.elvBackup` API for manual backup/restore

## Common Tasks & Patterns

### Adding a New Form Input Field
1. Add HTML input in `index.html` or `week-target.html`
2. Add corresponding field to data model in `db.js`
3. Update save/load functions to handle new field
4. Add validation logic in form handlers
5. Update tests to cover new field

### Extending Database Schema
1. Increment `DB_VERSION` constant in `db.js`
2. Update `onupgradeneeded` handler to migrate existing data
3. Update TypeScript-style JSDoc type definitions
4. Test migration with existing data

### Adding New Calculations
1. Add function to `calculations.js`
2. Export via global scope
3. Add unit tests in `test/calculations.test.js`
4. Document any PLC analogies in code comments

## Important Notes

### What NOT to Do
- ❌ Do NOT use ES6 import/export statements
- ❌ Do NOT use `new Date("YYYY-MM-DD")` directly (use `parseDateLocal()`)
- ❌ Do NOT skip input validation on numeric fields
- ❌ Do NOT place development files in main `js/` directory (use `js/dev/`)
- ❌ Do NOT remove or modify working code unless absolutely necessary
- ❌ Do NOT add new dependencies without checking Node.js version requirements

### Best Practices
- ✅ Use global function declarations with clear names
- ✅ Document dependencies at top of files
- ✅ Wrap all DB operations in try-catch blocks
- ✅ Use date-utils.js functions for all date operations
- ✅ Follow existing code patterns and conventions
- ✅ Write tests for new functionality
- ✅ Run linting and formatting before committing
- ✅ Consider PLC engineer perspective in documentation

## Getting Help

- Review existing code in `js/` directory for patterns
- Check `docs/CODE_WALKTHROUGH.md` for detailed explanations
- See `docs/QUICK_START_FOR_PLC_ENGINEERS.md` for DevTools debugging tips
- Run `npm run docs:todos` to see current TODO items
