/**
 * Simple Navigation Test
 * 
 * Tests the simple navigation system to ensure it works correctly
 */

class SimpleNavigationTester {
  constructor() {
    this.events = []
    this.setupEventTracking()
  }

  setupEventTracking() {
    const originalLog = console.log
    console.log = (...args) => {
      const message = args.join(' ')
      if (message.includes('Navigation:')) {
        this.events.push({
          message,
          timestamp: Date.now()
        })
      }
      originalLog(...args)
    }
  }

  clearEvents() {
    this.events = []
  }

  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async testBasicNavigation() {
    console.log('🧪 Testing basic navigation...')
    this.clearEvents()

    // Navigate from properties to analytics
    window.history.pushState(null, '', '/hr/properties')
    await this.wait(50)

    window.history.pushState(null, '', '/hr/analytics')
    await this.wait(50)

    const eventCount = this.events.length
    const uniqueEvents = new Set(this.events.map(e => e.message)).size

    console.log(`Events: ${eventCount}, Unique: ${uniqueEvents}`)
    this.events.forEach(e => console.log(`  - ${e.message}`))

    if (eventCount === 1 && uniqueEvents === 1) {
      console.log('✅ PASS: Basic navigation produces single event')
      return true
    } else {
      console.log('❌ FAIL: Expected 1 unique event')
      return false
    }
  }

  async testBackButton() {
    console.log('🧪 Testing back button...')
    this.clearEvents()

    // Set up navigation: properties -> analytics
    window.history.pushState(null, '', '/hr/properties')
    await this.wait(50)
    window.history.pushState(null, '', '/hr/analytics')
    await this.wait(50)

    console.log(`Before back: ${window.location.pathname}`)
    this.clearEvents()

    // Test back button
    window.history.back()
    await this.wait(100)

    console.log(`After back: ${window.location.pathname}`)

    const backWorked = window.location.pathname === '/hr/properties'
    const eventCount = this.events.length

    if (backWorked && eventCount <= 1) {
      console.log('✅ PASS: Back button works with single click')
      return true
    } else {
      console.log(`❌ FAIL: Back button - URL correct: ${backWorked}, Events: ${eventCount}`)
      return false
    }
  }

  async testNoDuplicates() {
    console.log('🧪 Testing no duplicate events...')
    this.clearEvents()

    // Multiple rapid navigations
    const sections = ['properties', 'analytics', 'applications', 'employees']

    for (const section of sections) {
      window.history.pushState(null, '', `/hr/${section}`)
      await this.wait(10)
    }

    await this.wait(100)

    const eventCount = this.events.length
    const uniqueEvents = new Set(this.events.map(e => e.message)).size

    console.log(`Total events: ${eventCount}, Unique: ${uniqueEvents}`)

    if (eventCount === uniqueEvents) {
      console.log('✅ PASS: No duplicate events detected')
      return true
    } else {
      console.log('❌ FAIL: Duplicate events found')
      this.events.forEach(e => console.log(`  - ${e.message}`))
      return false
    }
  }

  async runAllTests() {
    console.log('🚀 Testing Simple Navigation System...')
    console.log('='.repeat(40))

    const results = []

    try {
      results.push(await this.testBasicNavigation())
      await this.wait(200)

      results.push(await this.testBackButton())
      await this.wait(200)

      results.push(await this.testNoDuplicates())

      console.log('='.repeat(40))

      const passed = results.filter(r => r).length
      const total = results.length

      if (passed === total) {
        console.log(`🎉 ALL TESTS PASSED! (${passed}/${total})`)
        console.log('✅ Simple navigation is working!')
        console.log('✅ No duplicate events!')
        console.log('✅ Back button works!')
      } else {
        console.log(`⚠️ ${passed}/${total} tests passed`)
      }

    } catch (error) {
      console.error('❌ Test failed:', error)
    }

    return results
  }
}

// Usage
console.log(`
Simple Navigation Tester
=======================

To test the FIXED navigation:
const tester = new SimpleNavigationTester()
tester.runAllTests()

Quick test:
tester.testBasicNavigation()
`)

window.SimpleNavigationTester = SimpleNavigationTester

// Auto-run a quick test
setTimeout(() => {
  console.log('🔧 Auto-testing navigation fix...')
  const tester = new SimpleNavigationTester()
  tester.testBasicNavigation()
}, 2000)