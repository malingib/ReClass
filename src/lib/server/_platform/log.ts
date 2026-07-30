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
