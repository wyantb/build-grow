/**
 * Format a timestamp for the player.
 *
 * The time is shown in the player's own timezone, followed by the UTC offset,
 * so the reading is unambiguous without having to trust the browser's
 * timezone settings.
 */

/**
 * The UTC offset of `date`, as `GMT+hhmm`.
 *
 * `getTimezoneOffset` counts the minutes a zone is behind UTC, so east of
 * Greenwich the sign is flipped. The offset is rounded to the nearest
 * quarter of an hour, because that is the resolution the zones actually
 * use.
 */
const formatUtcOffset = (date: Date): string => {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';

  const absolute = Math.abs(offsetMinutes);
  const hours = Math.floor(absolute / 60);
  const minutes = absolute % 60;

  return `GMT${sign}${String(hours).padStart(2, '0')}${String(minutes).padStart(2, '0')}`;
};

/**
 * Format an ISO timestamp as the local time, with the UTC offset.
 *
 * The date and time are formatted with the browser's locale, so the reading
 * matches what the player expects. The UTC offset is appended, because a
 * bare local time does not say which zone it belongs to.
 */
export const formatDateTime = (iso: string): string => {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return `${date.toLocaleString()} ${formatUtcOffset(date)}`;
};
