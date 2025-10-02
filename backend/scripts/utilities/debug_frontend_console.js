// Debug Frontend KPI Issue
// Run this in the browser console on the HR Dashboard page

console.log('🔍 Debugging HR Dashboard KPI Issue...');

// Check if the stats data is being fetched
const checkStatsData = () => {
  console.log('📊 Checking current stats state...');
  
  // Try to find the stats data in React component state
  // This is a bit hacky but can help debug
  const statsCards = document.querySelectorAll('[data-testid="stat-card"], .stat-card, [class*="stat"]');
  console.log(`Found ${statsCards.length} stat card elements`);
  
  statsCards.forEach((card, index) => {
    console.log(`Stat card ${index}:`, {
      innerHTML: card.innerHTML,
      textContent: card.textContent,
      className: card.className
    });
  });
  
  // Check for any error messages
  const errorElements = document.querySelectorAll('[role="alert"], .alert, [class*="error"]');
  console.log(`Found ${errorElements.length} error elements`);
  
  errorElements.forEach((error, index) => {
    console.log(`Error ${index}:`, error.textContent);
  });
  
  // Check network requests
  console.log('📡 Checking network requests...');
  
  // Look for the dashboard stats request in network tab
  if (window.performance && window.performance.getEntriesByType) {
    const networkEntries = window.performance.getEntriesByType('resource');
    const dashboardRequests = networkEntries.filter(entry => 
      entry.name.includes('dashboard-stats')
    );
    
    console.log(`Found ${dashboardRequests.length} dashboard-stats requests:`, dashboardRequests);
  }
};

// Check React component state (if React DevTools is available)
const checkReactState = () => {
  console.log('⚛️ Checking React component state...');
  
  // Try to access React Fiber (this is internal and may not work)
  const rootElement = document.querySelector('#root');
  if (rootElement && rootElement._reactInternalFiber) {
    console.log('React Fiber found, but state inspection requires React DevTools');
  }
  
  // Check for any React error boundaries
  const errorBoundaries = document.querySelectorAll('[data-error-boundary]');
  console.log(`Found ${errorBoundaries.length} error boundaries`);
};

// Check localStorage for token
const checkAuth = () => {
  console.log('🔐 Checking authentication...');
  
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  console.log('Token exists:', !!token);
  console.log('Token preview:', token ? token.substring(0, 20) + '...' : 'None');
  console.log('User data:', user ? JSON.parse(user) : 'None');
  
  // Check token expiry
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiry = new Date(payload.exp * 1000);
      const now = new Date();
      
      console.log('Token expires:', expiry);
      console.log('Token is expired:', expiry < now);
    } catch (e) {
      console.log('Could not decode token:', e);
    }
  }
};

// Manual API test
const testAPICall = async () => {
  console.log('🧪 Testing API call manually...');
  
  const token = localStorage.getItem('token');
  if (!token) {
    console.error('No token found in localStorage');
    return;
  }
  
  try {
    const response = await fetch('http://127.0.0.1:8000/hr/dashboard-stats', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('API Response status:', response.status);
    console.log('API Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('API Response data:', data);
      
      // Extract data like the frontend does
      const statsData = data.data || data;
      console.log('Extracted stats data:', statsData);
      
      // Check if this matches what should be displayed
      console.log('Expected KPI values:');
      console.log('  Properties:', statsData.totalProperties);
      console.log('  Managers:', statsData.totalManagers);
      console.log('  Employees:', statsData.totalEmployees);
      console.log('  Pending Applications:', statsData.pendingApplications);
      
    } else {
      const errorText = await response.text();
      console.error('API Error:', errorText);
    }
    
  } catch (error) {
    console.error('API Call failed:', error);
  }
};

// Check for console errors
const checkConsoleErrors = () => {
  console.log('🚨 Checking for console errors...');
  
  // Override console.error to catch errors
  const originalError = console.error;
  const errors = [];
  
  console.error = (...args) => {
    errors.push(args);
    originalError.apply(console, args);
  };
  
  // Restore after a short delay
  setTimeout(() => {
    console.error = originalError;
    console.log('Captured errors:', errors);
  }, 1000);
};

// Run all checks
const runAllChecks = async () => {
  console.log('🚀 Running all frontend debugging checks...');
  console.log('='.repeat(50));
  
  checkAuth();
  console.log('');
  
  checkStatsData();
  console.log('');
  
  checkReactState();
  console.log('');
  
  checkConsoleErrors();
  console.log('');
  
  await testAPICall();
  console.log('');
  
  console.log('='.repeat(50));
  console.log('✅ Debugging complete. Check the logs above for issues.');
  console.log('💡 If API call returns data but KPIs are empty, the issue is in React state management.');
  console.log('💡 If API call fails, the issue is in authentication or backend.');
};

// Auto-run the checks
runAllChecks();

// Also provide manual functions
window.debugHRDashboard = {
  checkStatsData,
  checkReactState,
  checkAuth,
  testAPICall,
  runAllChecks
};

console.log('🔧 Debug functions available as window.debugHRDashboard');
console.log('   - debugHRDashboard.testAPICall()');
console.log('   - debugHRDashboard.checkStatsData()');
console.log('   - debugHRDashboard.runAllChecks()');