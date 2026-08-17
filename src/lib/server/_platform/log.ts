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
 * Sanitize error messages for client exposure. Removes sensitive information
 * like database details, stack traces, or internal system names.
 */
export function sanitizeError(error: unknown, fallback = 'An unexpected error occurred'): string {
  if (error instanceof Error) {
    // Remove sensitive patterns from error messages
    let message = error.message;
    
    // Remove database connection details
    message = message.replace(/postgresql:\/\/[^:]+:[^@]+@[^\/]+\//g, '[database]');
    message = message.replace(/password\s*=\s*[^;\s]+/gi, 'password=[hidden]');
    
    // Remove file paths
    message = message.replace(/\/[^\/\s]+\/[^\/\s]+\.ts/g, '[file]');
    message = message.replace(/\/[^\/\s]+\/[^\/\s]+\.js/g, '[file]');
    
    // Remove stack traces (client shouldn't see these)
    message = message.split('\n')[0]; // Only first line
    
    // Remove any mention of internal system names
    message = message.replace(/Supabase/g, 'Database');
    message = message.replace(/PostgreSQL/g, 'Database');
    
    // If message is empty or too technical, use fallback
    if (!message || message.length > 200 || /error|failed|exception/i.test(message)) {
      return fallback;
    }
    
    return message;
  }
  
  return fallback;
}
