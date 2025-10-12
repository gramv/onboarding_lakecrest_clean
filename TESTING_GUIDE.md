# Testing Guide: PDF Fix & HR Video Settings

## 📋 Overview

This guide covers testing for two major implementations:
1. **PDF Layout Fix** - New hire form no longer cuts off on the right side
2. **HR Video Settings** - HR can configure training videos through dashboard

---

## 🗄️ Step 1: Run Database Migration

### Instructions:

1. **Open Supabase Dashboard**
   - Go to https://app.supabase.com
   - Select your project
   - Navigate to **SQL Editor** (left sidebar)

2. **Run Migration SQL**
   - Click **"New Query"**
   - Open file: `RUN_THIS_MIGRATION_HR_SETTINGS.sql` (in project root)
   - Copy ALL contents and paste into SQL Editor
   - Click **"Run"** button

3. **Verify Migration Success**
   - You should see: "Success. No rows returned"
   - Go to **Table Editor** → Check for `hr_settings` table
   - Should have 1 row with default video settings

---

## 📄 Step 2: Test PDF Layout Fix

### Test Scenario 1: Generate New Hire PDF

1. **Login as Manager**
   - Go to manager dashboard
   - Navigate to employee review

2. **Generate New Hire Summary**
   - Select an employee with completed onboarding
   - Click "Generate New Hire Summary" or similar button
   - Download the PDF

3. **Verify PDF Layout**
   - ✅ All text should be within page margins
   - ✅ No content cut off on right side
   - ✅ 4-column tables (Employment & Employee Info) fit properly
   - ✅ 2-column tables (Role & Benefits) display correctly
   - ✅ Long addresses don't overflow

### Test Scenario 2: Test with Long Data

Create/use employee with:
- Long hotel name (50+ characters)
- Long address (multi-line)
- Long position title
- Multiple health insurance selections

Generate PDF and verify no content is cut off.

### Expected Results:
- ✅ PDF width: 612 points (8.5 inches)
- ✅ Content width: 540 points (0.5" margins on each side)
- ✅ All tables fit within 540 points
- ✅ Text wraps properly within cells

---

## ⚙️ Step 3: Test HR Settings Dashboard

### Prerequisites:
- Migration completed successfully
- Backend server running
- Frontend running
- Logged in as HR user

### Test Scenario 1: Access Settings

1. **Navigate to Settings**
   - Login as HR user
   - Look for **"Settings"** tab in HR navigation
   - Click Settings tab

2. **Verify Settings Load**
   - ✅ Page loads without errors
   - ✅ Current video IDs displayed
   - ✅ Default videos: `XhbfGo7voB8` (both English and Spanish)
   - ✅ Preview iframes show videos

### Test Scenario 2: Update Video IDs

#### Test with Video ID Format:

1. **Update English Video**
   - Enter: `dQw4w9WgXcQ` (Rick Astley - Never Gonna Give You Up)
   - ✅ Preview updates automatically
   - ✅ Green "Valid" indicator shows

2. **Update Spanish Video**
   - Enter: `ZZ5LpwO-An4` (Different video)
   - ✅ Preview updates automatically
   - ✅ Green "Valid" indicator shows

3. **Save Changes**
   - Click "Save Settings" button
   - ✅ Success message appears
   - ✅ Settings persist after page refresh

#### Test with Full URL Format:

1. **Update English Video**
   - Enter: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
   - ✅ System extracts ID: `dQw4w9WgXcQ`
   - ✅ Preview shows correct video

2. **Update Spanish Video**
   - Enter: `https://youtu.be/ZZ5LpwO-An4`
   - ✅ System extracts ID: `ZZ5LpwO-An4`
   - ✅ Preview shows correct video

3. **Save and Verify**
   - Click "Save Settings"
   - ✅ Success message
   - Refresh page
   - ✅ IDs still correct (not full URLs)

#### Test Validation:

1. **Invalid Video ID (too short)**
   - Enter: `abc123` (only 6 characters)
   - ✅ Red "Invalid" indicator
   - ✅ Save button disabled

2. **Invalid Video ID (too long)**
   - Enter: `abc123defgh12` (13 characters)
   - ✅ Red "Invalid" indicator
   - ✅ Save button disabled

3. **Empty Fields**
   - Clear English video ID
   - ✅ Save button disabled
   - ✅ Appropriate validation message

### Test Scenario 3: Security & Permissions

1. **Test as Manager User**
   - Logout from HR account
   - Login as Manager
   - ✅ Settings tab should NOT appear in navigation
   - Try accessing: `/hr/settings` directly
   - ✅ Should be redirected or show access denied

2. **Test API Endpoints**
   - Open browser DevTools → Network tab
   - Try updating settings as manager
   - ✅ Should receive 403 Forbidden or similar

---

## 🎥 Step 4: Test Video Integration

### Prerequisites:
- Settings saved with new video IDs
- Backend running
- Frontend running

### Test Scenario 1: English Onboarding

1. **Start New Onboarding Session**
   - Use onboarding link (as employee)
   - Select **English** language
   - Progress to Human Trafficking Training step

2. **Verify Correct Video Loads**
   - ✅ Video matches English ID from settings
   - ✅ Video player loads correctly
   - ✅ Progress bar shows 0%

3. **Test Video Requirements**
   - Play video
   - ✅ Progress increases as video plays
   - ✅ Cannot skip forward
   - ✅ Warning message if trying to skip
   - ✅ Must reach 95% to enable "Continue" button

4. **Test Skip Button (Testing Mode)**
   - ✅ Yellow "Skip Video (Test)" button visible
   - Click skip button
   - ✅ Video marks as complete
   - ✅ Continue button enables

### Test Scenario 2: Spanish Onboarding

1. **Start New Onboarding Session**
   - Use onboarding link
   - Select **Spanish** (Español) language
   - Progress to "Capacitación sobre Tráfico Humano"

2. **Verify Correct Video Loads**
   - ✅ Video matches Spanish ID from settings
   - ✅ Different from English video
   - ✅ Spanish UI text displays

3. **Test Video Requirements**
   - Same as English test
   - ✅ 95% requirement enforced
   - ✅ Skip prevention works
   - ✅ Progress tracking works

### Test Scenario 3: Video Change Propagation

1. **Change Videos in HR Settings**
   - Login as HR
   - Update both video IDs to new values
   - Save settings

2. **Test New Onboarding Session**
   - Start fresh onboarding session
   - Navigate to training step
   - ✅ New videos load (not old ones)
   - ✅ No caching issues

3. **Test In-Progress Session**
   - Session that was already on training step
   - Refresh page
   - ✅ Should load new video ID
   - ⚠️ Progress may reset (expected behavior)

---

## 🔍 Step 5: API Testing (Optional)

### Test Public Endpoint (No Auth Required):

```bash
curl http://localhost:8000/api/hr/settings/training-videos/public
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "video_id_en": "dQw4w9WgXcQ",
    "video_id_es": "ZZ5LpwO-An4"
  }
}
```

### Test HR Endpoint (Auth Required):

```bash
# Get JWT token from browser localStorage or login response
TOKEN="your_jwt_token_here"

# GET settings
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/hr/settings/training-videos

# PUT settings
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"video_id_en":"abc123defgh","video_id_es":"xyz789uvwxy"}' \
  http://localhost:8000/api/hr/settings/training-videos
```

---

## ✅ Acceptance Criteria Checklist

### PDF Layout Fix:
- [ ] Generated PDFs fit within page margins (no right-side cutoff)
- [ ] 4-column tables display correctly
- [ ] 2-column tables display correctly
- [ ] Long addresses wrap properly
- [ ] All content readable and professional

### HR Settings Dashboard:
- [ ] HR users can access Settings tab
- [ ] Non-HR users cannot access Settings
- [ ] Current videos load on page open
- [ ] Can update English video ID
- [ ] Can update Spanish video ID
- [ ] Video previews work
- [ ] URL parsing extracts correct IDs
- [ ] Validation prevents invalid IDs
- [ ] Save button works
- [ ] Success/error messages display
- [ ] Settings persist after save

### Video Integration:
- [ ] English onboarding loads correct video
- [ ] Spanish onboarding loads correct video
- [ ] 95% watch requirement enforced
- [ ] Skip prevention works
- [ ] Testing skip button works
- [ ] Progress tracking accurate
- [ ] Video changes reflect in new sessions
- [ ] API returns correct videos
- [ ] Graceful fallback on API error

---

## 🐛 Known Issues / Expected Behavior

1. **Skip Button Visibility**
   - Currently visible for ALL users (for testing)
   - Before production: Should be removed or env-gated

2. **In-Progress Sessions**
   - Video changes may not affect already-loaded sessions
   - User must refresh page to see new video
   - Progress may reset (expected)

3. **Video Preview in Settings**
   - iframes load immediately
   - May be blocked by ad blockers
   - Not critical for functionality

---

## 🔧 Troubleshooting

### PDF Still Cutting Off:
1. Clear browser cache
2. Regenerate PDF (don't use cached version)
3. Check backend logs for PDF generation errors
4. Verify ReportLab library installed correctly

### Settings Not Saving:
1. Check browser console for errors
2. Verify JWT token is valid (not expired)
3. Check backend logs
4. Verify migration ran successfully
5. Check RLS policies in Supabase

### Videos Not Updating:
1. Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+R)
2. Check `/api/hr/settings/training-videos/public` endpoint
3. Verify video IDs are valid (11 characters)
4. Check YouTube video is public (not private/deleted)
5. Clear sessionStorage: `sessionStorage.clear()`

### Migration Fails:
1. Check SUPABASE_SERVICE_KEY is set correctly
2. Verify database connection
3. Run SQL directly in Supabase Dashboard
4. Check for existing table conflicts

---

## 📸 Screenshots to Capture

For QA documentation, capture:

1. **PDF Comparison**
   - Before: Content cut off
   - After: All content visible

2. **HR Settings Page**
   - Settings tab in navigation
   - Settings page with videos loaded
   - Video preview working

3. **Video Player**
   - English onboarding with new video
   - Spanish onboarding with new video
   - Progress tracking at various percentages

4. **Validation**
   - Valid video ID (green indicator)
   - Invalid video ID (red indicator)

---

## 🎯 Success Metrics

### PDF Quality:
- ✅ 100% of content visible within margins
- ✅ Professional appearance maintained
- ✅ No user complaints about readability

### Settings Functionality:
- ✅ HR can update videos in < 2 minutes
- ✅ Changes reflect immediately in new sessions
- ✅ Zero downtime during video changes
- ✅ No manual code deployments needed

### Security:
- ✅ Only HR users can modify settings
- ✅ Public endpoint doesn't expose sensitive data
- ✅ Video validation prevents malicious inputs

---

## 📝 Testing Notes

Use this section to record your findings:

**Date:** _____________
**Tester:** _____________
**Environment:** _____________

**PDF Tests:**
- [ ] Test 1: _______________
- [ ] Test 2: _______________

**Settings Tests:**
- [ ] Test 1: _______________
- [ ] Test 2: _______________

**Integration Tests:**
- [ ] Test 1: _______________
- [ ] Test 2: _______________

**Issues Found:**
1. _____________________
2. _____________________

---

## ✨ Next Steps After Testing

Once all tests pass:

1. ✅ Mark todos as complete
2. 📸 Archive screenshots
3. 📋 Document any issues found
4. 🚀 Prepare for staging deployment
5. 👥 Train HR users on new Settings feature
6. 📧 Send update notification to stakeholders

---

## 📞 Support

If you encounter issues during testing:
1. Check browser console (F12)
2. Check backend logs
3. Review troubleshooting section above
4. Document the issue with screenshots
5. Check implementation documentation

**Files to Reference:**
- `PDF_FIX_AND_VIDEO_SETTINGS_IMPLEMENTATION.md` - Complete implementation details
- `RUN_THIS_MIGRATION_HR_SETTINGS.sql` - Migration SQL
- `backend/run_hr_settings_migration.py` - Migration helper script
