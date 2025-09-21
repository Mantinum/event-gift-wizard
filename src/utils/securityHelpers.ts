interface SecurityEvent {
  event: 'login_attempt' | 'login_success' | 'login_failure' | 'signup_attempt' | 'signup_success' | 'signup_failure';
  email?: string;
  timestamp: number;
  ip?: string;
  userAgent?: string;
}

class SecurityLogger {
  private static readonly MAX_EVENTS = 100;
  private static readonly STORAGE_KEY = 'security_events';

  static logEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
    try {
      const securityEvent: SecurityEvent = {
        ...event,
        timestamp: Date.now(),
        ip: 'client', // Client-side logging, IP not available
        userAgent: navigator.userAgent.substring(0, 100) // Truncate user agent
      };

      const events = this.getEvents();
      events.unshift(securityEvent);
      
      // Keep only the most recent events
      if (events.length > this.MAX_EVENTS) {
        events.splice(this.MAX_EVENTS);
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(events));
    } catch (error) {
      console.warn('Failed to log security event:', error);
    }
  }

  static getEvents(): SecurityEvent[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('Failed to retrieve security events:', error);
      return [];
    }
  }

  static getFailedLoginAttempts(email: string, timeWindowMs: number = 15 * 60 * 1000): number {
    const events = this.getEvents();
    const cutoff = Date.now() - timeWindowMs;
    
    return events.filter(event => 
      event.event === 'login_failure' && 
      event.email === email && 
      event.timestamp > cutoff
    ).length;
  }

  static clearEvents(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear security events:', error);
    }
  }
}

export { SecurityLogger, type SecurityEvent };

// Rate limiting helper
export class RateLimiter {
  private static readonly attempts = new Map<string, { count: number; resetTime: number }>();

  static isRateLimited(key: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): boolean {
    const now = Date.now();
    const attempt = this.attempts.get(key);

    if (!attempt || now > attempt.resetTime) {
      this.attempts.set(key, { count: 1, resetTime: now + windowMs });
      return false;
    }

    if (attempt.count >= maxAttempts) {
      return true;
    }

    attempt.count++;
    return false;
  }

  static getRemainingTime(key: string): number {
    const attempt = this.attempts.get(key);
    if (!attempt) return 0;
    
    const remaining = attempt.resetTime - Date.now();
    return Math.max(0, Math.ceil(remaining / 1000)); // Return seconds
  }

  static reset(key: string): void {
    this.attempts.delete(key);
  }
}
