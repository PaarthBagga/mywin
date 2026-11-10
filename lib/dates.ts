// All timezone and day math lives here (design decision 8).

// Single user, single timezone for now.
export const TIME_ZONE = "America/Toronto";

// Today's date in TIME_ZONE as "YYYY-MM-DD".
// The "en-CA" locale happens to format dates as YYYY-MM-DD, which is
// exactly the format Postgres expects for a `date` column.
export function todayLocal(now: Date = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: TIME_ZONE });
}
