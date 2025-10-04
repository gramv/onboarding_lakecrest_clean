#!/bin/bash

# ============================================
# Create Supabase Preview Branch for Testing
# ============================================
#
# This script creates a preview branch in Supabase for safe testing
# of security improvements without affecting production data.
#
# Usage:
#   ./scripts/create_test_branch.sh
#
# Requirements:
#   - Supabase CLI installed (brew install supabase/tap/supabase)
#   - Project linked (supabase link --project-ref YOUR_PROJECT_REF)
#   - Logged in (supabase login)

set -e  # Exit on error

echo "🌿 Creating Supabase Preview Branch for Security Testing"
echo "========================================================"
echo ""

# Branch name with timestamp
BRANCH_NAME="security-audit-trail-$(date +%Y%m%d-%H%M%S)"

echo "📝 Branch name: $BRANCH_NAME"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found!"
    echo ""
    echo "Install it with:"
    echo "  brew install supabase/tap/supabase"
    echo ""
    echo "Or download from: https://github.com/supabase/cli"
    exit 1
fi

echo "✅ Supabase CLI found: $(supabase --version)"
echo ""

# Check if project is linked
if [ ! -f "supabase/.temp/project-ref" ] && [ ! -f ".git/config" ]; then
    echo "⚠️  Project may not be linked"
    echo ""
    echo "Link your project with:"
    echo "  supabase link --project-ref YOUR_PROJECT_REF"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Create preview branch
echo "🚀 Creating preview branch..."
echo ""

supabase branches create "$BRANCH_NAME"

echo ""
echo "✅ Preview branch created successfully!"
echo ""

# Get branch details
echo "📊 Getting branch details..."
echo ""

supabase branches get "$BRANCH_NAME"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ BRANCH CREATED: $BRANCH_NAME"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "  1. Run migrations on the branch:"
echo "     supabase db push --linked"
echo ""
echo "  2. Test the security features"
echo ""
echo "  3. If successful, merge to production:"
echo "     (Merge via Supabase Dashboard)"
echo ""
echo "  4. If issues found, delete the branch:"
echo "     supabase branches delete $BRANCH_NAME"
echo ""

