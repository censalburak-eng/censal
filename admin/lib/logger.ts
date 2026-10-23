export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface ScopedLogger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export const logger = {
  scope(scopeName: string): ScopedLogger {
    const isDev = process.env.NODE_ENV !== 'production';
    return {
      debug: (...args: unknown[]) => {
        if (isDev) console.debug(`[${scopeName}]`, ...args);
      },
      info: (...args: unknown[]) => {
        console.info(`[${scopeName}]`, ...args);
      },
      warn: (...args: unknown[]) => {
        console.warn(`[${scopeName}]`, ...args);
      },
      error: (...args: unknown[]) => {
        console.error(`[${scopeName}]`, ...args);
      },
    };
  },
};
