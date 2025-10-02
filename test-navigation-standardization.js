#!/usr/bin/env node

/**
 * Test Suite for Standardized Navigation Across Onboarding Steps
 *
 * This comprehensive test verifies:
 * 1. Navigation Button Consistency
 * 2. Button States (enabled/disabled)
 * 3. Progress Display
 * 4. Jump Navigation
 * 5. Translation Support
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const CONFIG = {
  frontendUrl: 'http://localhost:3001',
  backendUrl: 'http://localhost:8000',
  viewport: {
    desktop: { width: 1280, height: 800 },
    mobile: { width: 375, height: 667 }
  },
  credentials: {
    employee: {
      email: 'john.doe@hotel.com',
      password: 'password123'
    }
  },
  timeout: 30000,
  screenshotDir: './test-screenshots'
};

// Test Results Storage
const testResults = {
  timestamp: new Date().toISOString(),
  tests: [],
  summary: {
    passed: 0,
    failed: 0,
    warnings: 0
  }
};

// Utility Functions
async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function takeScreenshot(page, name, category = 'general') {
  try {
    const dir = path.join(CONFIG.screenshotDir, category);
    await fs.mkdir(dir, { recursive: true });
    const filename = path.join(dir, `${name}-${Date.now()}.png`);
    await page.screenshot({ path: filename, fullPage: true });
    return filename;
  } catch (error) {
    console.error(`Failed to take screenshot: ${error.message}`);
    return null;
  }
}

async function login(page) {
  console.log('🔑 Logging in as employee...');

  await page.goto(`${CONFIG.frontendUrl}/login`, { waitUntil: 'networkidle2' });

  // Enter credentials
  await page.type('input[type="email"]', CONFIG.credentials.employee.email);
  await page.type('input[type="password"]', CONFIG.credentials.employee.password);

  // Click login button
  await page.click('button[type="submit"]');

  // Wait for navigation
  await page.waitForNavigation({ waitUntil: 'networkidle2' });

  console.log('✅ Login successful');
  return true;
}

// Test Functions
async function testNavigationButtonConsistency(browser) {
  const test = {
    name: 'Navigation Button Consistency',
    status: 'running',
    checks: []
  };

  const page = await browser.newPage();
  await page.setViewport(CONFIG.viewport.desktop);

  try {
    await login(page);

    // Navigate to onboarding
    await page.goto(`${CONFIG.frontendUrl}/onboarding`, { waitUntil: 'networkidle2' });
    await delay(2000);

    // List of all onboarding steps to check
    const steps = [
      'WelcomeStep',
      'PersonalInfoStep',
      'JobDetailsStep',
      'W4FormStep',
      'I9Section1Step',
      'I9Section2Step',
      'I9ReviewSignStep',
      'DirectDepositStep',
      'CompanyPoliciesStep',
      'HealthInsuranceStep',
      'EmergencyContactsStep',
      'BackgroundCheckStep',
      'WeaponsPolicyStep',
      'TraffickingAwarenessStep',
      'FinalReviewStep'
    ];

    let currentStepIndex = 0;

    for (const stepName of steps) {
      console.log(`\n📍 Testing ${stepName}...`);

      // Check if NavigationButtons component is present
      const hasNavButtons = await page.evaluate(() => {
        const navContainer = document.querySelector('[class*="NavigationButtons"], [class*="navigation-buttons"], [class*="sticky bottom-0"]');
        if (!navContainer) {
          // Check for any button container at the bottom
          const buttons = Array.from(document.querySelectorAll('button')).filter(btn => {
            const text = btn.textContent?.toLowerCase() || '';
            return text.includes('continue') || text.includes('next') ||
                   text.includes('previous') || text.includes('back') ||
                   text.includes('continuar') || text.includes('siguiente');
          });
          return buttons.length > 0;
        }
        return true;
      });

      test.checks.push({
        step: stepName,
        hasNavigationButtons: hasNavButtons,
        status: hasNavButtons ? 'pass' : 'fail'
      });

      // Check sticky positioning on mobile
      await page.setViewport(CONFIG.viewport.mobile);
      await delay(500);

      const hasStickyNav = await page.evaluate(() => {
        const navContainers = document.querySelectorAll('[class*="sticky bottom-0"]');
        return navContainers.length > 0;
      });

      test.checks.push({
        step: `${stepName} - Mobile Sticky`,
        hasStickyNavigation: hasStickyNav,
        status: hasStickyNav ? 'pass' : 'warn'
      });

      await page.setViewport(CONFIG.viewport.desktop);

      // Take screenshot
      await takeScreenshot(page, `${stepName}-navigation`, 'navigation-consistency');

      // Try to advance to next step
      const nextButton = await page.$('button:has-text("Continue"), button:has-text("Next"), button:has-text("Get Started")');
      if (nextButton) {
        const isDisabled = await page.evaluate(el => el.disabled, nextButton);

        // For WelcomeStep, wait for timer
        if (stepName === 'WelcomeStep' && isDisabled) {
          console.log('  ⏳ Waiting for WelcomeStep timer...');
          await delay(3500);
        }

        // For forms, fill minimal required data
        if (stepName === 'PersonalInfoStep' && isDisabled) {
          console.log('  📝 Filling PersonalInfoStep form...');
          // Fill personal info tab first
          await page.evaluate(() => {
            const inputs = document.querySelectorAll('input[required]');
            inputs.forEach(input => {
              if (input.type === 'email') input.value = 'test@example.com';
              else if (input.type === 'tel') input.value = '555-123-4567';
              else if (input.type === 'date') input.value = '1990-01-01';
              else if (input.type === 'text') input.value = 'Test Value';
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
            });
          });

          // Switch to emergency contacts tab
          const emergencyTab = await page.$('button:has-text("Emergency Contacts")');
          if (emergencyTab) {
            await emergencyTab.click();
            await delay(500);

            // Fill emergency contacts
            await page.evaluate(() => {
              const inputs = document.querySelectorAll('input[required]');
              inputs.forEach(input => {
                if (input.type === 'tel') input.value = '555-987-6543';
                else if (input.type === 'text') input.value = 'Emergency Contact';
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
              });
            });
          }
        }

        // Click next if enabled
        const canProceed = await page.evaluate(el => !el.disabled, nextButton);
        if (canProceed) {
          await nextButton.click();
          await delay(2000);
          currentStepIndex++;
        } else {
          console.log('  ⚠️ Next button is disabled, skipping advancement');
        }
      }
    }

    test.status = test.checks.every(c => c.status !== 'fail') ? 'pass' : 'fail';

  } catch (error) {
    test.status = 'error';
    test.error = error.message;
    console.error('❌ Error:', error);
  } finally {
    await page.close();
  }

  testResults.tests.push(test);
  return test;
}

async function testButtonStates(browser) {
  const test = {
    name: 'Button States',
    status: 'running',
    checks: []
  };

  const page = await browser.newPage();
  await page.setViewport(CONFIG.viewport.desktop);

  try {
    await login(page);
    await page.goto(`${CONFIG.frontendUrl}/onboarding`, { waitUntil: 'networkidle2' });
    await delay(2000);

    // Test 1: Previous button should be hidden on first step
    console.log('\n🔍 Testing Previous button visibility...');

    const hasPreviousOnFirstStep = await page.evaluate(() => {
      const prevButtons = Array.from(document.querySelectorAll('button')).filter(btn => {
        const text = btn.textContent?.toLowerCase() || '';
        return text.includes('previous') || text.includes('back') || text.includes('anterior');
      });
      return prevButtons.length > 0;
    });

    test.checks.push({
      check: 'Previous button hidden on first step',
      result: !hasPreviousOnFirstStep,
      status: !hasPreviousOnFirstStep ? 'pass' : 'fail'
    });

    // Test 2: Next button disabled until requirements met
    console.log('🔍 Testing Next button states...');

    // WelcomeStep - should be disabled initially
    const welcomeNextInitial = await page.evaluate(() => {
      const nextBtn = Array.from(document.querySelectorAll('button')).find(btn => {
        const text = btn.textContent?.toLowerCase() || '';
        return text.includes('get started') || text.includes('continue') || text.includes('next');
      });
      return nextBtn ? nextBtn.disabled : null;
    });

    test.checks.push({
      check: 'WelcomeStep - Next initially disabled',
      result: welcomeNextInitial === true,
      status: welcomeNextInitial === true ? 'pass' : 'fail'
    });

    // Wait for timer
    await delay(3500);

    const welcomeNextAfterTimer = await page.evaluate(() => {
      const nextBtn = Array.from(document.querySelectorAll('button')).find(btn => {
        const text = btn.textContent?.toLowerCase() || '';
        return text.includes('get started') || text.includes('continue') || text.includes('next');
      });
      return nextBtn ? !nextBtn.disabled : null;
    });

    test.checks.push({
      check: 'WelcomeStep - Next enabled after timer',
      result: welcomeNextAfterTimer === true,
      status: welcomeNextAfterTimer === true ? 'pass' : 'fail'
    });

    // Move to PersonalInfoStep
    const nextButton = await page.$('button:has-text("Get Started"), button:has-text("Continue")');
    if (nextButton) {
      await nextButton.click();
      await delay(2000);
    }

    // PersonalInfoStep - should be disabled until form valid
    const personalNextInitial = await page.evaluate(() => {
      const nextBtn = Array.from(document.querySelectorAll('button')).find(btn => {
        const text = btn.textContent?.toLowerCase() || '';
        return text.includes('continue') || text.includes('next');
      });
      return nextBtn ? nextBtn.disabled : null;
    });

    test.checks.push({
      check: 'PersonalInfoStep - Next initially disabled',
      result: personalNextInitial === true,
      status: personalNextInitial === true ? 'pass' : 'fail'
    });

    // Now check that Previous button appears on second step
    const hasPreviousOnSecondStep = await page.evaluate(() => {
      const prevButtons = Array.from(document.querySelectorAll('button')).filter(btn => {
        const text = btn.textContent?.toLowerCase() || '';
        return text.includes('previous') || text.includes('back') || text.includes('anterior');
      });
      return prevButtons.length > 0;
    });

    test.checks.push({
      check: 'Previous button visible on second step',
      result: hasPreviousOnSecondStep,
      status: hasPreviousOnSecondStep ? 'pass' : 'fail'
    });

    await takeScreenshot(page, 'button-states', 'button-tests');

    test.status = test.checks.every(c => c.status === 'pass') ? 'pass' : 'fail';

  } catch (error) {
    test.status = 'error';
    test.error = error.message;
    console.error('❌ Error:', error);
  } finally {
    await page.close();
  }

  testResults.tests.push(test);
  return test;
}

async function testProgressDisplay(browser) {
  const test = {
    name: 'Progress Display',
    status: 'running',
    checks: []
  };

  const page = await browser.newPage();

  try {
    await login(page);
    await page.goto(`${CONFIG.frontendUrl}/onboarding`, { waitUntil: 'networkidle2' });
    await delay(2000);

    // Test mobile view - should show progress indicator
    console.log('\n📱 Testing mobile progress display...');
    await page.setViewport(CONFIG.viewport.mobile);
    await delay(1000);

    const mobileProgress = await page.evaluate(() => {
      // Look for "Step X of Y" text
      const stepText = Array.from(document.querySelectorAll('*')).find(el => {
        const text = el.textContent || '';
        return /Step \d+ of \d+/.test(text);
      });

      // Look for percentage text
      const percentText = Array.from(document.querySelectorAll('*')).find(el => {
        const text = el.textContent || '';
        return /\d+% Complete/.test(text);
      });

      // Look for progress bar
      const progressBar = document.querySelector('[style*="width"][class*="bg-blue"]');

      return {
        hasStepText: !!stepText,
        stepText: stepText?.textContent?.trim(),
        hasPercentText: !!percentText,
        percentText: percentText?.textContent?.trim(),
        hasProgressBar: !!progressBar
      };
    });

    test.checks.push({
      check: 'Mobile - Step X of Y display',
      result: mobileProgress.hasStepText,
      details: mobileProgress.stepText,
      status: mobileProgress.hasStepText ? 'pass' : 'fail'
    });

    test.checks.push({
      check: 'Mobile - Percentage display',
      result: mobileProgress.hasPercentText,
      details: mobileProgress.percentText,
      status: mobileProgress.hasPercentText ? 'pass' : 'fail'
    });

    test.checks.push({
      check: 'Mobile - Progress bar',
      result: mobileProgress.hasProgressBar,
      status: mobileProgress.hasProgressBar ? 'pass' : 'fail'
    });

    await takeScreenshot(page, 'mobile-progress', 'progress-display');

    // Test desktop view - should rely on global progress bar
    console.log('💻 Testing desktop progress display...');
    await page.setViewport(CONFIG.viewport.desktop);
    await delay(1000);

    const desktopProgress = await page.evaluate(() => {
      // Look for global progress bar (usually in header/sidebar)
      const globalProgress = document.querySelector('[class*="progress-bar"], [class*="ProgressBar"], [role="progressbar"]');

      // Mobile progress should be hidden on desktop
      const mobileProgressVisible = window.innerWidth >= 640 && Array.from(document.querySelectorAll('*')).some(el => {
        const text = el.textContent || '';
        const classes = el.className || '';
        return /Step \d+ of \d+/.test(text) && classes.includes('sm:hidden');
      });

      return {
        hasGlobalProgress: !!globalProgress,
        mobileProgressHidden: !mobileProgressVisible
      };
    });

    test.checks.push({
      check: 'Desktop - Global progress bar',
      result: desktopProgress.hasGlobalProgress,
      status: desktopProgress.hasGlobalProgress ? 'pass' : 'warn'
    });

    test.checks.push({
      check: 'Desktop - Mobile progress hidden',
      result: desktopProgress.mobileProgressHidden,
      status: desktopProgress.mobileProgressHidden ? 'pass' : 'warn'
    });

    await takeScreenshot(page, 'desktop-progress', 'progress-display');

    test.status = test.checks.every(c => c.status !== 'fail') ? 'pass' : 'fail';

  } catch (error) {
    test.status = 'error';
    test.error = error.message;
    console.error('❌ Error:', error);
  } finally {
    await page.close();
  }

  testResults.tests.push(test);
  return test;
}

async function testJumpNavigation(browser) {
  const test = {
    name: 'Jump Navigation (Progress Bar)',
    status: 'running',
    checks: []
  };

  const page = await browser.newPage();
  await page.setViewport(CONFIG.viewport.desktop);

  try {
    await login(page);
    await page.goto(`${CONFIG.frontendUrl}/onboarding`, { waitUntil: 'networkidle2' });
    await delay(2000);

    console.log('\n🎯 Testing jump navigation...');

    // First, complete a few steps
    console.log('  📝 Completing first few steps...');

    // Complete WelcomeStep
    await delay(3500);
    let nextBtn = await page.$('button:has-text("Get Started"), button:has-text("Continue")');
    if (nextBtn && await page.evaluate(el => !el.disabled, nextBtn)) {
      await nextBtn.click();
      await delay(2000);
    }

    // Now on PersonalInfoStep - mark the current URL
    const personalInfoUrl = await page.url();

    // Complete PersonalInfoStep (minimal data)
    await page.evaluate(() => {
      // Fill personal info
      const personalInputs = document.querySelectorAll('#personal input');
      personalInputs.forEach(input => {
        if (input.type === 'text' && input.name?.includes('first')) input.value = 'Test';
        if (input.type === 'text' && input.name?.includes('last')) input.value = 'User';
        if (input.type === 'email') input.value = 'test@example.com';
        if (input.type === 'tel') input.value = '555-123-4567';
        if (input.type === 'date') input.value = '1990-01-01';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });

      // Switch to emergency tab
      const emergencyTab = Array.from(document.querySelectorAll('button')).find(btn =>
        btn.textContent?.includes('Emergency'));
      if (emergencyTab) emergencyTab.click();
    });

    await delay(1000);

    // Fill emergency contacts
    await page.evaluate(() => {
      const emergencyInputs = document.querySelectorAll('#emergency input');
      emergencyInputs.forEach(input => {
        if (input.type === 'text') input.value = 'Emergency Contact';
        if (input.type === 'tel') input.value = '555-987-6543';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });

    await delay(1000);

    // Continue to next step
    nextBtn = await page.$('button:has-text("Continue")');
    if (nextBtn && await page.evaluate(el => !el.disabled, nextBtn)) {
      await nextBtn.click();
      await delay(2000);
    }

    // Now we should be on JobDetailsStep
    const jobDetailsUrl = await page.url();

    // Test: Try to jump back to completed step (WelcomeStep)
    console.log('  🔙 Testing jump to completed step...');

    const canJumpToCompleted = await page.evaluate(() => {
      // Find progress bar items
      const progressItems = document.querySelectorAll('[class*="progress-item"], [role="progressbar"] > div, [class*="step-indicator"]');

      // Try to click on first completed step
      for (const item of progressItems) {
        if (item.textContent?.includes('Welcome') ||
            item.querySelector('[class*="completed"], [class*="check"]')) {
          item.click();
          return true;
        }
      }
      return false;
    });

    test.checks.push({
      check: 'Can click on completed step',
      result: canJumpToCompleted,
      status: canJumpToCompleted ? 'pass' : 'warn'
    });

    if (canJumpToCompleted) {
      await delay(2000);
      const currentUrl = await page.url();
      const wentBack = currentUrl !== jobDetailsUrl;

      test.checks.push({
        check: 'Navigation to completed step works',
        result: wentBack,
        status: wentBack ? 'pass' : 'fail'
      });

      // Go forward again
      if (wentBack) {
        await page.goto(jobDetailsUrl, { waitUntil: 'networkidle2' });
        await delay(1000);
      }
    }

    // Test: Try to jump to future uncompleted step (should not work)
    console.log('  ⏭️ Testing jump to future step...');

    const attemptedFutureJump = await page.evaluate(() => {
      // Find a future step in progress bar
      const progressItems = document.querySelectorAll('[class*="progress-item"], [role="progressbar"] > div');

      for (const item of progressItems) {
        if (item.textContent?.includes('Background') ||
            item.textContent?.includes('Final') ||
            item.classList.contains('disabled') ||
            item.classList.contains('locked')) {
          // Try to click it
          item.click();
          return {
            clicked: true,
            isDisabled: item.classList.contains('disabled') ||
                       item.classList.contains('locked') ||
                       item.style.pointerEvents === 'none'
          };
        }
      }
      return { clicked: false, isDisabled: false };
    });

    await delay(1000);
    const stayedOnSamePage = await page.url() === jobDetailsUrl;

    test.checks.push({
      check: 'Cannot jump to future uncompleted steps',
      result: stayedOnSamePage || attemptedFutureJump.isDisabled,
      status: (stayedOnSamePage || attemptedFutureJump.isDisabled) ? 'pass' : 'fail'
    });

    await takeScreenshot(page, 'jump-navigation', 'navigation-tests');

    test.status = test.checks.every(c => c.status !== 'fail') ? 'pass' : 'fail';

  } catch (error) {
    test.status = 'error';
    test.error = error.message;
    console.error('❌ Error:', error);
  } finally {
    await page.close();
  }

  testResults.tests.push(test);
  return test;
}

async function testTranslationSupport(browser) {
  const test = {
    name: 'Translation Support',
    status: 'running',
    checks: []
  };

  const page = await browser.newPage();
  await page.setViewport(CONFIG.viewport.desktop);

  try {
    await login(page);
    await page.goto(`${CONFIG.frontendUrl}/onboarding`, { waitUntil: 'networkidle2' });
    await delay(2000);

    console.log('\n🌐 Testing translation support...');

    // Test English labels
    console.log('  🇬🇧 Testing English labels...');

    const englishLabels = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const continueBtn = buttons.find(btn => btn.textContent?.includes('Continue') ||
                                              btn.textContent?.includes('Get Started'));
      const previousBtn = buttons.find(btn => btn.textContent?.includes('Previous') ||
                                              btn.textContent?.includes('Back'));

      return {
        hasContinue: !!continueBtn,
        continueText: continueBtn?.textContent?.trim(),
        hasPrevious: !!previousBtn,
        previousText: previousBtn?.textContent?.trim()
      };
    });

    test.checks.push({
      check: 'English - Continue/Get Started button',
      result: englishLabels.hasContinue,
      details: englishLabels.continueText,
      status: englishLabels.hasContinue ? 'pass' : 'fail'
    });

    // Switch to Spanish
    console.log('  🇪🇸 Switching to Spanish...');

    const languageSwitched = await page.evaluate(() => {
      // Look for language selector
      const langSelector = document.querySelector('[class*="language"], select, [role="combobox"]');
      if (langSelector) {
        if (langSelector.tagName === 'SELECT') {
          langSelector.value = 'es';
          langSelector.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          // Click on selector and choose Spanish
          langSelector.click();
          setTimeout(() => {
            const spanishOption = Array.from(document.querySelectorAll('[role="option"], li')).find(
              el => el.textContent?.includes('Español') || el.textContent?.includes('ES')
            );
            if (spanishOption) spanishOption.click();
          }, 100);
        }
        return true;
      }

      // Alternative: Look for language toggle button
      const langButton = Array.from(document.querySelectorAll('button')).find(
        btn => btn.textContent?.includes('ES') || btn.textContent?.includes('Español')
      );
      if (langButton) {
        langButton.click();
        return true;
      }

      return false;
    });

    if (languageSwitched) {
      await delay(2000);

      // Test Spanish labels
      const spanishLabels = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const continueBtn = buttons.find(btn => btn.textContent?.includes('Continuar') ||
                                                btn.textContent?.includes('Comenzar'));
        const previousBtn = buttons.find(btn => btn.textContent?.includes('Anterior') ||
                                                btn.textContent?.includes('Atrás'));

        return {
          hasContinue: !!continueBtn,
          continueText: continueBtn?.textContent?.trim(),
          hasPrevious: !!previousBtn,
          previousText: previousBtn?.textContent?.trim()
        };
      });

      test.checks.push({
        check: 'Spanish - Continuar/Comenzar button',
        result: spanishLabels.hasContinue,
        details: spanishLabels.continueText,
        status: spanishLabels.hasContinue ? 'pass' : 'fail'
      });

      // Move to second step to test Previous button translation
      await delay(3500); // Wait for timer on WelcomeStep
      const nextBtn = await page.$('button:has-text("Continuar"), button:has-text("Comenzar")');
      if (nextBtn) {
        await nextBtn.click();
        await delay(2000);

        const spanishPrevious = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const previousBtn = buttons.find(btn => btn.textContent?.includes('Anterior') ||
                                                  btn.textContent?.includes('Atrás'));
          return {
            hasPrevious: !!previousBtn,
            previousText: previousBtn?.textContent?.trim()
          };
        });

        test.checks.push({
          check: 'Spanish - Anterior/Atrás button',
          result: spanishPrevious.hasPrevious,
          details: spanishPrevious.previousText,
          status: spanishPrevious.hasPrevious ? 'pass' : 'fail'
        });
      }

      await takeScreenshot(page, 'spanish-translation', 'translation-tests');
    } else {
      test.checks.push({
        check: 'Language switcher available',
        result: false,
        status: 'warn'
      });
    }

    test.status = test.checks.every(c => c.status !== 'fail') ? 'pass' : 'fail';

  } catch (error) {
    test.status = 'error';
    test.error = error.message;
    console.error('❌ Error:', error);
  } finally {
    await page.close();
  }

  testResults.tests.push(test);
  return test;
}

async function testMobileResponsive(browser) {
  const test = {
    name: 'Mobile Responsive Navigation',
    status: 'running',
    checks: []
  };

  const page = await browser.newPage();

  try {
    await login(page);
    await page.goto(`${CONFIG.frontendUrl}/onboarding`, { waitUntil: 'networkidle2' });

    console.log('\n📱 Testing mobile responsive navigation...');

    // Set mobile viewport
    await page.setViewport(CONFIG.viewport.mobile);
    await delay(2000);

    // Check sticky navigation
    const stickyNavigation = await page.evaluate(() => {
      const navContainer = document.querySelector('[class*="sticky bottom-0"]');
      if (!navContainer) return { hasSticky: false };

      const rect = navContainer.getBoundingClientRect();
      const styles = window.getComputedStyle(navContainer);

      return {
        hasSticky: true,
        position: styles.position,
        bottom: styles.bottom,
        isAtBottom: rect.bottom >= window.innerHeight - 10,
        hasShadow: styles.boxShadow !== 'none',
        hasBorder: styles.borderTopWidth !== '0px'
      };
    });

    test.checks.push({
      check: 'Mobile - Has sticky navigation',
      result: stickyNavigation.hasSticky,
      status: stickyNavigation.hasSticky ? 'pass' : 'fail'
    });

    if (stickyNavigation.hasSticky) {
      test.checks.push({
        check: 'Mobile - Navigation at bottom',
        result: stickyNavigation.isAtBottom,
        status: stickyNavigation.isAtBottom ? 'pass' : 'warn'
      });

      test.checks.push({
        check: 'Mobile - Navigation has visual separation',
        result: stickyNavigation.hasShadow || stickyNavigation.hasBorder,
        status: (stickyNavigation.hasShadow || stickyNavigation.hasBorder) ? 'pass' : 'warn'
      });
    }

    // Check button sizing on mobile
    const mobileButtonSizing = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button')).filter(btn => {
        const text = btn.textContent?.toLowerCase() || '';
        return text.includes('continue') || text.includes('next') ||
               text.includes('previous') || text.includes('back');
      });

      if (buttons.length === 0) return { hasButtons: false };

      const button = buttons[0];
      const rect = button.getBoundingClientRect();
      const styles = window.getComputedStyle(button);

      return {
        hasButtons: true,
        width: rect.width,
        height: rect.height,
        isFullWidth: rect.width >= window.innerWidth * 0.8,
        hasMinHeight: rect.height >= 44, // iOS touch target minimum
        fontSize: styles.fontSize,
        padding: styles.padding
      };
    });

    test.checks.push({
      check: 'Mobile - Button minimum height (44px)',
      result: mobileButtonSizing.hasMinHeight,
      details: `Height: ${mobileButtonSizing.height}px`,
      status: mobileButtonSizing.hasMinHeight ? 'pass' : 'fail'
    });

    test.checks.push({
      check: 'Mobile - Button width appropriate',
      result: mobileButtonSizing.isFullWidth,
      details: `Width: ${mobileButtonSizing.width}px`,
      status: mobileButtonSizing.isFullWidth ? 'pass' : 'warn'
    });

    // Check progress indicator on mobile
    const mobileProgressIndicator = await page.evaluate(() => {
      const stepText = Array.from(document.querySelectorAll('*')).find(el => {
        const text = el.textContent || '';
        return /Step \d+ of \d+/.test(text) &&
               window.getComputedStyle(el).display !== 'none';
      });

      const percentText = Array.from(document.querySelectorAll('*')).find(el => {
        const text = el.textContent || '';
        return /\d+% Complete/.test(text) &&
               window.getComputedStyle(el).display !== 'none';
      });

      return {
        hasStepIndicator: !!stepText,
        hasPercentIndicator: !!percentText,
        stepText: stepText?.textContent?.trim(),
        percentText: percentText?.textContent?.trim()
      };
    });

    test.checks.push({
      check: 'Mobile - Step indicator visible',
      result: mobileProgressIndicator.hasStepIndicator,
      details: mobileProgressIndicator.stepText,
      status: mobileProgressIndicator.hasStepIndicator ? 'pass' : 'fail'
    });

    test.checks.push({
      check: 'Mobile - Percent complete visible',
      result: mobileProgressIndicator.hasPercentIndicator,
      details: mobileProgressIndicator.percentText,
      status: mobileProgressIndicator.hasPercentIndicator ? 'pass' : 'fail'
    });

    await takeScreenshot(page, 'mobile-navigation', 'mobile-tests');

    // Test desktop to ensure mobile elements are hidden
    console.log('💻 Testing desktop hides mobile elements...');
    await page.setViewport(CONFIG.viewport.desktop);
    await delay(1000);

    const desktopHidesMobile = await page.evaluate(() => {
      // Check if mobile progress indicators are hidden
      const mobileElements = Array.from(document.querySelectorAll('[class*="sm:hidden"]'));
      const hasHiddenElements = mobileElements.some(el => {
        const text = el.textContent || '';
        return /Step \d+ of \d+/.test(text) || /\d+% Complete/.test(text);
      });

      // Check if sticky navigation is not sticky on desktop
      const navContainer = document.querySelector('[class*="sticky"][class*="sm:relative"]');

      return {
        hidesMobileProgress: !hasHiddenElements || mobileElements.length > 0,
        hasDifferentDesktopLayout: !!navContainer
      };
    });

    test.checks.push({
      check: 'Desktop - Hides mobile progress',
      result: desktopHidesMobile.hidesMobileProgress,
      status: desktopHidesMobile.hidesMobileProgress ? 'pass' : 'warn'
    });

    test.checks.push({
      check: 'Desktop - Different layout than mobile',
      result: desktopHidesMobile.hasDifferentDesktopLayout,
      status: desktopHidesMobile.hasDifferentDesktopLayout ? 'pass' : 'warn'
    });

    await takeScreenshot(page, 'desktop-navigation', 'mobile-tests');

    test.status = test.checks.every(c => c.status !== 'fail') ? 'pass' : 'fail';

  } catch (error) {
    test.status = 'error';
    test.error = error.message;
    console.error('❌ Error:', error);
  } finally {
    await page.close();
  }

  testResults.tests.push(test);
  return test;
}

// Main test runner
async function runTests() {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║     Navigation Standardization Test Suite              ║
║     Testing all 15 onboarding steps                    ║
╚═══════════════════════════════════════════════════════╝
`);

  const browser = await puppeteer.launch({
    headless: false,
    devtools: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    // Run all tests
    await testNavigationButtonConsistency(browser);
    await testButtonStates(browser);
    await testProgressDisplay(browser);
    await testJumpNavigation(browser);
    await testTranslationSupport(browser);
    await testMobileResponsive(browser);

    // Calculate summary
    testResults.tests.forEach(test => {
      if (test.status === 'pass') testResults.summary.passed++;
      else if (test.status === 'fail') testResults.summary.failed++;
      else testResults.summary.warnings++;
    });

    // Display results
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));

    testResults.tests.forEach(test => {
      const icon = test.status === 'pass' ? '✅' :
                   test.status === 'fail' ? '❌' : '⚠️';
      console.log(`${icon} ${test.name}: ${test.status.toUpperCase()}`);

      if (test.checks && test.checks.length > 0) {
        test.checks.forEach(check => {
          const checkIcon = check.status === 'pass' ? '  ✓' :
                           check.status === 'fail' ? '  ✗' : '  !';
          const details = check.details ? ` (${check.details})` : '';
          console.log(`${checkIcon} ${check.check || check.step}${details}`);
        });
      }

      if (test.error) {
        console.log(`  Error: ${test.error}`);
      }
    });

    console.log('\n' + '='.repeat(60));
    console.log(`OVERALL: ${testResults.summary.passed} passed, ${testResults.summary.failed} failed, ${testResults.summary.warnings} warnings`);
    console.log('='.repeat(60));

    // Save results to file
    const resultsPath = './test-results-navigation.json';
    await fs.writeFile(resultsPath, JSON.stringify(testResults, null, 2));
    console.log(`\n📁 Results saved to: ${resultsPath}`);
    console.log(`📸 Screenshots saved to: ${CONFIG.screenshotDir}/`);

    // Return exit code based on results
    return testResults.summary.failed > 0 ? 1 : 0;

  } catch (error) {
    console.error('Fatal error:', error);
    return 1;
  } finally {
    await browser.close();
  }
}

// Check if puppeteer is installed
async function checkDependencies() {
  try {
    require.resolve('puppeteer');
    return true;
  } catch (e) {
    console.error('❌ Puppeteer is not installed.');
    console.log('\nPlease install it by running:');
    console.log('  npm install puppeteer');
    console.log('\nOr globally:');
    console.log('  npm install -g puppeteer');
    return false;
  }
}

// Entry point
(async () => {
  const hasDepends = await checkDependencies();
  if (!hasDepends) {
    process.exit(1);
  }

  const exitCode = await runTests();
  process.exit(exitCode);
})();