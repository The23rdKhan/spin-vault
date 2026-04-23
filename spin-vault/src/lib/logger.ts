/**
 * Logger — Production-Safe Logging
 *
 * Provides log levels and strips debug/info logs in production builds.
 * Integrates with Sentry for error tracking.
 *
 * Usage:
 *   logger.debug('🚀 [BOOT] App startup begins');
 *   logger.info('✅ [AUTH] Session initialized');
 *   logger.warn('⚠️  [AUTH] Wallet fetch failed');
 *   logger.error('❌ [AUTH] Fatal error', error);
 */

import * as Sentry from '@sentry/react-native';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  /**
   * Debug logs — stripped in production.
   * Use for verbose boot sequences, state changes, etc.
   */
  debug(message: string, context?: LogContext): void {
    if (__DEV__) {
      console.log(message, context ?? '');
    }
  }

  /**
   * Info logs — stripped in production.
   * Use for successful operations, milestones.
   */
  info(message: string, context?: LogContext): void {
    if (__DEV__) {
      console.info(message, context ?? '');
    }
  }

  /**
   * Warning logs — always logged.
   * Use for recoverable errors, degraded functionality.
   */
  warn(message: string, context?: LogContext): void {
    console.warn(message, context ?? '');

    // Send warnings to Sentry as breadcrumbs (not full events)
    if (!__DEV__) {
      Sentry.addBreadcrumb({
        message,
        level: 'warning',
        data: context,
      });
    }
  }

  /**
   * Error logs — always logged + sent to Sentry.
   * Use for exceptions, critical failures.
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    console.error(message, error ?? '', context ?? '');

    // Send errors to Sentry in production
    if (!__DEV__) {
      Sentry.captureException(error instanceof Error ? error : new Error(message), {
        extra: {
          message,
          ...context,
        },
      });
    }
  }

  /**
   * Set user context for Sentry.
   * Call after authentication to track user-specific errors.
   */
  setUser(userId: string, isAnonymous: boolean, email?: string): void {
    if (!__DEV__) {
      Sentry.setUser({
        id: userId,
        email: email ?? undefined,
        anonymous: isAnonymous,
      });
    }
  }

  /**
   * Clear user context (e.g., on sign out).
   */
  clearUser(): void {
    if (!__DEV__) {
      Sentry.setUser(null);
    }
  }

  /**
   * Add custom breadcrumb for debugging error context.
   */
  breadcrumb(message: string, category: string, data?: LogContext): void {
    if (!__DEV__) {
      Sentry.addBreadcrumb({
        message,
        category,
        level: 'info',
        data,
      });
    }
  }
}

export const logger = new Logger();
export default logger;
