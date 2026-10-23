import { logger } from './logger';

const log = logger.scope('perf');

export const measure = async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    log.debug(`${label}: ${(performance.now() - start).toFixed(0)} ms`);
  }
};
