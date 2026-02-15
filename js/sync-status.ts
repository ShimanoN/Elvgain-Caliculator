/**
 * Sync status UI module
 * Displays sync status badge in header with pending count, online/offline status,
 * and manual sync button
 */

// ============================================================
// Constants
// ============================================================

const POLL_INTERVAL = 5000; // Poll every 5 seconds
const LAST_SYNC_KEY = 'elv_last_sync_time';

// ============================================================
// Types
// ============================================================

type SyncStatus = 'ok' | 'pending' | 'offline' | 'error';

interface SyncState {
  status: SyncStatus;
  pendingCount: number | null;
  lastSyncTime: Date | null;
  online: boolean;
}

// ============================================================
// Module State
// ============================================================

let pollTimer: number | null = null;
let currentState: SyncState = {
  status: 'offline',
  pendingCount: null,
  lastSyncTime: null,
  online: navigator.onLine,
};

// ============================================================
// DOM Elements
// ============================================================

let statusBadge: HTMLElement | null = null;
let pendingCountEl: HTMLElement | null = null;
let syncButton: HTMLButtonElement | null = null;
let lastSyncEl: HTMLElement | null = null;
let toastEl: HTMLElement | null = null;

// Event handler references for cleanup
let syncButtonHandler: (() => void) | null = null;

// ============================================================
// Utilities
// ============================================================

/**
 * Format date to short relative time string (e.g., "2m ago", "1h ago")
 * @param date - Date to format
 * @returns Formatted string
 */
function formatTimeAgo(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

/**
 * Get last sync time from localStorage
 * @returns Last sync time or null
 */
function getLastSyncTime(): Date | null {
  try {
    const stored = localStorage.getItem(LAST_SYNC_KEY);
    if (stored) {
      return new Date(stored);
    }
  } catch (error) {
    console.error('Failed to read last sync time:', error);
  }
  return null;
}

/**
 * Save last sync time to localStorage
 * @param date - Date to save
 */
function saveLastSyncTime(date: Date): void {
  try {
    localStorage.setItem(LAST_SYNC_KEY, date.toISOString());
  } catch (error) {
    console.error('Failed to save last sync time:', error);
  }
}

/**
 * Show toast notification
 * @param message - Message to display
 * @param type - Toast type (success or error)
 */
function showToast(message: string, type: 'success' | 'error'): void {
  if (!toastEl) return;

  toastEl.textContent = message;
  toastEl.className = `sync-toast sync-toast--${type} sync-toast--visible`;

  // Auto-hide after 3 seconds
  setTimeout(() => {
    if (toastEl) {
      toastEl.classList.remove('sync-toast--visible');
    }
  }, 3000);
}

// ============================================================
// State Management
// ============================================================

/**
 * Check if elvSync API is available
 * @returns true if available
 */
function isSyncAPIAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.elvSync !== 'undefined';
}

/**
 * Update sync state based on current conditions
 */
async function updateSyncState(): Promise<void> {
  const online = navigator.onLine;
  currentState.online = online;

  // Check if API is available
  if (!isSyncAPIAvailable()) {
    currentState.status = 'error';
    currentState.pendingCount = null;
    updateUI();
    return;
  }

  // If offline, set offline status
  if (!online) {
    currentState.status = 'offline';
    updateUI();
    return;
  }

  // Get pending count
  try {
    const pendingCount = window.elvSync!.getPendingCount();
    const previousPendingCount = currentState.pendingCount;
    currentState.pendingCount = pendingCount;

    // Update status based on pending count
    if (pendingCount === 0) {
      currentState.status = 'ok';
      // Save sync time only when transitioning from pending to 0
      if (previousPendingCount !== null && previousPendingCount > 0) {
        const now = new Date();
        saveLastSyncTime(now);
        currentState.lastSyncTime = now;
      }
    } else {
      currentState.status = 'pending';
    }
  } catch (error) {
    console.error('Failed to get pending count:', error);
    currentState.status = 'error';
    currentState.pendingCount = null;
  }

  updateUI();
}

/**
 * Update UI based on current state
 */
function updateUI(): void {
  if (!statusBadge || !pendingCountEl || !lastSyncEl) return;

  // Update status badge class
  statusBadge.className = `sync-status-badge sync-status-badge--${currentState.status}`;

  // Update pending count
  if (currentState.pendingCount !== null) {
    pendingCountEl.textContent = String(currentState.pendingCount);
  } else {
    pendingCountEl.textContent = '—';
  }

  // Update last sync time
  if (currentState.lastSyncTime) {
    lastSyncEl.textContent = formatTimeAgo(currentState.lastSyncTime);
  } else {
    lastSyncEl.textContent = '—';
  }

  // Update sync button state
  if (syncButton) {
    if (currentState.status === 'error') {
      syncButton.disabled = true;
      syncButton.title = 'Sync API not available';
    } else if (!currentState.online) {
      syncButton.disabled = true;
      syncButton.title = 'Offline';
    } else {
      syncButton.disabled = false;
      syncButton.title = 'Manually trigger sync';
    }
  }
}

// ============================================================
// Event Handlers
// ============================================================

/**
 * Handle manual sync button click
 */
async function handleManualSync(): Promise<void> {
  if (!isSyncAPIAvailable()) {
    showToast(
      'Sync API not available. Use elvBackup.exportBackup() to export data.',
      'error'
    );
    console.error(
      'elvSync API not available. To manually export data, use: elvBackup.exportBackup()'
    );
    return;
  }

  if (!currentState.online) {
    showToast('Cannot sync while offline', 'error');
    return;
  }

  // Disable button during sync
  if (syncButton) {
    syncButton.disabled = true;
    syncButton.textContent = 'Syncing...';
  }

  try {
    const result = await window.elvSync!.trigger();

    if (result.success) {
      showToast('Sync completed successfully', 'success');
      // Update state immediately
      await updateSyncState();
    } else {
      showToast(result.message, 'error');
    }
  } catch (error) {
    console.error('Manual sync error:', error);
    showToast('Sync failed. Check console for details.', 'error');
  } finally {
    // Re-enable button
    if (syncButton) {
      syncButton.disabled = false;
      syncButton.textContent = 'Sync Now';
    }
  }
}

/**
 * Handle online event
 */
function handleOnline(): void {
  console.log('Network online, updating sync status');
  updateSyncState().catch((error) => {
    console.error('Failed to update sync status on online event:', error);
  });
}

/**
 * Handle offline event
 */
function handleOffline(): void {
  console.log('Network offline, updating sync status');
  updateSyncState().catch((error) => {
    console.error('Failed to update sync status on offline event:', error);
  });
}

/**
 * Handle sync:complete event from sync-retry.ts
 */
function handleSyncComplete(): void {
  console.log('Sync complete event received, updating status');
  updateSyncState().catch((error) => {
    console.error('Failed to update sync status on sync complete:', error);
  });
}

// ============================================================
// Initialization
// ============================================================

/**
 * Start polling for sync status
 */
function startPolling(): void {
  if (pollTimer) return;

  console.log('Starting sync status polling');
  pollTimer = window.setInterval(() => {
    updateSyncState().catch((error) => {
      console.error('Polling error:', error);
    });
  }, POLL_INTERVAL);

  // Immediate first update
  updateSyncState().catch((error) => {
    console.error('Initial sync status update error:', error);
  });
}

/**
 * Stop polling
 */
function stopPolling(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
    console.log('Stopped sync status polling');
  }
}

/**
 * Initialize sync status UI
 */
export function initSyncStatus(): void {
  // Get DOM elements
  statusBadge = document.getElementById('sync-status-badge');
  pendingCountEl = document.getElementById('sync-pending-count');
  syncButton = document.getElementById(
    'sync-now-button'
  ) as HTMLButtonElement | null;
  lastSyncEl = document.getElementById('sync-last-time');
  toastEl = document.getElementById('sync-toast');

  if (!statusBadge || !pendingCountEl || !syncButton || !lastSyncEl) {
    console.warn('Sync status UI elements not found, skipping initialization');
    return;
  }

  // Load last sync time from localStorage
  currentState.lastSyncTime = getLastSyncTime();

  // Setup event listeners
  // Store the handler so we can properly remove it later
  syncButtonHandler = () => {
    handleManualSync().catch((error) => {
      console.error('Manual sync handler error:', error);
    });
  };
  syncButton.addEventListener('click', syncButtonHandler);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  window.addEventListener('sync:complete', handleSyncComplete);

  // Start polling
  startPolling();

  console.log('Sync status UI initialized');
}

// ============================================================
// Cleanup (for testing)
// ============================================================

/**
 * Cleanup function for testing
 * Removes event listeners and stops polling
 */
export function cleanupSyncStatus(): void {
  stopPolling();

  if (syncButton && syncButtonHandler) {
    syncButton.removeEventListener('click', syncButtonHandler);
    syncButtonHandler = null;
  }

  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
  window.removeEventListener('sync:complete', handleSyncComplete);

  console.log('Sync status UI cleaned up');
}
