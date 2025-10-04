/**
 * Session Storage Service
 * Manages OTP session persistence across page refreshes
 */

interface OTPSession {
  token: string;
  employeeId: string;
  expiresAt: string;
  createdAt: string;
  lastActivity: string;
}

interface ReviewProgress {
  employeeId: string;
  formData: Record<string, any>;
  editedFields: string[];
  activeTab: string;
  lastSaved: string;
}

const SESSION_KEY_PREFIX = 'otp_session_';
const PROGRESS_KEY_PREFIX = 'review_progress_';
const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

export class SessionStorageService {
  /**
   * Save OTP session to localStorage
   */
  static saveSession(employeeId: string, token: string, expiresAt: string): void {
    const session: OTPSession = {
      token,
      employeeId,
      expiresAt,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };

    localStorage.setItem(
      `${SESSION_KEY_PREFIX}${employeeId}`,
      JSON.stringify(session)
    );

    console.log('✅ Session saved:', { employeeId, expiresAt });
  }

  /**
   * Get active session for employee
   */
  static getSession(employeeId: string): OTPSession | null {
    const sessionData = localStorage.getItem(`${SESSION_KEY_PREFIX}${employeeId}`);
    
    if (!sessionData) {
      return null;
    }

    try {
      const session: OTPSession = JSON.parse(sessionData);
      
      // Check if session is expired
      const now = new Date().getTime();
      const expires = new Date(session.expiresAt).getTime();
      
      if (now >= expires) {
        console.log('⚠️ Session expired, removing...');
        this.clearSession(employeeId);
        return null;
      }

      // Update last activity
      session.lastActivity = new Date().toISOString();
      localStorage.setItem(
        `${SESSION_KEY_PREFIX}${employeeId}`,
        JSON.stringify(session)
      );

      return session;
    } catch (error) {
      console.error('Error parsing session:', error);
      this.clearSession(employeeId);
      return null;
    }
  }

  /**
   * Check if session is valid
   */
  static isSessionValid(employeeId: string): boolean {
    const session = this.getSession(employeeId);
    return session !== null;
  }

  /**
   * Get time remaining in session (seconds)
   */
  static getTimeRemaining(employeeId: string): number {
    const session = this.getSession(employeeId);
    
    if (!session) {
      return 0;
    }

    const now = new Date().getTime();
    const expires = new Date(session.expiresAt).getTime();
    
    return Math.max(0, Math.floor((expires - now) / 1000));
  }

  /**
   * Clear session
   */
  static clearSession(employeeId: string): void {
    localStorage.removeItem(`${SESSION_KEY_PREFIX}${employeeId}`);
    console.log('🗑️ Session cleared for employee:', employeeId);
  }

  /**
   * Save review progress
   */
  static saveProgress(
    employeeId: string,
    formData: Record<string, any>,
    editedFields: string[],
    activeTab: string
  ): void {
    const progress: ReviewProgress = {
      employeeId,
      formData,
      editedFields,
      activeTab,
      lastSaved: new Date().toISOString()
    };

    localStorage.setItem(
      `${PROGRESS_KEY_PREFIX}${employeeId}`,
      JSON.stringify(progress)
    );

    console.log('💾 Progress saved:', { employeeId, fieldsEdited: editedFields.length });
  }

  /**
   * Get saved progress
   */
  static getProgress(employeeId: string): ReviewProgress | null {
    const progressData = localStorage.getItem(`${PROGRESS_KEY_PREFIX}${employeeId}`);
    
    if (!progressData) {
      return null;
    }

    try {
      const progress: ReviewProgress = JSON.parse(progressData);
      
      // Check if progress is from a valid session
      if (!this.isSessionValid(employeeId)) {
        console.log('⚠️ Progress found but session invalid, clearing...');
        this.clearProgress(employeeId);
        return null;
      }

      return progress;
    } catch (error) {
      console.error('Error parsing progress:', error);
      this.clearProgress(employeeId);
      return null;
    }
  }

  /**
   * Clear progress
   */
  static clearProgress(employeeId: string): void {
    localStorage.removeItem(`${PROGRESS_KEY_PREFIX}${employeeId}`);
    console.log('🗑️ Progress cleared for employee:', employeeId);
  }

  /**
   * Clear all sessions and progress (logout)
   */
  static clearAll(): void {
    const keys = Object.keys(localStorage);
    
    keys.forEach(key => {
      if (key.startsWith(SESSION_KEY_PREFIX) || key.startsWith(PROGRESS_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    });

    console.log('🗑️ All sessions and progress cleared');
  }

  /**
   * Get all active sessions
   */
  static getAllActiveSessions(): OTPSession[] {
    const keys = Object.keys(localStorage);
    const sessions: OTPSession[] = [];

    keys.forEach(key => {
      if (key.startsWith(SESSION_KEY_PREFIX)) {
        const employeeId = key.replace(SESSION_KEY_PREFIX, '');
        const session = this.getSession(employeeId);
        
        if (session) {
          sessions.push(session);
        }
      }
    });

    return sessions;
  }

  /**
   * Extend session (update expiry time)
   */
  static extendSession(employeeId: string, additionalMinutes: number = 30): boolean {
    const session = this.getSession(employeeId);
    
    if (!session) {
      return false;
    }

    const newExpiry = new Date(Date.now() + additionalMinutes * 60 * 1000);
    session.expiresAt = newExpiry.toISOString();
    session.lastActivity = new Date().toISOString();

    localStorage.setItem(
      `${SESSION_KEY_PREFIX}${employeeId}`,
      JSON.stringify(session)
    );

    console.log('⏰ Session extended:', { employeeId, newExpiry: session.expiresAt });
    return true;
  }

  /**
   * Auto-save progress (debounced)
   */
  private static autoSaveTimers: Map<string, NodeJS.Timeout> = new Map();

  static autoSaveProgress(
    employeeId: string,
    formData: Record<string, any>,
    editedFields: string[],
    activeTab: string,
    debounceMs: number = 2000
  ): void {
    // Clear existing timer
    const existingTimer = this.autoSaveTimers.get(employeeId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.saveProgress(employeeId, formData, editedFields, activeTab);
      this.autoSaveTimers.delete(employeeId);
    }, debounceMs);

    this.autoSaveTimers.set(employeeId, timer);
  }
}

export default SessionStorageService;

