/**
 * Date utility functions for local time handling
 * These functions avoid UTC-related issues when working with date strings
 *
 * Note: These functions are intentionally global (not assigned to window)
 * to maintain consistency with other utility files in this codebase.
 */

/**
 * Format Date object to "YYYY-MM-DD" string in local time
 * @param {Date} date - Date object to format
 * @returns {string} Formatted date string "YYYY-MM-DD"
 */
function formatDateLocal(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parse "YYYY-MM-DD" string to Date object in local time
 * Note: new Date("YYYY-MM-DD") is interpreted as UTC, so we avoid it
 * @param {string} str - Date string in "YYYY-MM-DD" format
 * @returns {Date} Date object in local time (returns current date if invalid)
 */
function parseDateLocal(str) {
  if (!str || typeof str !== 'string') {
    console.error('Invalid date string:', str);
    return new Date();
  }
  const [y, m, d] = str.split('-').map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) {
    console.error('Invalid date components:', str);
    return new Date();
  }
  return new Date(y, m - 1, d);
}
