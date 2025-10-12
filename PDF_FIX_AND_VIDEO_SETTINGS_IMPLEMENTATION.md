# PDF Fix and HR Video Settings Implementation

## Overview

This implementation addresses two critical issues:

1. **PDF Layout Fix**: New hire summary PDF had column widths exceeding page margins, causing content to be cut off
2. **Dynamic Training Videos**: HR can now configure YouTube training videos for human trafficking awareness through a settings dashboard

## Changes Summary

### Phase 1: PDF Layout Fix ✅

**File Modified**: `backend/app/generators/new_hire_summary_pdf.py`

**Problem**: 
- Available page width: 540 points (612 - 36 left - 36 right margins)
- Previous 4-column table widths: 633.6 points (exceeded by 93.6 points!)
- Content was being cut off on the right side

**Solution**:
- Recalculated column widths to fit within available 540 points
- 4-column tables: 22%, 28%, 22%, 28% of available width
- 2-column tables: 35% label, 65% value
- All tables now properly constrained within page margins

**Lines Changed**: 136-175, 211-219

### Phase 2: Database Schema ✅

**File Created**: `backend/supabase/migrations/create_hr_settings_table.sql`

**Features**:
- New `hr_settings` table with JSONB values
- Default training video settings (English & Spanish)
- Row Level Security (RLS) policies
- Automatic timestamp updates
- Proper indexing for performance

**Table Structure**:
```sql
hr_settings (
  id UUID PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE,
  setting_value JSONB,
  setting_type VARCHAR(50),
  description TEXT,
  updated_by UUID,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

**To Run Migration**:
```bash
# Check migration status
python backend/run_hr_settings_migration.py

# Then run SQL in Supabase Dashboard SQL Editor
# Copy from: backend/supabase/migrations/create_hr_settings_table.sql
```

### Phase 3: Backend API ✅

**File Created**: `backend/app/routers/hr_settings_router.py`

**Endpoints**:

1. `GET /api/hr/settings/training-videos` (HR auth required)
   - Fetch current training video settings
   - Returns: `{video_id_en, video_id_es}`

2. `PUT /api/hr/settings/training-videos` (HR auth required)
   - Update training video settings
   - Validates YouTube video ID format (11 characters)
   - Body: `{video_id_en: string, video_id_es: string}`

3. `GET /api/hr/settings/training-videos/public` (No auth)
   - Public endpoint for onboarding users
   - Returns default videos on error (graceful degradation)

4. `GET /api/hr/settings/all` (HR auth required)
   - List all settings with optional type filter
   - Future-proof for additional settings

**File Modified**: `backend/app/main_enhanced.py`
- Registered hr_settings_router (lines 937-943)

### Phase 4: Frontend Settings Dashboard ✅

**File Created**: `frontend/hotel-onboarding-frontend/src/pages/HRSettingsTab.tsx`

**Features**:
- Clean, professional UI for HR settings management
- Real-time YouTube video preview
- URL parsing (accepts full YouTube URLs or video IDs)
- Input validation with visual feedback
- Success/error messaging
- Help section with instructions

**File Modified**: `frontend/hotel-onboarding-frontend/src/components/ui/dashboard-navigation.tsx`
- Added Settings icon import (line 19)
- Added Settings to HR navigation items (lines 480-487)

**File Modified**: `frontend/hotel-onboarding-frontend/src/App.tsx`
- Added HRSettingsTab lazy import (line 33)
- Added /hr/settings route (line 93)

### Phase 5: Dynamic Video Integration ✅

**File Modified**: `frontend/hotel-onboarding-frontend/src/components/HumanTraffickingAwareness.tsx`

**Changes**:
- Added state for dynamic video IDs (line 27)
- Added useEffect to fetch video settings from API (lines 29-50)
- Updated English video to use dynamic ID (line 105)
- Updated Spanish video to use dynamic ID (line 169)
- Graceful fallback to default videos on API error

**Flow**:
1. Component mounts
2. Fetches video settings from `/api/hr/settings/training-videos/public`
3. Updates state with new video IDs
4. Re-renders with correct videos
5. 95% watch requirement still enforced
6. Skip button still available for testing

## Testing Checklist

### PDF Testing
- [x] Fixed column width calculations
- [ ] Generate new hire form PDF with long addresses
- [ ] Verify all 4-column tables fit within page width
- [ ] Check 2-column tables are not cut off
- [ ] Test with various data lengths (short/long names, addresses)
- [ ] Verify margins are respected on left and right

### Backend Testing
- [ ] Run database migration
- [ ] Test GET /api/hr/settings/training-videos (HR auth)
- [ ] Test PUT /api/hr/settings/training-videos (HR auth)
- [ ] Test GET /api/hr/settings/training-videos/public (no auth)
- [ ] Verify video ID validation (11 characters)
- [ ] Test RLS policies (non-HR cannot update)

### Frontend Settings Dashboard Testing
- [ ] HR can access Settings tab in navigation
- [ ] Settings page loads current video IDs
- [ ] Can update English video ID
- [ ] Can update Spanish video ID
- [ ] Preview shows correct videos
- [ ] Handles full YouTube URLs and extracts ID
- [ ] Validation shows valid/invalid state
- [ ] Save button disabled until valid IDs entered
- [ ] Settings persist after save
- [ ] Success message displays
- [ ] Non-HR users cannot access settings page

### Video Player Integration Testing
- [ ] English onboarding loads correct video from settings
- [ ] Spanish onboarding loads correct video from settings
- [ ] Video changes reflect immediately for new sessions
- [ ] 95% watch requirement still enforced
- [ ] Skip button still works for testing
- [ ] Progress tracking works with new videos
- [ ] Fallback to default videos if API fails

## File Structure

```
backend/
├── app/
│   ├── generators/
│   │   └── new_hire_summary_pdf.py          # PDF layout fix
│   ├── routers/
│   │   └── hr_settings_router.py            # NEW - Settings API
│   └── main_enhanced.py                     # Router registration
├── supabase/
│   └── migrations/
│       └── create_hr_settings_table.sql     # NEW - Database schema
└── run_hr_settings_migration.py             # NEW - Migration helper

frontend/hotel-onboarding-frontend/src/
├── pages/
│   └── HRSettingsTab.tsx                    # NEW - Settings UI
├── components/
│   ├── ui/
│   │   └── dashboard-navigation.tsx         # Added Settings nav
│   └── HumanTraffickingAwareness.tsx       # Dynamic video integration
└── App.tsx                                  # Added settings route
```

## API Documentation

### GET /api/hr/settings/training-videos
**Authentication**: Required (HR role)

**Response**:
```json
{
  "success": true,
  "data": {
    "video_id_en": "XhbfGo7voB8",
    "video_id_es": "XhbfGo7voB8"
  }
}
```

### PUT /api/hr/settings/training-videos
**Authentication**: Required (HR role)

**Request**:
```json
{
  "video_id_en": "abc123defgh",
  "video_id_es": "xyz789uvwxy"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "video_id_en": "abc123defgh",
    "video_id_es": "xyz789uvwxy"
  },
  "message": "Training videos updated successfully"
}
```

**Validation**:
- Both video IDs must be exactly 11 characters
- Only alphanumeric, hyphens, and underscores allowed
- Returns 400 error if validation fails

### GET /api/hr/settings/training-videos/public
**Authentication**: None (Public endpoint)

**Response**:
```json
{
  "success": true,
  "data": {
    "video_id_en": "XhbfGo7voB8",
    "video_id_es": "XhbfGo7voB8"
  }
}
```

**Note**: Returns default videos on any error (graceful degradation for onboarding)

## Security Considerations

1. **RLS Policies**: Only HR users can update settings
2. **Public Read**: Onboarding endpoint is public (necessary for unauthenticated users)
3. **Input Validation**: Video IDs validated on both frontend and backend
4. **Audit Trail**: `updated_by` tracks who changed settings
5. **Default Fallback**: System works even if API fails

## Future Enhancements

1. **Video History**: Track changes to video IDs over time
2. **Preview Before Save**: Test video in modal before saving
3. **Multi-language Support**: Add more languages
4. **Video Metadata**: Store duration, title, description
5. **Completion Analytics**: Track which videos have best completion rates
6. **Custom Watch Percentage**: Allow HR to set required watch percentage
7. **Additional Settings**: Extend for other HR configurations

## Deployment Steps

### 1. Database Migration
```bash
# Run migration helper to check status
python backend/run_hr_settings_migration.py

# Copy SQL and run in Supabase Dashboard SQL Editor
# File: backend/supabase/migrations/create_hr_settings_table.sql
```

### 2. Backend Deployment
```bash
cd backend
# No additional dependencies needed
# Router is auto-registered in main_enhanced.py
```

### 3. Frontend Deployment
```bash
cd frontend/hotel-onboarding-frontend
npm install  # No new dependencies
npm run build
```

### 4. Verify Installation
1. Login as HR user
2. Navigate to Settings tab
3. Verify current videos load
4. Update videos and save
5. Start new onboarding session
6. Verify new videos are used

## Troubleshooting

### PDF Still Cutting Off
- Check PDF generation logs for errors
- Verify ReportLab version compatibility
- Test with minimal data first

### Settings Not Saving
- Check HR user authentication
- Verify RLS policies are applied
- Check browser console for errors
- Verify SUPABASE_SERVICE_KEY is set

### Videos Not Updating
- Clear browser cache
- Check `/api/hr/settings/training-videos/public` endpoint
- Verify video IDs are 11 characters
- Check YouTube video is not private/deleted

### Migration Fails
- Verify SUPABASE_SERVICE_KEY has admin privileges
- Check for table name conflicts
- Run migration in Supabase Dashboard SQL Editor directly

## Support

For issues or questions:
1. Check logs in browser console (frontend)
2. Check FastAPI logs (backend)
3. Verify database connection and permissions
4. Review this documentation

## Testing Skip Button Removal

The testing skip button is currently kept for development/testing purposes:
```typescript
// In HumanTraffickingAwareness.tsx line 288
{!hasWatchedVideo && (
  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
    {/* Skip button code */}
  </div>
)}
```

**Before Production Deploy**: Remove or add environment check:
```typescript
{!hasWatchedVideo && import.meta.env.DEV && (
  // Skip button only in development
)}
```

## Completion Status

- ✅ Phase 1: PDF Layout Fix
- ✅ Phase 2: Database Schema
- ✅ Phase 3: Backend API
- ✅ Phase 4: Frontend Settings Dashboard
- ✅ Phase 5: Dynamic Video Integration
- ⏳ Phase 6: Testing (Ready for QA)

## Next Steps

1. Run database migration
2. Test all endpoints with Postman/curl
3. Test HR settings UI
4. Test video integration end-to-end
5. Generate test PDFs with various data
6. Deploy to staging
7. Full QA testing
8. Deploy to production

