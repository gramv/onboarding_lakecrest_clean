// IMMEDIATE FIX FOR "No Property Assigned" ISSUE
// Run this in your browser console while on the login/dashboard page

console.log('🔧 FIXING "No Property Assigned" ISSUE...');

// Step 1: Show current cached data
console.log('\n1. CURRENT CACHED DATA:');
const currentUser = localStorage.getItem('user');
if (currentUser) {
    try {
        const userData = JSON.parse(currentUser);
        console.log('   Cached user data:', userData);
        console.log('   Property ID:', userData.property_id || 'NULL');
        console.log('   ❌ This is the OLD cached data causing the issue!');
    } catch (e) {
        console.log('   Invalid user data in cache');
    }
} else {
    console.log('   No user data in cache');
}

// Step 2: Get fresh data from server
console.log('\n2. FETCHING FRESH DATA FROM SERVER...');

async function fixUserData() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('❌ No token found. Please log in first.');
            return false;
        }

        // Call the /auth/me endpoint to get fresh user data
        const response = await fetch('https://clickwise.in/api/auth/me', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const result = await response.json();
            const freshUserData = result.data;
            
            console.log('✅ Fresh user data from server:', freshUserData);
            console.log('   Property ID:', freshUserData.property_id || 'NULL');
            
            // Update localStorage with fresh data
            localStorage.setItem('user', JSON.stringify(freshUserData));
            
            console.log('✅ Updated localStorage with fresh data');
            console.log('\n3. VERIFICATION:');
            const updatedUser = JSON.parse(localStorage.getItem('user'));
            console.log('   Updated cached data:', updatedUser);
            
            if (freshUserData.property_id) {
                console.log('🎉 SUCCESS! Property ID is now set:', freshUserData.property_id);
                console.log('📍 Property:', freshUserData.property_name || 'Property name not available');
                console.log('\n✅ NOW REFRESH THE PAGE OR GO TO DASHBOARD!');
                
                // Offer to redirect
                if (confirm('Fix applied! Would you like to go to the dashboard now?')) {
                    window.location.href = 'https://clickwise.in/dashboard';
                }
                return true;
            } else {
                console.log('⚠️ Property ID is still null. There might be a server-side issue.');
                return false;
            }
        } else {
            const errorData = await response.json();
            console.log('❌ Server error:', errorData.message || 'Unknown error');
            console.log('   Try logging out and logging in again.');
            return false;
        }
    } catch (error) {
        console.log('❌ Network error:', error.message);
        console.log('   Check your internet connection and try again.');
        return false;
    }
}

// Step 3: Execute the fix
fixUserData().then(success => {
    if (!success) {
        console.log('\n🔄 ALTERNATIVE: CLEAR CACHE AND LOGIN AGAIN');
        console.log('Run this if the above didn\'t work:');
        console.log('');
        console.log('localStorage.removeItem("token");');
        console.log('localStorage.removeItem("user");');
        console.log('localStorage.removeItem("token_expires_at");');
        console.log('localStorage.removeItem("returnUrl");');
        console.log('sessionStorage.clear();');
        console.log('window.location.href = "https://clickwise.in/login";');
    }
});

// Alternative function to clear everything
window.clearAuthAndRelogin = function() {
    console.log('🧹 Clearing all auth data...');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('token_expires_at');
    localStorage.removeItem('returnUrl');
    sessionStorage.clear();
    console.log('✅ Auth data cleared. Redirecting to login...');
    setTimeout(() => {
        window.location.href = 'https://clickwise.in/login';
    }, 1000);
};

console.log('\n📋 MANUAL COMMANDS AVAILABLE:');
console.log('- clearAuthAndRelogin() - Clear cache and redirect to login');
console.log('- fixUserData() - Try to refresh user data again');
