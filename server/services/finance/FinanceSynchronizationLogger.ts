/**
 * @module FinanceSynchronizationLogger
 * @description Provides a centralized logging mechanism for the Finance Synchronization Engine.
 */

export class FinanceSynchronizationLogger {
  private prefix: string = "[FinanceSyncEngine]";

  constructor(prefix?: string) {
    if (prefix) {
      this.prefix = prefix;
    }
  }

  public log(message: string, ...args: any[]): void {
    console.log(`${this.prefix} ${new Date().toISOString()} [INFO] ${message}`, ...args);
  }

  public warn(message: string, ...args: any[]): void {
    console.warn(`${this.prefix} ${new Date().toISOString()} [WARN] ${message}`, ...args);
  }

  public error(message: string, ...args: any[]): void {
    console.error(`${this.prefix} ${new Date().toISOString()} [ERROR] ${message}`, ...args);
  }

  public debug(message: string, ...args: any[]): void {
    // Only log debug messages in development environment
    if (process.env.NODE_ENV === "development") {
      console.debug(`${this.prefix} ${new Date().toISOString()} [DEBUG] ${message}`, ...args);
    }
  }
}
