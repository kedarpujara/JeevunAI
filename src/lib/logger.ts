/**
 * Simple logger that doesn't log PII
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private isDevelopment = __DEV__;

  private log(level: LogLevel, message: string, extra?: any) {
    if (!this.isDevelopment && level === 'debug') {
      return; // Don't log debug in production
    }

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    // Sanitize any potential PII from extra data
    const sanitized = this.sanitize(extra);

    switch (level) {
      case 'error':
        console.error(prefix, message, sanitized);
        break;
      case 'warn':
        console.warn(prefix, message, sanitized);
        break;
      case 'info':
        console.info(prefix, message, sanitized);
        break;
      default:
        console.log(prefix, message, sanitized);
    }
  }

  private sanitize(data: any): any {
    if (!data) return data;

    // Remove potential PII fields
    const piiFields = ['email', 'password', 'phone', 'name', 'address'];
    
    if (typeof data === 'object') {
      const cleaned = { ...data };
      piiFields.forEach(field => {
        if (field in cleaned) {
          cleaned[field] = '[REDACTED]';
        }
      });
      return cleaned;
    }

    return data;
  }

  debug(message: string, extra?: any) {
    this.log('debug', message, extra);
  }

  info(message: string, extra?: any) {
    this.log('info', message, extra);
  }

  warn(message: string, extra?: any) {
    this.log('warn', message, extra);
  }

  error(message: string, extra?: any) {
    this.log('error', message, extra);
  }
}

export const logger = new Logger();