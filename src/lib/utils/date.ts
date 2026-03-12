import { CalendarDate, getLocalTimeZone, type DateValue } from '@internationalized/date';

/** Format timestamp as YYYY-MM-DD for date inputs. */
export function tsToDateStr(ts: number): string {
	const d = new Date(ts);
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

/** Parse YYYY-MM-DD string to start-of-day timestamp. */
export function dateStrToTs(str: string): number {
	if (!str) return 0;
	const [y, m, d] = str.split('-').map(Number);
	if (isNaN(y) || isNaN(m) || isNaN(d)) return 0;
	return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}

/** Parse YYYY-MM-DD string to end-of-day timestamp. */
export function endOfDayTs(str: string): number {
	if (!str) return 0;
	const [y, m, d] = str.split('-').map(Number);
	if (isNaN(y) || isNaN(m) || isNaN(d)) return 0;
	return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
}

/** Convert timestamp to CalendarDate for shadcn Calendar. */
export function tsToCalendarDate(ts: number): CalendarDate {
	const d = new Date(ts);
	return new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/** Convert DateValue (CalendarDate | CalendarDateTime etc.) to start-of-day timestamp. */
export function calendarDateToStartTs(d: DateValue): number {
	const js = d.toDate(getLocalTimeZone());
	return new Date(js.getFullYear(), js.getMonth(), js.getDate(), 0, 0, 0, 0).getTime();
}

/** Convert DateValue to end-of-day timestamp. */
export function calendarDateToEndTs(d: DateValue): number {
	const js = d.toDate(getLocalTimeZone());
	return new Date(js.getFullYear(), js.getMonth(), js.getDate(), 23, 59, 59, 999).getTime();
}
