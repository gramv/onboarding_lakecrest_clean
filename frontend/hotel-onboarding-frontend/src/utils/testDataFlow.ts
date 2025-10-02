// Test utility for validating complete data flow from step 1 to step 18
// This ensures seamless data persistence and auto-fill functionality

import { AutoFillManager, OnboardingDataPersistence, extractAutoFillData } from './autoFill';
import { FormValidator, getValidationRules, CrossFormValidator } from './formValidation';

interface TestResult {
  stepId: string;
  stepName: string;
  passed: boolean;
  autoFillFields: string[];
  validationErrors: string[];
  warnings: string[];
  dataExtracted: boolean;
}

interface DataFlowTestResult {
  overallSuccess: boolean;
  completionPercentage: number;
  autoFillCoverage: number;
  stepResults: TestResult[];
  summary: {
    totalSteps: number;
    passedSteps: number;
    failedSteps: number;
    autoFillFields: number;
    validationErrors: number;
    warnings: number;
  };
}

export class DataFlowTester {
  private autoFillManager = AutoFillManager.getInstance();
  private dataPersistence = OnboardingDataPersistence.getInstance();
  private formValidator = FormValidator.getInstance();

  // Test data for each form step
  private getTestData() {
    return {
      personal_info: {
        firstName: 'John',
        lastName: 'Doe',
        middleInitial: 'M',
        preferredName: 'Johnny',
        dateOfBirth: '1990-01-15',
        ssn: '123-45-6789',
        phone: '(555) 123-4567',
        email: 'john.doe@example.com',
        address: '123 Main Street',
        aptNumber: 'Apt 2B',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345',
        gender: 'male',
        maritalStatus: 'single'
      },
      job_details: {
        jobTitle: 'Front Desk Agent',
        department: 'Front Desk',
        hireDate: '2025-02-01',
        startDate: '2025-02-01',
        employeeNumber: 'EMP001'
      },
      i9_section1: {
        employee_first_name: 'John',
        employee_last_name: 'Doe',
        employee_middle_initial: 'M',
        date_of_birth: '1990-01-15',
        ssn: '123-45-6789',
        email: 'john.doe@example.com',
        phone: '(555) 123-4567',
        address_street: '123 Main Street',
        address_apt: 'Apt 2B',
        address_city: 'Anytown',
        address_state: 'CA',
        address_zip: '12345',
        citizenship_status: 'us_citizen'
      },
      w4_form: {
        first_name: 'John',
        last_name: 'Doe',
        middle_initial: 'M',
        address: '123 Main Street',
        city: 'Anytown',
        state: 'CA',
        zip_code: '12345',
        ssn: '123-45-6789',
        filing_status: 'Single',
        dependents_amount: 0,
        signature: 'John M Doe',
        signature_date: '2025-01-25'
      },
      direct_deposit: {
        depositType: 'full',
        primaryAccount: {
          bankName: 'Wells Fargo',
          routingNumber: '121000248',
          accountNumber: '1234567890',
          accountType: 'checking',
          depositAmount: 0,
          percentage: 100
        },
        authorizeDeposit: true,
        dateOfAuth: '2025-01-25'
      },
      emergency_contacts: {
        primaryContact: {
          name: 'Jane Doe',
          relationship: 'spouse',
          phoneNumber: '(555) 987-6543',
          alternatePhone: '',
          address: '123 Main Street',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345'
        },
        secondaryContact: {
          name: 'Bob Smith',
          relationship: 'friend',
          phoneNumber: '(555) 555-5555',
          alternatePhone: '',
          address: '',
          city: '',
          state: '',
          zipCode: ''
        },
        allergies: 'None',
        medications: 'None',
        medicalConditions: 'None'
      },
      health_insurance: {
        employeeFirstName: 'John',
        employeeLastName: 'Doe',
        employeeDateOfBirth: '1990-01-15',
        employeeSSN: '123-45-6789',
        medical_plan: 'hra_6k',
        medical_tier: 'employee',
        medical_cost: 150.00,
        dental_coverage: false,
        vision_coverage: false,
        total_biweekly_cost: 150.00
      }
    };
  }

  // Run complete data flow test
  async runCompleteTest(token: string = 'test-token'): Promise<DataFlowTestResult> {
    console.log('🚀 Starting complete data flow test...');
    
    // Clear existing data
    this.autoFillManager.clear(true);
    this.dataPersistence.clearAllData(token, true);

    const testData = this.getTestData();
    const stepResults: TestResult[] = [];
    const allSteps = [
      { id: 'personal_info', name: 'Personal Information' },
      { id: 'job_details', name: 'Job Details' },
      { id: 'i9_section1', name: 'I-9 Section 1' },
      { id: 'w4_form', name: 'W-4 Form' },
      { id: 'direct_deposit', name: 'Direct Deposit' },
      { id: 'emergency_contacts', name: 'Emergency Contacts' },
      { id: 'health_insurance', name: 'Health Insurance' }
    ];

    for (const step of allSteps) {
      const result = await this.testStep(step.id, step.name, testData[step.id], token);
      stepResults.push(result);
    }

    // Test cross-form validation
    const crossFormValidation = CrossFormValidator.validateDataConsistency(testData);
    
    // Calculate summary
    const passedSteps = stepResults.filter(r => r.passed).length;
    const failedSteps = stepResults.length - passedSteps;
    const totalAutoFillFields = stepResults.reduce((sum, r) => sum + r.autoFillFields.length, 0);
    const totalValidationErrors = stepResults.reduce((sum, r) => sum + r.validationErrors.length, 0);
    const totalWarnings = stepResults.reduce((sum, r) => sum + r.warnings.length, 0) + Object.keys(crossFormValidation.warnings).length;

    const result: DataFlowTestResult = {
      overallSuccess: failedSteps === 0 && crossFormValidation.isValid,
      completionPercentage: Math.round((passedSteps / stepResults.length) * 100),
      autoFillCoverage: this.autoFillManager.getCompletionPercentage(),
      stepResults,
      summary: {
        totalSteps: stepResults.length,
        passedSteps,
        failedSteps,
        autoFillFields: totalAutoFillFields,
        validationErrors: totalValidationErrors,
        warnings: totalWarnings
      }
    };

    console.log('✅ Data flow test completed');
    this.printTestReport(result);
    
    return result;
  }

  // Test individual step
  private async testStep(stepId: string, stepName: string, formData: any, token: string): Promise<TestResult> {
    console.log(`🔍 Testing step: ${stepName}`);

    const result: TestResult = {
      stepId,
      stepName,
      passed: false,
      autoFillFields: [],
      validationErrors: [],
      warnings: [],
      dataExtracted: false
    };

    try {
      // 1. Test auto-fill application
      const autoFilledData = this.autoFillManager.autoFillForm({}, stepId);
      result.autoFillFields = Object.keys(autoFilledData).filter(key => autoFilledData[key] !== undefined && autoFilledData[key] !== '');

      // 2. Test form validation
      const validationRules = getValidationRules(stepId);
      if (validationRules.length > 0) {
        const validation = this.formValidator.validateForm(formData, validationRules);
        result.validationErrors = Object.values(validation.errors);
        result.warnings = Object.values(validation.warnings);
      }

      // 3. Test data extraction
      try {
        const extractedData = extractAutoFillData(formData, stepId);
        result.dataExtracted = Object.keys(extractedData).length > 0;
      } catch (error) {
        result.warnings.push(`Data extraction failed: ${error.message}`);
      }

      // 4. Test data persistence
      const saved = this.dataPersistence.saveFormData(stepId, formData, token);
      if (!saved) {
        result.validationErrors.push('Failed to save form data');
      }

      // 5. Test data retrieval
      const retrieved = this.dataPersistence.getFormData(stepId, token);
      if (JSON.stringify(retrieved) !== JSON.stringify(formData)) {
        result.validationErrors.push('Retrieved data does not match saved data');
      }

      // Determine if step passed
      result.passed = result.validationErrors.length === 0;

    } catch (error) {
      result.validationErrors.push(`Unexpected error: ${error.message}`);
      result.passed = false;
    }

    return result;
  }

  // Test navigation scenarios
  async testNavigationScenarios(token: string = 'test-token'): Promise<boolean> {
    console.log('🔄 Testing navigation scenarios...');
    
    try {
      // Test forward navigation
      for (let i = 0; i < 5; i++) {
        const sessionState = {
          currentStepIndex: i,
          language_preference: 'en',
          token
        };
        this.dataPersistence.saveSessionState(sessionState, token);
        
        const retrieved = this.dataPersistence.getSessionState(token);
        if (retrieved.currentStepIndex !== i) {
          console.error(`❌ Forward navigation test failed at step ${i}`);
          return false;
        }
      }

      // Test backward navigation
      for (let i = 4; i >= 0; i--) {
        const sessionState = {
          currentStepIndex: i,
          language_preference: 'en',
          token
        };
        this.dataPersistence.saveSessionState(sessionState, token);
        
        const retrieved = this.dataPersistence.getSessionState(token);
        if (retrieved.currentStepIndex !== i) {
          console.error(`❌ Backward navigation test failed at step ${i}`);
          return false;
        }
      }

      console.log('✅ Navigation scenarios passed');
      return true;
    } catch (error) {
      console.error('❌ Navigation test failed:', error);
      return false;
    }
  }

  // Test data recovery scenarios
  async testDataRecovery(): Promise<boolean> {
    console.log('🔧 Testing data recovery scenarios...');
    
    try {
      // Test backup and recovery
      const testData = { firstName: 'John', lastName: 'Doe' };
      this.autoFillManager.updateData(testData);
      
      // Simulate data corruption
      localStorage.setItem('onboarding_autofill_v2', 'invalid json');
      
      // Should recover from backup
      const recovered = this.autoFillManager.getData();
      if (recovered.firstName !== 'John') {
        console.error('❌ Data recovery failed');
        return false;
      }

      console.log('✅ Data recovery test passed');
      return true;
    } catch (error) {
      console.error('❌ Data recovery test failed:', error);
      return false;
    }
  }

  // Print detailed test report
  private printTestReport(result: DataFlowTestResult) {
    console.log('\n📊 DATA FLOW TEST REPORT');
    console.log('=' .repeat(50));
    console.log(`Overall Success: ${result.overallSuccess ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Completion: ${result.completionPercentage}%`);
    console.log(`Auto-fill Coverage: ${result.autoFillCoverage}%`);
    console.log(`Total Steps: ${result.summary.totalSteps}`);
    console.log(`Passed: ${result.summary.passedSteps}`);
    console.log(`Failed: ${result.summary.failedSteps}`);
    console.log(`Total Auto-fill Fields: ${result.summary.autoFillFields}`);
    console.log(`Validation Errors: ${result.summary.validationErrors}`);
    console.log(`Warnings: ${result.summary.warnings}`);
    
    console.log('\n📋 STEP DETAILS:');
    result.stepResults.forEach(step => {
      const status = step.passed ? '✅' : '❌';
      console.log(`${status} ${step.stepName}`);
      if (step.autoFillFields.length > 0) {
        console.log(`   Auto-fill: ${step.autoFillFields.length} fields`);
      }
      if (step.validationErrors.length > 0) {
        console.log(`   Errors: ${step.validationErrors.join(', ')}`);
      }
      if (step.warnings.length > 0) {
        console.log(`   Warnings: ${step.warnings.join(', ')}`);
      }
    });
    console.log('=' .repeat(50));
  }

  // Export test data for debugging
  exportTestData(token: string = 'test-token'): string {
    return this.dataPersistence.exportAllData(token);
  }
}

// Create and export test instance
export const dataFlowTester = new DataFlowTester();

// Quick test function for console usage
export const runQuickTest = async () => {
  const result = await dataFlowTester.runCompleteTest();
  return result.overallSuccess;
};