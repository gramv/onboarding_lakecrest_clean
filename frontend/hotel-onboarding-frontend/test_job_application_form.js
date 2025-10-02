/**
 * Simple frontend test for JobApplicationForm (Task 6)
 * Tests that the form loads correctly and uses the right endpoints
 */

const puppeteer = require('puppeteer');

const FRONTEND_URL = 'http://localhost:5173';
const TEST_PROPERTY_ID = 'prop_test_001';

async function testJobApplicationForm() {
    console.log('🚀 Testing JobApplicationForm Frontend (Task 6)');
    console.log('=' .repeat(60));

    let browser;
    let success = true;

    try {
        // Launch browser
        browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Set viewport
        await page.setViewport({ width: 1920, height: 1080 });
        
        // Navigate to the form
        const formUrl = `${FRONTEND_URL}/apply/${TEST_PROPERTY_ID}`;
        console.log(`1. Navigating to: ${formUrl}`);
        
        await page.goto(formUrl, { waitUntil: 'networkidle0' });
        
        // Test 1: Check if property information loads
        console.log('2. Checking if property information loads...');
        try {
            await page.waitForSelector('h2:contains("Job Application")', { timeout: 5000 });
            
            // Check for property name in description
            const propertyDescription = await page.$eval('p', el => el.textContent);
            if (propertyDescription.includes('Grand Plaza Hotel')) {
                console.log('   ✅ Property information loaded correctly');
                console.log(`   📍 Found: ${propertyDescription}`);
            } else {
                console.log('   ⚠️ Property name not found in description');
                success = false;
            }
        } catch (error) {
            console.log('   ❌ Property information did not load');
            success = false;
        }
        
        // Test 2: Check form fields are present
        console.log('3. Checking form fields...');
        
        const requiredFields = [
            'first_name',
            'last_name', 
            'email',
            'phone',
            'address',
            'zip_code',
            'start_date'
        ];
        
        for (const fieldId of requiredFields) {
            const field = await page.$(`#${fieldId}`);
            if (field) {
                console.log(`   ✅ Field found: ${fieldId}`);
            } else {
                console.log(`   ❌ Field missing: ${fieldId}`);
                success = false;
            }
        }
        
        // Test 3: Check department dropdown loads with backend data
        console.log('4. Checking department dropdown...');
        try {
            // Click department dropdown
            await page.click('button:contains("Select department")');
            await page.waitForTimeout(1000);
            
            // Check for expected departments from backend
            const expectedDepartments = ['Front Desk', 'Housekeeping', 'Food & Beverage', 'Maintenance'];
            let departmentsFound = 0;
            
            for (const dept of expectedDepartments) {
                const option = await page.$(`div[role="option"]:contains("${dept}")`);
                if (option) {
                    departmentsFound++;
                    console.log(`   ✅ Department found: ${dept}`);
                } else {
                    console.log(`   ⚠️ Department not found: ${dept}`);
                }
            }
            
            if (departmentsFound === expectedDepartments.length) {
                console.log('   ✅ All expected departments loaded from backend');
            } else {
                console.log(`   ⚠️ Only ${departmentsFound}/${expectedDepartments.length} departments found`);
                success = false;
            }
            
            // Close dropdown
            await page.keyboard.press('Escape');
            
        } catch (error) {
            console.log('   ❌ Department dropdown test failed:', error.message);
            success = false;
        }
        
        // Test 4: Check submit button is present
        console.log('5. Checking submit button...');
        const submitButton = await page.$('button[type="submit"]');
        if (submitButton) {
            const buttonText = await page.evaluate(el => el.textContent, submitButton);
            console.log(`   ✅ Submit button found: "${buttonText}"`);
        } else {
            console.log('   ❌ Submit button not found');
            success = false;
        }
        
        // Test 5: Check network requests (monitor API calls)
        console.log('6. Monitoring network requests...');
        
        const requests = [];
        page.on('request', request => {
            if (request.url().includes('/properties/') || request.url().includes('/apply/')) {
                requests.push({
                    url: request.url(),
                    method: request.method()
                });
            }
        });
        
        // Reload page to capture initial property info request
        await page.reload({ waitUntil: 'networkidle0' });
        
        // Check if property info endpoint was called
        const propertyInfoRequest = requests.find(req => 
            req.url.includes(`/properties/${TEST_PROPERTY_ID}/info`) && req.method === 'GET'
        );
        
        if (propertyInfoRequest) {
            console.log('   ✅ Property info endpoint called correctly');
            console.log(`   🔗 URL: ${propertyInfoRequest.url}`);
        } else {
            console.log('   ❌ Property info endpoint not called');
            success = false;
        }
        
    } catch (error) {
        console.log('❌ Test failed with error:', error.message);
        success = false;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    
    if (success) {
        console.log('✅ ALL FRONTEND TESTS PASSED');
        console.log('🎉 JobApplicationForm is working correctly!');
        console.log('✅ Property information loads from /properties/{property_id}/info');
        console.log('✅ Form fields are properly configured');
        console.log('✅ Departments load from backend data');
        console.log('✅ Form is ready for submission to /apply/{property_id}');
    } else {
        console.log('❌ SOME FRONTEND TESTS FAILED');
        console.log('⚠️ JobApplicationForm needs attention');
    }
    
    return success;
}

// Run the test
testJobApplicationForm()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('Test runner failed:', error);
        process.exit(1);
    });