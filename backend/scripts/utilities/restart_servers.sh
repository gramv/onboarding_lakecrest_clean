#!/bin/bash

echo "🔄 RESTARTING HOTEL ONBOARDING SERVERS"
echo "======================================"

# Kill all processes on common ports
echo "🛑 Killing processes on ports 3000, 5173, 8000, 8080..."

# Kill processes on port 3000 (React dev server)
lsof -ti:3000 | xargs kill -9 2>/dev/null || echo "   No process on port 3000"

# Kill processes on port 5173 (Vite dev server)
lsof -ti:5173 | xargs kill -9 2>/dev/null || echo "   No process on port 5173"

# Kill processes on port 8000 (FastAPI backend)
lsof -ti:8000 | xargs kill -9 2>/dev/null || echo "   No process on port 8000"

# Kill processes on port 8080 (Alternative backend)
lsof -ti:8080 | xargs kill -9 2>/dev/null || echo "   No process on port 8080"

# Kill any Python processes that might be running the backend
echo "🛑 Killing Python backend processes..."
pkill -f "main_enhanced" 2>/dev/null || echo "   No main_enhanced processes found"
pkill -f "uvicorn" 2>/dev/null || echo "   No uvicorn processes found"

# Kill any Node.js processes that might be running the frontend
echo "🛑 Killing Node.js frontend processes..."
pkill -f "vite" 2>/dev/null || echo "   No vite processes found"
pkill -f "react-scripts" 2>/dev/null || echo "   No react-scripts processes found"

# Wait a moment for processes to fully terminate
echo "⏳ Waiting for processes to terminate..."
sleep 3

# Check if ports are now free
echo "🔍 Checking port availability..."
if lsof -i:3000 >/dev/null 2>&1; then
    echo "   ⚠️  Port 3000 still in use"
else
    echo "   ✅ Port 3000 is free"
fi

if lsof -i:8000 >/dev/null 2>&1; then
    echo "   ⚠️  Port 8000 still in use"
else
    echo "   ✅ Port 8000 is free"
fi

echo ""
echo "🚀 Starting Backend Server (Port 8000)..."
echo "======================================"

# Start backend server
cd hotel-onboarding-backend

# Check if we have the right Python environment
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    echo "❌ Python not found!"
    exit 1
fi

echo "   Using Python: $PYTHON_CMD"
echo "   Starting FastAPI server..."

# Start backend in background
$PYTHON_CMD -m uvicorn app.main_enhanced:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

echo "   Backend PID: $BACKEND_PID"
echo "   Backend URL: http://localhost:8000"

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 5

# Check if backend is running
if curl -s http://localhost:8000/healthz >/dev/null 2>&1; then
    echo "   ✅ Backend is running and healthy"
else
    echo "   ⚠️  Backend may still be starting..."
fi

echo ""
echo "🚀 Starting Frontend Server (Port 3000)..."
echo "======================================"

# Start frontend server
cd ../hotel-onboarding-frontend

# Check if we have npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found!"
    exit 1
fi

echo "   Using npm: $(npm --version)"
echo "   Starting React development server..."

# Start frontend in background
npm run dev -- --port 3000 --host 0.0.0.0 &
FRONTEND_PID=$!

echo "   Frontend PID: $FRONTEND_PID"
echo "   Frontend URL: http://localhost:3000"

# Wait for frontend to start
echo "⏳ Waiting for frontend to start..."
sleep 10

# Check if frontend is running
if curl -s http://localhost:3000 >/dev/null 2>&1; then
    echo "   ✅ Frontend is running"
else
    echo "   ⚠️  Frontend may still be starting..."
fi

echo ""
echo "🎉 SERVERS STARTED SUCCESSFULLY!"
echo "================================"
echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo "Health:   http://localhost:8000/healthz"
echo ""
echo "Backend PID:  $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "To stop servers:"
echo "  kill $BACKEND_PID $FRONTEND_PID"
echo "  or run: ./stop_servers.sh"
echo ""
echo "📋 Testing endpoints..."
echo "======================"

# Test key endpoints
sleep 5

echo "🧪 Testing backend health..."
if curl -s http://localhost:8000/healthz | grep -q "ok"; then
    echo "   ✅ Backend health check passed"
else
    echo "   ❌ Backend health check failed"
fi

echo "🧪 Testing frontend..."
if curl -s http://localhost:3000 >/dev/null 2>&1; then
    echo "   ✅ Frontend is accessible"
else
    echo "   ❌ Frontend is not accessible"
fi

echo ""
echo "🔗 Quick Links:"
echo "==============="
echo "HR Login:      http://localhost:3000/login"
echo "Manager Login: http://localhost:3000/login"
echo "API Docs:      http://localhost:8000/docs"
echo "Health Check:  http://localhost:8000/healthz"
echo ""
echo "📝 Test Credentials:"
echo "==================="
echo "HR:      hr@hoteltest.com / admin123"
echo "Manager: manager@hoteltest.com / manager123"
echo ""
echo "✨ Ready for testing!"