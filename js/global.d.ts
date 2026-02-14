/**
 * Global type declarations for window-level extensions
 *
 * These properties are attached to `window` at runtime by various modules
 * for cross-page/cross-module communication. Declaring them here
 * eliminates the need for `(window as any)` casts.
 */

export {};

declare global {
  interface Window {
    /** Navigate week-target page to a specific ISO week (from week-target.ts) */
    setWeekByISO?: (isoYear: number, weekNumber: number) => Promise<void>;
    /** Run ISO week calculation tests in console (from dev/test.ts) */
    runISOWeekTests?: () => void;
    /** E2E test mode flag (injected by Playwright via page.addInitScript) */
    __E2E__?: boolean;
    /** Elevation Loom backup API (for E2E/backup-restore.spec.ts) */
    elvBackup?: {
      exportBackup: () => any;
      importBackup: (data: any) => boolean;
    };
  }

  /** Custom dataset properties used on HTMLElements */
  interface HTMLElementDatasetMap {
    userEdited?: string;
  }
}
