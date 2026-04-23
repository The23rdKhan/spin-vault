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

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  // Error rate limiting to prevent quota burnout
  private errorCounts = new Map<string, { count: number; lastSeen: number }>();
  private readonly ERROR_THRESHOLD = 10; // Max 10 of same error per minute
  private readonly THROTTLE_WINDOW = 60000; // 1 minute

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
   * Includes rate limiting to prevent quota burnout from error loops.
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    console.error(message, error ?? '', context ?? '');

    // Send errors to Sentry in production with rate limiting
    if (!__DEV__) {
      // Rate limiting: prevent same error from flooding Sentry
      const errorKey = message + (error instanceof Error ? error.message : String(error));
      const now = Date.now();
      const existing = this.errorCounts.get(errorKey);

      if (existing) {
        if (now - existing.lastSeen < this.THROTTLE_WINDOW) {
          existing.count++;
          if (existing.count > this.ERROR_THRESHOLD) {
            // Throttled - don't send to Sentry, just log locally
            console.warn(
              `⚠️  Error throttled (${existing.count}/${this.ERROR_THRESHOLD}):`,
              message
            );
            return;
          }
        } else {
          // Reset counter after throttle window
          existing.count = 1;
          existing.lastSeen = now;
        }
      } else {
        this.errorCounts.set(errorKey, { count: 1, lastSeen: now });
      }

      // Filter out known noisy errors (send as breadcrumbs instead)
      const noisyPatterns = [
        /network request failed/i,
        /timeout/i,
        /cancelled/i,
        /aborted/i,
      ];

      const errorMessage = error instanceof Error ? error.message : String(error);
      const isNoisy = noisyPatterns.some((pattern) => pattern.test(errorMessage));

      if (isNoisy) {
        // Send as breadcrumb instead of full event (saves quota)
        Sentry.addBreadcrumb({
          message,
          level: 'error',
          data: { error: errorMessage, ...context },
        });
      } else {
        // Send full error event
        Sentry.captureException(error instanceof Error ? error : new Error(message), {
          extra: {
            message,
            ...context,
          },
        });
      }
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
   * Available in both dev and production for consistent debugging.
   */
  breadcrumb(message: string, category: string, data?: LogContext): void {
    if (__DEV__) {
      // In dev, log breadcrumbs to console for visibility
      console.log(`[BREADCRUMB] ${category}: ${message}`, data ?? '');
    } else {
      // In production, send to Sentry
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
