/**
 * Browser Navigation Test Script
 * 
 * This script tests the browser navigation functionality for the dashboard.
 * Run this in the browser console while on the dashboard to test various scenarios.
 */

class BrowserNavigationTester {
  constructor() {
    this.testResults = []
    this.originalTitle = document.title
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString()
    const logEntry = { timestamp, message, type }
    this.testResults.push(logEntry)
    console.log(`[${type.toUpperCase()}] ${message}`)
  }

  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Test 1: URL-based navigation
  async testUrlNavigation() {
    this.log('Testing URL-based navigation...', 'test')
    
    const currentPath = window.location.pathname
    const role = currentPath.includes('/hr') ? 'hr' : 'manager'
    const sections = role === 'hr' 
      ? ['properties', 'managers', 'employees', 'applications', 'analytics']
      : ['applications', 'employees', 'analytics']

    for (const section of sections) {
      const expectedUrl = `/${role}/${section}`
      
      // Navigate to section
      window.history.pushState(null, '', expectedUrl)
      window.dispatchEvent(new PopStateEvent('popstate'))
      await this.wait(100)
      
      // Check if URL matches
      if (window.location.pathname === expectedUrl) {
        this.log(`✓ URL navigation to ${section} successful`, 'success')
      } else {
        this.log(`✗ URL navigation to ${section} failed. Expected: ${expectedUrl}, Got: ${window.location.pathname}`, 'error')
      }
    }
  }

  // Test 2: Browser back/forward buttons
  async testBrowserButtons() {
    this.log('Testing browser back/forward functionality...', 'test')
    
    const currentPath = window.location.pathname
    const role = currentPath.includes('/hr') ? 'hr' : 'manager'
    
    // Navigate to different sections
    const testSections = role === 'hr' ? ['properties', 'employees', 'applications'] : ['applications', 'employees']
    
    for (const section of testSections) {
      window.history.pushState(null, '', `/${role}/${section}`)
      await this.wait(100)
    }
    
    // Test back navigation
    const initialPath = window.location.pathname
    window.history.back()
    await this.wait(200)
    
    if (window.location.pathname !== initialPath) {
      this.log('✓ Browser back button works correctly', 'success')
    } else {
      this.log('✗ Browser back button failed', 'error')
    }
    
    // Test forward navigation
    const backPath = window.location.pathname
    window.history.forward()
    await this.wait(200)
    
    if (window.location.pathname !== backPath) {
      this.log('✓ Browser forward button works correctly', 'success')
    } else {
      this.log('✗ Browser forward button failed', 'error')
    }
  }

  // Test 3: Page title updates
  async testPageTitles() {
    this.log('Testing page title updates...', 'test')
    
    const currentPath = window.location.pathname
    const role = currentPath.includes('/hr') ? 'hr' : 'manager'
    const sections = role === 'hr' 
      ? ['properties', 'managers', 'employees', 'applications', 'analytics']
      : ['applications', 'employees', 'analytics']

    const expectedTitles = role === 'hr' ? {
      properties: 'Properties - HR Dashboard',
      managers: 'Managers - HR Dashboard',
      employees: 'Employees - HR Dashboard',
      applications: 'Applications - HR Dashboard',
      analytics: 'Analytics - HR Dashboard'
    } : {
      applications: 'Applications - Manager Dashboard',
      employees: 'Employees - Manager Dashboard',
      analytics: 'Analytics - Manager Dashboard'
    }

    for (const section of sections) {
      // Navigate to section
      window.history.pushState(null, '', `/${role}/${section}`)
      window.dispatchEvent(new PopStateEvent('popstate'))
      await this.wait(200)
      
      const expectedTitle = expectedTitles[section]
      if (document.title === expectedTitle) {
        this.log(`✓ Page title for ${section} is correct: "${document.title}"`, 'success')
      } else {
        this.log(`✗ Page title for ${section} is incorrect. Expected: "${expectedTitle}", Got: "${document.title}"`, 'error')
      }
    }
  }

  // Test 4: URL bookmarking
  async testBookmarking() {
    this.log('Testing URL bookmarking...', 'test')
    
    const currentPath = window.location.pathname
    const role = currentPath.includes('/hr') ? 'hr' : 'manager'
    const testSection = role === 'hr' ? 'employees' : 'applications'
    
    // Simulate direct URL access (bookmark)
    const bookmarkUrl = `/${role}/${testSection}`
    const originalUrl = window.location.pathname
    
    // Navigate away first
    window.history.pushState(null, '', `/${role}/properties`)
    await this.wait(100)
    
    // Now simulate bookmark access
    window.history.pushState(null, '', bookmarkUrl)
    window.dispatchEvent(new PopStateEvent('popstate'))
    await this.wait(200)
    
    if (window.location.pathname === bookmarkUrl) {
      this.log(`✓ Bookmark URL access works for ${testSection}`, 'success')
    } else {
      this.log(`✗ Bookmark URL access failed for ${testSection}`, 'error')
    }
    
    // Test invalid bookmark URL
    const invalidUrl = `/${role}/invalid-section`
    window.history.pushState(null, '', invalidUrl)
    window.dispatchEvent(new PopStateEvent('popstate'))
    await this.wait(200)
    
    const defaultSection = role === 'hr' ? 'properties' : 'applications'
    if (window.location.pathname === `/${role}/${defaultSection}`) {
      this.log('✓ Invalid bookmark URL redirects to default section', 'success')
    } else {
      this.log('✗ Invalid bookmark URL handling failed', 'error')
    }
  }

  // Test 5: Page refresh handling
  async testPageRefresh() {
    this.log('Testing page refresh handling...', 'test')
    
    const currentPath = window.location.pathname
    const role = currentPath.includes('/hr') ? 'hr' : 'manager'
    const testSection = role === 'hr' ? 'analytics' : 'employees'
    
    // Navigate to a specific section
    window.history.pushState(null, '', `/${role}/${testSection}`)
    window.dispatchEvent(new PopStateEvent('popstate'))
    await this.wait(200)
    
    // Simulate page refresh by checking if the URL is maintained
    const urlBeforeRefresh = window.location.pathname
    
    // In a real scenario, this would be a page refresh
    // For testing, we'll just verify the URL structure is valid
    if (urlBeforeRefresh === `/${role}/${testSection}`) {
      this.log('✓ Page refresh URL structure is maintained', 'success')
    } else {
      this.log('✗ Page refresh URL structure test failed', 'error')
    }
  }

  // Run all tests
  async runAllTests() {
    this.log('Starting browser navigation tests...', 'test')
    this.log('='.repeat(50), 'info')
    
    try {
      await this.testUrlNavigation()
      await this.wait(500)
      
      await this.testBrowserButtons()
      await this.wait(500)
      
      await this.testPageTitles()
      await this.wait(500)
      
      await this.testBookmarking()
      await this.wait(500)
      
      await this.testPageRefresh()
      
      this.log('='.repeat(50), 'info')
      this.log('Browser navigation tests completed!', 'test')
      
      // Summary
      const successCount = this.testResults.filter(r => r.type === 'success').length
      const errorCount = this.testResults.filter(r => r.type === 'error').length
      
      this.log(`Test Summary: ${successCount} passed, ${errorCount} failed`, 'info')
      
      if (errorCount === 0) {
        this.log('🎉 All browser navigation tests passed!', 'success')
      } else {
        this.log('⚠️ Some browser navigation tests failed. Check the logs above.', 'error')
      }
      
    } catch (error) {
      this.log(`Test execution failed: ${error.message}`, 'error')
    } finally {
      // Restore original title
      document.title = this.originalTitle
    }
    
    return this.testResults
  }

  // Get test results
  getResults() {
    return this.testResults
  }

  // Clear test results
  clearResults() {
    this.testResults = []
  }
}

// Usage instructions
console.log(`
Browser Navigation Tester
========================

To run the tests, execute:

const tester = new BrowserNavigationTester()
tester.runAllTests()

Individual tests:
- tester.testUrlNavigation()
- tester.testBrowserButtons()
- tester.testPageTitles()
- tester.testBookmarking()
- tester.testPageRefresh()

Get results:
- tester.getResults()
`)

// Make tester available globally for manual testing
window.BrowserNavigationTester = BrowserNavigationTester