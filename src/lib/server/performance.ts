export type PerformanceMetric = { name: string; durationMs: number; route?: string; status?: 'ok' | 'error' };

export function measure<T>(name: string, fn: () => Promise<T>, route?: string): Promise<T> {
  const started = performance.now();
  return fn().then(
    (value) => { console.info(JSON.stringify({ type: 'performance', name, durationMs: Math.round(performance.now() - started), route, status: 'ok' satisfies PerformanceMetric['status'] })); return value; },
    (error) => { console.error(JSON.stringify({ type: 'performance', name, durationMs: Math.round(performance.now() - started), route, status: 'error' satisfies PerformanceMetric['status'] })); throw error; }
  );
}

export async function parallel<T extends Record<string, Promise<unknown>>>(tasks: T): Promise<{ [K in keyof T]: Awaited<T[K]> }> {
  const entries = Object.entries(tasks);
  const values = await Promise.all(entries.map(([, task]) => task));
  return Object.fromEntries(entries.map(([key], index) => [key, values[index]])) as { [K in keyof T]: Awaited<T[K]> };
}
