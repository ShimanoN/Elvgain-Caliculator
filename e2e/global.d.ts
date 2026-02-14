/**
 * Global type declarations for E2E test environment
 *
 * These extend window types used in E2E tests with Playwright.
 * Separating this from js/global.d.ts keeps test-specific types isolated.
 */

declare global {
  interface Window {
    /** E2E test mode flag (injected by Playwright via page.addInitScript) */
    __E2E__?: boolean;
    /** html2canvas stub for export testing */
    html2canvas?: (
      element: HTMLElement,
      options?: any
    ) => Promise<HTMLCanvasElement>;
    /** Elevation Loom backup API (for E2E/backup-restore.spec.ts) */
    elvBackup?: Record<string, (...args: unknown[]) => unknown>;
  }
}

export {};
