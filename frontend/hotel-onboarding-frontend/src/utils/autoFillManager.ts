/**
 * Auto-fill Manager Utility
 * 
 * Manages automatic form filling across the onboarding process
 * to ensure consistent data entry and reduce user input burden.
 */

interface AutoFillData {
  firstName?: string;
  lastName?: string;
  middleInitial?: string;
  fullName?: string;
  dateOfBirth?: string;
  ssn?: string;
  email?: string;
  phoneNumber?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  maritalStatus?: string;
  gender?: string;
  preferredName?: string;
  dependentCount?: number;
}

class AutoFillManager {
  private data: AutoFillData = {};

  /**
   * Update stored data for auto-filling
   */
  updateData(newData: Partial<AutoFillData>) {
    this.data = { ...this.data, ...newData };
    console.log('AutoFillManager: Updated data', this.data);
  }

  /**
   * Get current stored data
   */
  getData(): AutoFillData {
    return { ...this.data };
  }

  /**
   * Auto-fill a form with stored data
   */
  autoFillForm(existingFormData: any, formType: string): any {
    const autoFilled = { ...existingFormData };

    switch (formType) {
      case 'w4_form':
        return {
          ...autoFilled,
          first_name: autoFilled.first_name || this.data.firstName || '',
          middle_initial: autoFilled.middle_initial || this.data.middleInitial || '',
          last_name: autoFilled.last_name || this.data.lastName || '',
          address: autoFilled.address || this.data.streetAddress || '',
          city: autoFilled.city || this.data.city || '',
          state: autoFilled.state || this.data.state || '',
          zip_code: autoFilled.zip_code || this.data.zipCode || '',
          ssn: autoFilled.ssn || this.data.ssn || '',
        };

      case 'personal_info':
        return {
          ...autoFilled,
          firstName: autoFilled.firstName || this.data.firstName || '',
          lastName: autoFilled.lastName || this.data.lastName || '',
          middleInitial: autoFilled.middleInitial || this.data.middleInitial || '',
          email: autoFilled.email || this.data.email || '',
          phone: autoFilled.phone || this.data.phoneNumber || '',
          address: autoFilled.address || this.data.streetAddress || '',
          city: autoFilled.city || this.data.city || '',
          state: autoFilled.state || this.data.state || '',
          zipCode: autoFilled.zipCode || this.data.zipCode || '',
        };

      case 'i9_section1':
        return {
          ...autoFilled,
          employee_first_name: autoFilled.employee_first_name || this.data.firstName || '',
          employee_last_name: autoFilled.employee_last_name || this.data.lastName || '',
          employee_middle_initial: autoFilled.employee_middle_initial || this.data.middleInitial || '',
        };

      default:
        return autoFilled;
    }
  }

  /**
   * Clear all stored data
   */
  clearData() {
    this.data = {};
    console.log('AutoFillManager: Data cleared');
  }
}

// Create singleton instance
export const autoFillManager = new AutoFillManager();
export default autoFillManager;