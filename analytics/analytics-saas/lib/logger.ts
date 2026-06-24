/**
 * Minimal structured logger — the single sanctioned place in the codebase that
 * touches `console`. Everything else imports `logger` so we get levels, a
 * production JSON format (one object per line for log aggregators), and the
 * ability to silence debug noise via LOG_LEVEL without code changes.
 */
type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function resolveThreshold(): number {
  const fromEnv = process.env.LOG_LEVEL?.toLowerCase();
  if (fromEnv && fromEnv in LEVEL_WEIGHT) {
    return LEVEL_WEIGHT[fromEnv as LogLevel];
  }
  return process.env.NODE_ENV === "production" ? LEVEL_WEIGHT.info : LEVEL_WEIGHT.debug;
}

const threshold = resolveThreshold();
const isProd = process.env.NODE_ENV === "production";

function serializeMeta(meta: unknown[]): unknown[] {
  return meta.map((item) =>
    item instanceof Error ? { name: item.name, message: item.message, stack: item.stack } : item,
  );
}

function write(level: LogLevel, message: unknown, meta: unknown[]): void {
  if (LEVEL_WEIGHT[level] < threshold) return;

  // Errors/warnings go to stderr, everything else to stdout.
  const sink = level === "error" || level === "warn" ? console.error : console.log;

  if (isProd) {
    sink(
      JSON.stringify({
        level,
        time: new Date().toISOString(),
        msg: message,
        ...(meta.length > 0 ? { meta: serializeMeta(meta) } : {}),
      }),
    );
    return;
  }

  sink(`[${level}]`, message, ...meta);
}

export const logger = {
  debug: (message: unknown, ...meta: unknown[]) => write("debug", message, meta),
  info: (message: unknown, ...meta: unknown[]) => write("info", message, meta),
  warn: (message: unknown, ...meta: unknown[]) => write("warn", message, meta),
  error: (message: unknown, ...meta: unknown[]) => write("error", message, meta),
};
