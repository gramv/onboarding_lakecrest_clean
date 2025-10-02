#!/bin/bash

echo "🛑 STOPPING HOTEL ONBOARDING SERVERS"
echo "===================================="

# Kill all processes on the ports we use
echo "🔍 Finding and killing server processes..."

# Kill processes on port 3000 (React dev server)
if lsof -ti:3000 >/dev/null 2>&1; then
    echo "   Killing process on port 3000..."
    lsof -ti:3000 | xargs kill -9
    echo "   ✅ Port 3000 freed"
else
    echo "   ℹ️  No process on port 3000"
fi

# Kill processes on port 8000 (FastAPI backend)
if lsof -ti:8000 >/dev/null 2>&1; then
    echo "   Killing process on port 8000..."
    lsof -ti:8000 | xargs kill -9
    echo "   ✅ Port 8000 freed"
else
    echo "   ℹ️  No process on port 8000"
fi

# Kill any remaining Python/Node processes
echo "🧹 Cleaning up remaining processes..."
pkill -f "main_enhanced" 2>/dev/null && echo "   ✅ Killed main_enhanced processes"
pkill -f "uvicorn" 2>/dev/null && echo "   ✅ Killed uvicorn processes"
pkill -f "vite" 2>/dev/null && echo "   ✅ Killed vite processes"
pkill -f "react-scripts" 2>/dev/null && echo "   ✅ Killed react-scripts processes"

# Wait for cleanup
sleep 2

echo ""
echo "✅ All servers stopped!"
echo "======================"
echo "Ports 3000 and 8000 are now free."
echo ""
echo "To restart servers, run:"
echo "  ./restart_servers.sh"