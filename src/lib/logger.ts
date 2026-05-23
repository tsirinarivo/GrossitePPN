/**
 * Logger structuré avec niveaux.
 *
 * En prod : JSON line-delimited (compatible Loki, Vector, Datadog agent…)
 * En dev : sortie lisible avec couleurs basiques
 *
 * À remplacer par Pino / Winston / Sentry quand le besoin grandira,
 * mais reste suffisant pour un MVP en production surveillée.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function currentLevel(): LogLevel {
  const env = process.env.LOG_LEVEL?.toLowerCase() as LogLevel | undefined;
  if (env && env in LEVEL_PRIORITY) return env;
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[currentLevel()];
}

function format(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();

  if (process.env.NODE_ENV === "production") {
    // JSON structuré pour ingestion par agent de logs
    return JSON.stringify({
      ts: timestamp,
      level,
      msg: message,
      ...context,
    });
  }

  // Dev : format lisible
  const prefix = {
    debug: "🔍 [DEBUG]",
    info: "ℹ️  [INFO] ",
    warn: "⚠️  [WARN] ",
    error: "❌ [ERROR]",
  }[level];

  if (context) {
    return `${prefix} ${timestamp} ${message} ${JSON.stringify(context)}`;
  }
  return `${prefix} ${timestamp} ${message}`;
}

export const logger = {
  debug(message: string, context?: Record<string, unknown>) {
    if (shouldLog("debug")) console.log(format("debug", message, context));
  },
  info(message: string, context?: Record<string, unknown>) {
    if (shouldLog("info")) console.log(format("info", message, context));
  },
  warn(message: string, context?: Record<string, unknown>) {
    if (shouldLog("warn")) console.warn(format("warn", message, context));
  },
  error(message: string, error?: unknown, context?: Record<string, unknown>) {
    if (!shouldLog("error")) return;
    const errInfo = error instanceof Error
      ? { errorMessage: error.message, stack: error.stack }
      : error
        ? { error: String(error) }
        : {};
    console.error(format("error", message, { ...errInfo, ...context }));
  },
};
