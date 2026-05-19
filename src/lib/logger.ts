/**
 * Lightweight logger with level filtering.
 * Debug/info are stripped in production builds via import.meta.env.DEV check.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getMinLevel(): LogLevel {
  return import.meta.env.DEV ? 'debug' : 'warn';
}

function formatPrefix(level: LogLevel, module: string): string {
  const time = new Date().toISOString().slice(11, 23);
  return `[${time}] [${level.toUpperCase()}] [${module}]`;
}

/**
 * Create a scoped logger for a module.
 * Usage: const log = createLogger('Agent'); log.info('starting');
 */
export function createLogger(module: string) {
  const minLevel = getMinLevel();

  function shouldLog(level: LogLevel): boolean {
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[minLevel];
  }

  return {
    debug(...args: unknown[]) {
      if (shouldLog('debug')) console.debug(formatPrefix('debug', module), ...args);
    },
    info(...args: unknown[]) {
      if (shouldLog('info')) console.info(formatPrefix('info', module), ...args);
    },
    warn(...args: unknown[]) {
      if (shouldLog('warn')) console.warn(formatPrefix('warn', module), ...args);
    },
    error(...args: unknown[]) {
      if (shouldLog('error')) console.error(formatPrefix('error', module), ...args);
    },
  };
}
