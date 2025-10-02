#!/usr/bin/env node

/**
 * API-based Navigation Test Suite
 * Tests navigation standardization without requiring Puppeteer
 */

const http = require('http');

const CONFIG = {
  frontendUrl: 'http://localhost:3001',
  backendUrl: 'http://localhost:8000'
};

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

// Helper to make HTTP requests
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

// Test backend connectivity
async function testBackendConnectivity() {
  console.log('\n🔌 Testing Backend Connectivity...');

  try {
    const response = await makeRequest(`${CONFIG.backendUrl}/health`);

    if (response.status === 200 || response.status === 404) {
      console.log(`${colors.green}✓${colors.reset} Backend is running on ${CONFIG.backendUrl}`);
      testResults.passed++;
      return true;
    } else {
      console.log(`${colors.red}✗${colors.reset} Backend returned status ${response.status}`);
      testResults.failed++;
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} Backend is not accessible: ${error.message}`);
    console.log(`${colors.yellow}  Make sure backend is running: cd backend && uvicorn app.main_enhanced:app --reload --port 8000${colors.reset}`);
    testResults.failed++;
    return false;
  }
}

// Test frontend connectivity
async function testFrontendConnectivity() {
  console.log('\n🌐 Testing Frontend Connectivity...');

  try {
    const response = await makeRequest(CONFIG.frontendUrl);

    if (response.status === 200) {
      console.log(`${colors.green}✓${colors.reset} Frontend is running on ${CONFIG.frontendUrl}`);

      // Check if it's the React app
      if (response.data.includes('root') && (response.data.includes('React') || response.data.includes('Vite'))) {
        console.log(`${colors.green}✓${colors.reset} React application detected`);
        testResults.passed++;
      } else {
        console.log(`${colors.yellow}!${colors.reset} Frontend is running but might not be the React app`);
        testResults.warnings++;
      }
      return true;
    } else {
      console.log(`${colors.red}✗${colors.reset} Frontend returned status ${response.status}`);
      testResults.failed++;
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} Frontend is not accessible: ${error.message}`);
    console.log(`${colors.yellow}  Make sure frontend is running: cd frontend/hotel-onboarding-frontend && npm run dev${colors.reset}`);
    testResults.failed++;
    return false;
  }
}

// Check navigation components exist
async function checkNavigationComponents() {
  console.log('\n📂 Checking Navigation Components...');

  const fs = require('fs');
  const path = require('path');

  const componentsToCheck = [
    {
      path: 'frontend/hotel-onboarding-frontend/src/components/navigation/NavigationButtons.tsx',
      name: 'NavigationButtons',
      required: true
    },
    {
      path: 'frontend/hotel-onboarding-frontend/src/components/navigation/ProgressBar.tsx',
      name: 'ProgressBar',
      required: false
    },
    {
      path: 'frontend/hotel-onboarding-frontend/src/components/navigation/StepIndicator.tsx',
      name: 'StepIndicator',
      required: false
    }
  ];

  let allRequiredExist = true;

  for (const component of componentsToCheck) {
    const fullPath = path.join(process.cwd(), component.path);

    try {
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');

        // Check for key features
        const hasTranslations = content.includes('language') && content.includes('es:');
        const hasMobileSupport = content.includes('sticky') || content.includes('sm:');
        const hasProgressIndicator = content.includes('currentStep') && content.includes('totalSteps');

        console.log(`${colors.green}✓${colors.reset} ${component.name} exists`);

        if (hasTranslations) {
          console.log(`  ${colors.cyan}•${colors.reset} Has translation support`);
        }
        if (hasMobileSupport) {
          console.log(`  ${colors.cyan}•${colors.reset} Has mobile responsive support`);
        }
        if (hasProgressIndicator) {
          console.log(`  ${colors.cyan}•${colors.reset} Has progress indicator`);
        }

        testResults.passed++;
      } else {
        if (component.required) {
          console.log(`${colors.red}✗${colors.reset} ${component.name} not found`);
          allRequiredExist = false;
          testResults.failed++;
        } else {
          console.log(`${colors.yellow}!${colors.reset} ${component.name} not found (optional)`);
          testResults.warnings++;
        }
      }
    } catch (error) {
      console.log(`${colors.red}✗${colors.reset} Error checking ${component.name}: ${error.message}`);
      if (component.required) {
        allRequiredExist = false;
        testResults.failed++;
      }
    }
  }

  return allRequiredExist;
}

// Check onboarding steps use NavigationButtons
async function checkStepImplementation() {
  console.log('\n🔍 Checking Step Implementation...');

  const fs = require('fs');
  const path = require('path');

  const stepsToCheck = [
    'WelcomeStep',
    'PersonalInfoStep',
    'JobDetailsStep',
    'W4FormStep',
    'CompanyPoliciesStep',
    'DirectDepositStep'
  ];

  const stepsDir = path.join(process.cwd(), 'frontend/hotel-onboarding-frontend/src/pages/onboarding');

  let implementationCount = 0;
  let totalSteps = 0;

  for (const stepName of stepsToCheck) {
    const stepPath = path.join(stepsDir, `${stepName}.tsx`);

    try {
      if (fs.existsSync(stepPath)) {
        totalSteps++;
        const content = fs.readFileSync(stepPath, 'utf8');

        // Check if step imports and uses NavigationButtons
        const importsNavButtons = content.includes('NavigationButtons') ||
                                 content.includes('navigation/NavigationButtons');
        const usesNavButtons = content.includes('<NavigationButtons');

        if (importsNavButtons && usesNavButtons) {
          console.log(`${colors.green}✓${colors.reset} ${stepName} uses NavigationButtons`);

          // Check for specific props
          const hasSticky = content.includes('sticky={true}') || content.includes('sticky:');
          const hasProgress = content.includes('currentStep=') && content.includes('totalSteps=');
          const hasLanguage = content.includes('language={language}') || content.includes('language=');

          if (hasSticky) {
            console.log(`  ${colors.cyan}•${colors.reset} Has sticky navigation`);
          }
          if (hasProgress) {
            console.log(`  ${colors.cyan}•${colors.reset} Passes progress props`);
          }
          if (hasLanguage) {
            console.log(`  ${colors.cyan}•${colors.reset} Supports translations`);
          }

          implementationCount++;
          testResults.passed++;
        } else {
          console.log(`${colors.yellow}!${colors.reset} ${stepName} exists but doesn't use NavigationButtons`);
          testResults.warnings++;
        }
      } else {
        console.log(`${colors.yellow}-${colors.reset} ${stepName} not found`);
      }
    } catch (error) {
      console.log(`${colors.red}✗${colors.reset} Error checking ${stepName}: ${error.message}`);
      testResults.failed++;
    }
  }

  console.log(`\n📊 ${implementationCount}/${totalSteps} steps use NavigationButtons`);

  return implementationCount === totalSteps;
}

// Check translation files
async function checkTranslations() {
  console.log('\n🌐 Checking Translation Files...');

  const fs = require('fs');
  const path = require('path');

  const translationFiles = [
    {
      path: 'frontend/hotel-onboarding-frontend/src/i18n/locales/en.json',
      lang: 'English'
    },
    {
      path: 'frontend/hotel-onboarding-frontend/src/i18n/locales/es.json',
      lang: 'Spanish'
    }
  ];

  const requiredKeys = [
    'navigation.continue',
    'navigation.previous',
    'navigation.next',
    'navigation.submit',
    'navigation.back'
  ];

  for (const file of translationFiles) {
    const fullPath = path.join(process.cwd(), file.path);

    try {
      if (fs.existsSync(fullPath)) {
        const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        console.log(`${colors.green}✓${colors.reset} ${file.lang} translation file exists`);

        // Check for navigation keys
        let hasAllKeys = true;
        for (const key of requiredKeys) {
          const keys = key.split('.');
          let obj = content;
          for (const k of keys) {
            if (obj && obj[k]) {
              obj = obj[k];
            } else {
              console.log(`  ${colors.yellow}!${colors.reset} Missing key: ${key}`);
              hasAllKeys = false;
              break;
            }
          }
        }

        if (hasAllKeys) {
          console.log(`  ${colors.cyan}•${colors.reset} All navigation keys present`);
          testResults.passed++;
        } else {
          testResults.warnings++;
        }

      } else {
        console.log(`${colors.red}✗${colors.reset} ${file.lang} translation file not found`);
        testResults.failed++;
      }
    } catch (error) {
      console.log(`${colors.red}✗${colors.reset} Error checking ${file.lang}: ${error.message}`);
      testResults.failed++;
    }
  }
}

// Main test runner
async function runTests() {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║     Navigation Standardization Test Suite              ║
║     API & File-based Testing                          ║
╚═══════════════════════════════════════════════════════╝
`);

  // Run connectivity tests
  const backendOk = await testBackendConnectivity();
  const frontendOk = await testFrontendConnectivity();

  if (!backendOk || !frontendOk) {
    console.log(`\n${colors.yellow}⚠️  Warning: Services not fully available${colors.reset}`);
    console.log('Some tests will be skipped. Please ensure both frontend and backend are running.');
  }

  // Run component checks
  await checkNavigationComponents();
  await checkStepImplementation();
  await checkTranslations();

  // Display summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));

  console.log(`${colors.green}Passed:${colors.reset} ${testResults.passed}`);
  console.log(`${colors.red}Failed:${colors.reset} ${testResults.failed}`);
  console.log(`${colors.yellow}Warnings:${colors.reset} ${testResults.warnings}`);

  const totalTests = testResults.passed + testResults.failed + testResults.warnings;
  const passRate = totalTests > 0 ? Math.round((testResults.passed / totalTests) * 100) : 0;

  console.log(`\nPass Rate: ${passRate}%`);

  if (testResults.failed === 0) {
    console.log(`\n${colors.green}✅ All critical tests passed!${colors.reset}`);
  } else {
    console.log(`\n${colors.red}❌ Some tests failed. Please review the issues above.${colors.reset}`);
  }

  // Save results
  const resultsPath = './test-results-navigation-api.json';
  fs.writeFileSync(resultsPath, JSON.stringify(testResults, null, 2));
  console.log(`\n📁 Results saved to: ${resultsPath}`);

  // Additional manual test instructions
  if (frontendOk && backendOk) {
    console.log(`
${colors.cyan}📋 Manual Testing Required:${colors.reset}

Please manually verify the following in your browser:

1. Navigate to ${CONFIG.frontendUrl}
2. Login with employee credentials
3. Go through the onboarding flow and check:
   - Previous button is hidden on first step
   - Next button disabled until requirements met
   - Mobile view shows progress indicator
   - Language switch changes button labels
   - Can jump to completed steps via progress bar

See ${colors.blue}navigation-manual-test-checklist.md${colors.reset} for detailed manual test steps.
`);
  }

  return testResults.failed > 0 ? 1 : 0;
}

// Run tests
const fs = require('fs');
runTests().then(exitCode => {
  process.exit(exitCode);
}).catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});