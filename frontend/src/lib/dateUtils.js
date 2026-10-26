/**
 * Tiny date formatting utility — no external dependencies.
 * Replaces date-fns to avoid large package installs.
 *
 * Supported patterns:
 *   'dd MMM yyyy'          → 26 Oct 2026
 *   'dd MMM yyyy, HH:mm'   → 26 Oct 2026, 14:30
 *   'HH:mm'                → 14:30
 *   'dd MMM yy'            → 26 Oct 26
 */
const pad = (n) => String(n).padStart(2, '0')
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export function format(date, fmt) {
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return ''
  return fmt
    .replace('dd',   pad(d.getDate()))
    .replace('MMM',  MONTHS[d.getMonth()])
    .replace('MM',   pad(d.getMonth() + 1))
    .replace('yyyy', String(d.getFullYear()))
    .replace('yy',   String(d.getFullYear()).slice(2))
    .replace('HH',   pad(d.getHours()))
    .replace('mm',   pad(d.getMinutes()))
}
