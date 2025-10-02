/**
 * Production Navigation Test
 * 
 * Tests the production-level navigation system for correctness and reliability.
 */

class ProductionNavigationTester {
  constructor() {
    this.events = []
    this.startTime = Date.now()
    this.setupEventTracking()
  }

  setupEventTracking() {
    const originalLog = console.log
    console.log = (...args) => {
      const message = args.join(' ')
      if (message.includes('Navigation:')) {
        this.events.push({
          message,
          timestamp: Date.now() - this.startTime
        })
      }
      originalLog(...args)
    }
  }

  clearEvents() {
    this.events = []
    this.startTime = Date.now()
  }

  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async testSingleNavigation() {
    console.log('🧪 Testing single navigation event...')
    this.clearEvents()
    
    // Navigate to analytics
    window.history.pushState(null, '', '/hr/analytics')
    await this.wait(100)
    
    const eventCount = this.events.length
    
    if (eventCount === 1) {
      console.log('✅ PASS: Single navigation produces exactly one event')
      return true
    } else {
      console.log(`❌ FAIL: Expected 1 event, got ${eventCount}`)
      this.events.forEach(e => console.log(`  - ${e.message}`))
      return false
    }
  }

  async testBackNavigation() {
    console.log('🧪 Testing back navigation (detailed)...')
    this.clearEvents()
    
    // Start from properties
    window.history.pushState(null, '', '/hr/properties')
    await this.wait(100)
    
    // Navigate to applications
    window.history.pushState(null, '', '/hr/applications')
    await this.wait(100)
    
    console.log(`Current URL before back: ${window.location.pathname}`)
    console.log(`History length before back: ${window.history.length}`)
    
    this.clearEvents()
    
    // Test back button - should go to properties
    window.history.back()
    await this.wait(200)
    
    console.log(`Current URL after back: ${window.location.pathname}`)
    console.log(`Expected: /hr/properties`)
    
    const eventCount = this.events.length
    const backWorked = window.location.pathname === '/hr/properties'
    
    if (backWorked && eventCount <= 1) {
      console.log('✅ PASS: Back navigation works correctly with single click')
      return true
    } else {
      console.log(`❌ FAIL: Back navigation - URL correct: ${backWorked}, Events: ${eventCount}`)
      this.events.forEach(e => console.log(`  - ${e.message}`))
      return false
    }
  }

  async testRapidNavigation() {
    console.log('🧪 Testing rapid navigation...')
    this.clearEvents()
    
    // Rapid navigation sequence
    const sections = ['properties', 'employees', 'applications', 'analytics']
    
    for (const section of sections) {
      window.history.pushState(null, '', `/hr/${section}`)
    }
    
    await this.wait(200)
    
    const eventCount = this.events.length
    const uniqueEvents = new Set(this.events.map(e => e.message)).size
    
    if (eventCount === uniqueEvents && eventCount <= sections.length) {
      console.log('✅ PASS: Rapid navigation produces no duplicates')
      return true
    } else {
      console.log(`❌ FAIL: Rapid navigation - Events: ${eventCount}, Unique: ${uniqueEvents}`)
      return false
    }
  }

  async testPageTitleUpdates() {
    console.log('🧪 Testing page title updates...')
    
    const testCases = [
      { path: '/hr/properties', expectedTitle: 'Properties - HR Dashboard' },
      { path: '/hr/analytics', expectedTitle: 'Analytics - HR Dashboard' },
      { path: '/manager/applications', expectedTitle: 'Applications - Manager Dashboard' }
    ]
    
    let passed = 0
    
    for (const testCase of testCases) {
      window.history.pushState(null, '', testCase.path)
      await this.wait(100)
      
      if (document.title === testCase.expectedTitle) {
        console.log(`✅ PASS: Title correct for ${testCase.path}`)
        passed++
      } else {
        console.log(`❌ FAIL: Title for ${testCase.path} - Expected: "${testCase.expectedTitle}", Got: "${document.title}"`)
      }
    }
    
    return passed === testCases.length
  }

  async testPropertiesToApplicationsBack() {
    console.log('🧪 Testing specific scenario: Properties → Applications → Back...')
    this.clearEvents()
    
    // Start from properties (simulate initial page load)
    window.history.replaceState(null, '', '/hr/properties')
    await this.wait(100)
    
    // Navigate to applications (simulate user click)
    window.history.pushState(null, '', '/hr/applications')
    await this.wait(100)
    
    console.log(`✓ Navigated from properties to applications`)
    console.log(`Current URL: ${window.location.pathname}`)
    
    this.clearEvents()
    
    // Test back button - should return to properties in ONE click
    console.log(`Testing back button...`)
    window.history.back()
    await this.wait(300)
    
    const finalUrl = window.location.pathname
    const expectedUrl = '/hr/properties'
    const backWorked = finalUrl === expectedUrl
    
    console.log(`Final URL: ${finalUrl}`)
    console.log(`Expected: ${expectedUrl}`)
    console.log(`Back worked: ${backWorked}`)
    
    if (backWorked) {
      console.log('✅ PASS: Properties → Applications → Back works with single click')
      return true
    } else {
      console.log('❌ FAIL: Back button did not work correctly')
      console.log('Try clicking back again to see if it requires double click...')
      return false
    }
  }

  async runAllTests() {
    console.log('🚀 Running Production Navigation Tests...')
    console.log('=' .repeat(50))
    
    const results = []
    
    try {
      results.push(await this.testSingleNavigation())
      await this.wait(200)
      
      results.push(await this.testBackNavigation())
      await this.wait(200)
      
      results.push(await this.testPropertiesToApplicationsBack())
      await this.wait(200)
      
      results.push(await this.testRapidNavigation())
      await this.wait(200)
      
      results.push(await this.testPageTitleUpdates())
      
      console.log('=' .repeat(50))
      
      const passed = results.filter(r => r).length
      const total = results.length
      
      if (passed === total) {
        console.log(`🎉 ALL TESTS PASSED! (${passed}/${total})`)
        console.log('✅ Production navigation system is working correctly!')
        console.log('✅ Single navigation events only!')
        console.log('✅ Back button works with one click!')
        console.log('✅ Page titles update correctly!')
      } else {
        console.log(`⚠️ ${passed}/${total} tests passed`)
        console.log('❌ Some issues need to be addressed')
        console.log('')
        console.log('🔧 If back button still requires double click:')
        console.log('1. Check browser console for navigation events')
        console.log('2. Verify no duplicate history entries are being created')
        console.log('3. Test with browser dev tools Network tab to see navigation timing')
      }
      
    } catch (error) {
      console.error('❌ Test execution failed:', error)
    }
    
    return results
  }

  getEventSummary() {
    return {
      totalEvents: this.events.length,
      uniqueEvents: new Set(this.events.map(e => e.message)).size,
      events: this.events
    }
  }
}

// Usage
console.log(`
Production Navigation Tester
===========================

To test the production navigation system:

const tester = new ProductionNavigationTester()
tester.runAllTests()

Individual tests:
- tester.testSingleNavigation()
- tester.testBackNavigation()
- tester.testRapidNavigation()
- tester.testPageTitleUpdates()

Get summary:
- tester.getEventSummary()
`)

window.ProductionNavigationTester = ProductionNavigationTester