#!/bin/bash

echo "🔍 Testing System Health..."
echo "=========================="

# Test Frontend
echo "1. Testing Frontend (http://localhost:3000)..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
    echo "   ✅ Frontend is running"
else
    echo "   ❌ Frontend is not responding"
fi

# Test Backend
echo "2. Testing Backend API (http://localhost:8000)..."
BACKEND_RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:8000/api/auth/login -X POST -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"test"}' | tail -1)
if [ "$BACKEND_RESPONSE" = "401" ] || [ "$BACKEND_RESPONSE" = "400" ]; then
    echo "   ✅ Backend is running (auth endpoint responding)"
else
    echo "   ❌ Backend is not responding properly (Status: $BACKEND_RESPONSE)"
fi

# Test Manager Login
echo "3. Testing Manager Login..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "goutamramv@gmail.com", "password": "Gouthi321@"}' 2>/dev/null)

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
    echo "   ✅ Manager login successful"
    TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('token', ''))" 2>/dev/null)
    
    # Test Manager Dashboard Access
    echo "4. Testing Manager Dashboard Access..."
    DASHBOARD_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
      -H "Authorization: Bearer $TOKEN" \
      http://localhost:8000/api/manager/dashboard-stats)
    
    if [ "$DASHBOARD_RESPONSE" = "200" ]; then
        echo "   ✅ Manager dashboard accessible"
    else
        echo "   ❌ Manager dashboard not accessible (Status: $DASHBOARD_RESPONSE)"
    fi
else
    echo "   ❌ Manager login failed"
    echo "   Response: $LOGIN_RESPONSE"
fi

# Test Apply Route
echo "5. Testing Job Application Route..."
APPLY_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/apply/test-property-id)
if [ "$APPLY_RESPONSE" = "200" ]; then
    echo "   ✅ Apply route is accessible"
else
    echo "   ⚠️  Apply route returned status: $APPLY_RESPONSE"
fi

echo ""
echo "=========================="
echo "✨ System Health Check Complete"