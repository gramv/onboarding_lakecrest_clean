/**
 * Manager Review Service
 * API client for manager review endpoints
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token')}`
});

// =====================================================
// DOCUMENT ACCESS (OTP)
// =====================================================

export const documentAccessService = {
  /**
   * Request OTP for document access
   */
  async requestOTP(employeeId: string) {
    const response = await fetch(`${API_BASE_URL}/api/manager/document-access/request-otp`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ employee_id: employeeId })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to request OTP');
    }

    return response.json();
  },

  /**
   * Verify OTP and get session token
   */
  async verifyOTP(employeeId: string, otpCode: string) {
    const response = await fetch(`${API_BASE_URL}/api/manager/document-access/verify-otp`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        employee_id: employeeId,
        otp_code: otpCode
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Invalid verification code');
    }

    return response.json();
  },

  /**
   * Validate session token
   */
  async validateSession(employeeId: string, sessionToken: string) {
    const response = await fetch(`${API_BASE_URL}/api/manager/document-access/validate-session`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        employee_id: employeeId,
        session_token: sessionToken
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to validate session');
    }

    return response.json();
  },

  /**
   * End session early
   */
  async endSession(employeeId: string, sessionToken: string) {
    const response = await fetch(`${API_BASE_URL}/api/manager/document-access/end-session`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        employee_id: employeeId,
        session_token: sessionToken
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to end session');
    }

    return response.json();
  },

  /**
   * Get active sessions
   */
  async getActiveSessions() {
    const response = await fetch(`${API_BASE_URL}/api/manager/document-access/active-sessions`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get active sessions');
    }

    return response.json();
  }
};

// =====================================================
// REVIEW DATA
// =====================================================

export const reviewDataService = {
  /**
   * Get employees pending review
   */
  async getPendingReviews() {
    const response = await fetch(`${API_BASE_URL}/api/manager/review/employees/pending`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get pending reviews');
    }

    return response.json();
  },

  /**
   * Get employee review data
   */
  async getEmployeeReviewData(employeeId: string) {
    const response = await fetch(`${API_BASE_URL}/api/manager/review/employees/${employeeId}`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get employee data');
    }

    return response.json();
  },

  /**
   * Get I-9 Section 2 data with auto-fill
   */
  async getI9Section2Data(employeeId: string) {
    const response = await fetch(
      `${API_BASE_URL}/api/manager/review/employees/${employeeId}/i9-section-2-data`,
      {
        headers: getAuthHeaders()
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get I-9 data');
    }

    return response.json();
  }
};

// =====================================================
// EMPLOYER PROFILE
// =====================================================

export const employerProfileService = {
  /**
   * Get employer profile
   */
  async getProfile() {
    const response = await fetch(`${API_BASE_URL}/api/manager/employer-profile`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get employer profile');
    }

    return response.json();
  },

  /**
   * Create employer profile
   */
  async createProfile(profileData: any) {
    const response = await fetch(`${API_BASE_URL}/api/manager/employer-profile`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(profileData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create employer profile');
    }

    return response.json();
  },

  /**
   * Update employer profile
   */
  async updateProfile(profileId: string, profileData: any) {
    const response = await fetch(`${API_BASE_URL}/api/manager/employer-profile/${profileId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(profileData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update employer profile');
    }

    return response.json();
  },

  /**
   * Get profile history
   */
  async getProfileHistory(profileId: string) {
    const response = await fetch(
      `${API_BASE_URL}/api/manager/employer-profile/${profileId}/history`,
      {
        headers: getAuthHeaders()
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get profile history');
    }

    return response.json();
  }
};

// =====================================================
// EDIT TRACKING
// =====================================================

export const editTrackingService = {
  /**
   * Track a field edit
   */
  async trackEdit(editData: {
    employee_id: string;
    form_type: string;
    field_name: string;
    field_label?: string;
    original_value?: string;
    edited_value: string;
    ocr_confidence?: number;
    document_quality?: string;
    edit_reason: string;
    edit_notes?: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/api/manager/edits/track`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(editData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to track edit');
    }

    return response.json();
  },

  /**
   * Get edits for an employee
   */
  async getEmployeeEdits(employeeId: string) {
    const response = await fetch(`${API_BASE_URL}/api/manager/edits/employee/${employeeId}`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get employee edits');
    }

    return response.json();
  },

  /**
   * Get edits for a specific form
   */
  async getFormEdits(formType: string, employeeId: string) {
    const response = await fetch(
      `${API_BASE_URL}/api/manager/edits/form/${formType}/${employeeId}`,
      {
        headers: getAuthHeaders()
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get form edits');
    }

    return response.json();
  },

  /**
   * Get OCR accuracy analytics
   */
  async getOCRAnalytics(formType?: string) {
    const url = formType
      ? `${API_BASE_URL}/api/manager/edits/analytics/ocr-accuracy?form_type=${formType}`
      : `${API_BASE_URL}/api/manager/edits/analytics/ocr-accuracy`;

    const response = await fetch(url, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get OCR analytics');
    }

    return response.json();
  },

  /**
   * Get improvement recommendations
   */
  async getRecommendations() {
    const response = await fetch(`${API_BASE_URL}/api/manager/edits/analytics/recommendations`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get recommendations');
    }

    return response.json();
  }
};

// Export all services
export default {
  documentAccess: documentAccessService,
  reviewData: reviewDataService,
  employerProfile: employerProfileService,
  editTracking: editTrackingService
};

