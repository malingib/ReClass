export function logError(context: string, error: unknown, extra?: Record<string, unknown>) {
  console.error(JSON.stringify({
    level: 'error',
    context,
    message: error instanceof Error ? error.message : String(error),
    ...(error instanceof Error && { stack: error.stack }),
    ...extra,
    timestamp: new Date().toISOString(),
  }));
}

/**
 * Map of Postgres error codes to safe, user-facing messages.
 * Never expose raw constraint/table names.
 */
const PG_CODE_MESSAGES: Record<string, string> = {
  '23505': 'This record already exists.',
  '23503': 'A related record was not found.',
  '23502': 'A required field is missing.',
  '23514': 'The provided value is not allowed.',
  '22001': 'A value is too long.',
  '22P02': 'An invalid value was provided.',
};

/**
 * Sanitize error messages for client exposure. Never leak SQL, table/constraint
 * names, connection strings, or stack traces. Prefer PG_CODE_MESSAGES for
 * known Postgres codes, otherwise fall back to the caller-supplied safe message.
 */
export function sanitizeError(error: unknown, fallback = 'An unexpected error occurred'): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code: unknown }).code);
    if (PG_CODE_MESSAGES[code]) return PG_CODE_MESSAGES[code];
  }
  if (error instanceof Error) {
    let message = error.message.split('\n')[0].trim();

    // If the message looks like a Postgres/DB leak, always return fallback.
    const dbLeak =
      /relation \".*\" does not exist/i.test(message) ||
      /constraint \".*\"/.test(message) ||
      /column \".*\"/.test(message) ||
      /table \".*\"/.test(message) ||
      /pg_\w+/.test(message) ||
      /SQLSTATE/i.test(message) ||
      /supabase/i.test(message);
    if (dbLeak) return fallback;

    // Strip sensitive patterns before length check
    message = message
      .replace(/postgresql:\/\/[^:]+:[^@]+@[^\/]+\//g, '[database]')
      .replace(/password\s*=\s*[^;\s]+/gi, 'password=[hidden]')
      .replace(/\/[^\/\s]+\/[^\/\s]+\.ts/g, '[file]')
      .replace(/\/[^\/\s]+\/[^\/\s]+\.js/g, '[file]')
      .replace(/Supabase/g, 'Database')
      .replace(/PostgreSQL/g, 'Database')
      .trim();

    if (!message || message.length > 180) return fallback;
    // Allow short validation messages through, but block generic error dumps
    if (/^duplicate key value/i.test(message)) return PG_CODE_MESSAGES['23505'];
    if (/^violates foreign key constraint/i.test(message)) return PG_CODE_MESSAGES['23503'];
    return message;
  }
  return fallback;
}
