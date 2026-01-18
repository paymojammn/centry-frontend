/**
 * Logger utility for Centry Frontend
 * Provides structured logging that only outputs in development mode
 */

const isDevelopment = process.env.NODE_ENV === 'development';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  prefix?: string;
  enabled?: boolean;
}

class Logger {
  private prefix: string;
  private enabled: boolean;

  constructor(options: LoggerOptions = {}) {
    this.prefix = options.prefix || '';
    this.enabled = options.enabled ?? isDevelopment;
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    const prefixStr = this.prefix ? `[${this.prefix}]` : '';
    return `${timestamp} ${prefixStr}[${level.toUpperCase()}] ${message}`;
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.enabled) {
      console.debug(this.formatMessage('debug', message), ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.enabled) {
      console.info(this.formatMessage('info', message), ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.enabled) {
      console.warn(this.formatMessage('warn', message), ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    // Errors are always logged
    console.error(this.formatMessage('error', message), ...args);
  }

  /**
   * Create a child logger with a specific prefix
   */
  child(prefix: string): Logger {
    const childPrefix = this.prefix ? `${this.prefix}:${prefix}` : prefix;
    return new Logger({ prefix: childPrefix, enabled: this.enabled });
  }
}

// Default logger instance
export const logger = new Logger();

// Pre-configured loggers for different modules
export const apiLogger = new Logger({ prefix: 'API' });
export const bankingLogger = new Logger({ prefix: 'Banking' });
export const billsLogger = new Logger({ prefix: 'Bills' });
export const paymentsLogger = new Logger({ prefix: 'Payments' });
export const expensesLogger = new Logger({ prefix: 'Expenses' });

export default logger;
