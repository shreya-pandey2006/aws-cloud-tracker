/**
 * Time utility for AWS Cloud Tracker
 * Formats all timestamps in Indian Standard Time (IST, UTC+5:30)
 */

export function parseUtcDate(timestamp) {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp === 'number') return new Date(timestamp);

  if (typeof timestamp === 'string') {
    let clean = timestamp.trim();
    // If SQLite format "YYYY-MM-DD HH:MM:SS" without Z
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(clean)) {
      clean = clean.replace(' ', 'T') + 'Z';
    } else if (
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(clean) &&
      !clean.endsWith('Z') &&
      !/[+-]\d{2}:\d{2}$/.test(clean)
    ) {
      clean = clean + 'Z';
    }

    const date = new Date(clean);
    return isNaN(date.getTime()) ? null : date;
  }

  return null;
}

export function formatTimeIst(timestamp, options = {}) {
  const date = parseUtcDate(timestamp);
  if (!date) return 'Recently';

  const {
    includeSeconds = false,
    includeDate = false,
    includeTimezone = false
  } = options;

  try {
    if (includeDate) {
      return date.toLocaleString('en-US', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        ...(includeSeconds ? { second: '2-digit' } : {}),
        hour12: true
      });
    }

    const timeStr = date.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      ...(includeSeconds ? { second: '2-digit' } : {}),
      hour12: true
    });

    return includeTimezone ? `${timeStr} IST` : timeStr;
  } catch {
    return 'Recently';
  }
}

